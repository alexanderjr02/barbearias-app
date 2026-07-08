import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/client/barbershops — barbershops the logged-in client can book
// at: ones they were pre-registered at (BarbershopClient) plus ones from
// their appointment history (in case they booked as a guest before linking).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [links, appointments] = await Promise.all([
    prisma.barbershopClient.findMany({
      where: { userId: session.sub },
      include: { barbershop: { select: { id: true, name: true, slug: true, primaryColor: true, logo: true } } },
    }),
    prisma.appointment.findMany({
      where: { clientId: session.sub },
      select: { barbershop: { select: { id: true, name: true, slug: true, primaryColor: true, logo: true } } },
      distinct: ["barbershopId"],
    }),
  ]);

  const byId = new Map<string, { id: string; name: string; slug: string; primaryColor: string; logo: string | null }>();
  for (const l of links) byId.set(l.barbershop.id, l.barbershop);
  for (const a of appointments) byId.set(a.barbershop.id, a.barbershop);

  return NextResponse.json(Array.from(byId.values()));
}
