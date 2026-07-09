import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

// GET /api/search?q= — feeds the web command palette (Cmd/Ctrl+K). Scoped to
// registered clients (guest-only bookings aren't indexed — they have no
// stable identity to link a result to), active services, and team members.
export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ clients: [], services: [], staff: [] });
  }

  const [clientLinks, services, staff] = await Promise.all([
    prisma.barbershopClient.findMany({
      where: {
        barbershopId: session.barbershopId,
        user: { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] },
      },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      take: 5,
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

  const clients: SearchResult[] = clientLinks.map((c: (typeof clientLinks)[number]) => ({
    id: c.user.id,
    label: c.user.name,
    sublabel: c.user.phone || c.user.email || "Cliente",
    href: "/dashboard/clients",
  }));
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
