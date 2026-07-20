import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// GET /api/tips/payouts — quanto a barbearia deve de gorjeta a cada barbeiro.
//
// Gorjeta NÃO é receita da barbearia: é dinheiro do barbeiro que passou pela
// conta dela. Por isso não entra no faturamento (inflaria lucro e margem com
// dinheiro alheio) e vive aqui, como dívida a quitar.
//
// Só entram as que caíram na chave da loja. Quando o barbeiro tem PIX próprio,
// o cliente pagou direto e não há repasse nenhum a fazer.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tips = await prisma.tip.findMany({
    where: { barbershopId: session.barbershopId },
    include: {
      staff: { select: { id: true, name: true, avatar: true, pixKey: true } },
      appointment: { select: { clientName: true, date: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  type Row = (typeof tips)[number];

  const byStaff = new Map<
    string,
    {
      staffId: string;
      staffName: string;
      avatar: string | null;
      pixKey: string | null;
      pending: number;
      pendingCount: number;
      settled: number;
      directToBarber: number;
      tips: { id: string; amount: number; clientName: string; date: string; settledAt: string | null }[];
    }
  >();

  for (const t of tips as Row[]) {
    const key = t.staffId;
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        staffId: t.staffId,
        staffName: t.staff.name,
        avatar: t.staff.avatar,
        pixKey: t.staff.pixKey,
        pending: 0,
        pendingCount: 0,
        settled: 0,
        directToBarber: 0,
        tips: [],
      });
    }
    const entry = byStaff.get(key)!;

    if (t.paidToBarber) {
      // Nunca passou pela loja — aparece só como informação de quanto o
      // barbeiro já ganhou, nunca como dívida.
      entry.directToBarber += t.amount;
      continue;
    }

    if (t.settledAt) {
      entry.settled += t.amount;
    } else {
      entry.pending += t.amount;
      entry.pendingCount++;
    }

    entry.tips.push({
      id: t.id,
      amount: t.amount,
      clientName: t.appointment.clientName,
      date: t.appointment.date.toISOString(),
      settledAt: t.settledAt ? t.settledAt.toISOString() : null,
    });
  }

  const staff = Array.from(byStaff.values()).sort((a, b) => b.pending - a.pending);
  const totalPending = staff.reduce((acc, s) => acc + s.pending, 0);

  return NextResponse.json({ staff, totalPending });
}

// POST /api/tips/payouts { staffId } — marca como repassadas todas as gorjetas
// pendentes daquele barbeiro.
//
// Quita por barbeiro e não por gorjeta porque é assim que o repasse acontece
// na vida real: o dono manda um PIX com o acumulado, não um por corte.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const staffId = typeof body?.staffId === "string" ? body.staffId : "";
  if (!staffId) return NextResponse.json({ error: "Barbeiro não informado" }, { status: 400 });

  const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { barbershopId: true, name: true } });
  if (!staff || staff.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  }

  const result = await prisma.tip.updateMany({
    where: { barbershopId: session.barbershopId, staffId, paidToBarber: false, settledAt: null },
    data: { settledAt: new Date(), status: "CONFIRMED" },
  });

  return NextResponse.json({ ok: true, settled: result.count, staffName: staff.name });
}
