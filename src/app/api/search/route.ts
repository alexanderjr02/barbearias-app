import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { phoneKey } from "@/lib/phone";

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

// GET /api/search?q= — feeds the web command palette (Cmd/Ctrl+K). Busca
// clientes com conta E clientes que só existem como agendamento (walk-in /
// convidado) — os dois aparecem na tela de Clientes, então a busca precisa
// achar os dois. Também busca serviços e equipe. Tudo escopado à barbearia.
export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ clients: [], services: [], staff: [] });
  }

  const digits = q.replace(/\D/g, "");
  const [clientLinks, apptClients, services, staff] = await Promise.all([
    prisma.barbershopClient.findMany({
      where: {
        barbershopId: session.barbershopId,
        user: { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] },
      },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      take: 6,
    }),
    // Clientes que existem SÓ como agendamento (walk-in / convidado, sem conta).
    // A tela de Clientes já mostra estes; a busca global precisava mostrar também
    // — senão um cliente visível na lista "não é encontrado" pela busca (o bug
    // confirmado na auditoria).
    prisma.appointment.findMany({
      where: {
        barbershopId: session.barbershopId,
        OR: [
          { clientName: { contains: q } },
          ...(digits.length >= 3 ? [{ clientPhone: { contains: digits } }] : []),
        ],
      },
      select: { clientName: true, clientPhone: true, clientId: true },
      orderBy: { date: "desc" },
      take: 40,
    }),
    prisma.service.findMany({
      where: { barbershopId: session.barbershopId, name: { contains: q } },
      take: 5,
    }),
    prisma.staff.findMany({
      where: { barbershopId: session.barbershopId, name: { contains: q } },
      take: 5,
    }),
  ]);

  // Mescla contas + walk-ins, deduplicando pela mesma chave de telefone
  // (últimos 8 dígitos) que o resto do app usa. Conta registrada tem prioridade.
  const clientMap = new Map<string, SearchResult>();
  for (const c of clientLinks) {
    const key = phoneKey(c.user.phone) || `user:${c.user.id}`;
    clientMap.set(key, {
      id: c.user.id,
      label: c.user.name,
      sublabel: c.user.phone || c.user.email || "Cliente",
      href: "/dashboard/clients",
    });
  }
  for (const a of apptClients) {
    const key = phoneKey(a.clientPhone);
    if (!key || clientMap.has(key)) continue;
    clientMap.set(key, {
      id: a.clientId ?? `appt:${key}`,
      label: a.clientName,
      sublabel: a.clientPhone || "Cliente sem conta",
      href: "/dashboard/clients",
    });
  }
  const clients: SearchResult[] = Array.from(clientMap.values()).slice(0, 6);
  const serviceResults: SearchResult[] = services.map((s: (typeof services)[number]) => ({
    id: s.id,
    label: s.name,
    sublabel: `R$ ${s.price.toFixed(2)}`,
    href: "/dashboard/services",
  }));
  const staffResults: SearchResult[] = staff.map((s: (typeof staff)[number]) => ({
    id: s.id,
    label: s.name,
    sublabel: s.role === "BARBER" ? "Barbeiro" : s.role,
    href: "/dashboard/staff",
  }));

  return NextResponse.json({ clients, services: serviceResults, staff: staffResults });
}
