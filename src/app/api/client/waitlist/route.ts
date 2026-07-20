import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/client/waitlist — the client's active "avise-me" entries.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const entries = await prisma.waitlistEntry.findMany({
    where: { clientId: session.sub, status: "WAITING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, barbershopId: true, createdAt: true },
  });
  return NextResponse.json(entries);
}

// POST /api/client/waitlist { barbershopId } — "avise-me se abrir um horário".
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const barbershopId = typeof body?.barbershopId === "string" ? body.barbershopId : "";
  if (!barbershopId) return NextResponse.json({ error: "Barbearia obrigatória" }, { status: 400 });

  const existing = await prisma.waitlistEntry.findFirst({ where: { clientId: session.sub, barbershopId, status: "WAITING" } });
  if (existing) return NextResponse.json(existing);

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { name: true, phone: true } });
  const entry = await prisma.waitlistEntry.create({
    data: {
      barbershopId,
      clientId: session.sub,
      clientName: user?.name ?? "Cliente",
      clientPhone: user?.phone ?? "",
      note: "Avise-me se abrir horário",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
