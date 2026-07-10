import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/client/appointments — the logged-in client's own booking history,
// used by the cliente app. There is no dedicated Client entity yet (see
// docs/api-v1.md), so appointments are matched by clientId (if linked) or
// by the account's email as a fallback for guest bookings made pre-signup.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [{ clientId: session.sub }, { clientEmail: session.email }],
    },
    include: {
      service: true,
      staff: true,
      barbershop: { select: { name: true, slug: true } },
      review: { select: { id: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  type AppointmentRow = (typeof appointments)[number];
  return NextResponse.json(
    appointments.map((a: AppointmentRow) => ({ ...a, hasReview: !!a.review, review: undefined }))
  );
}
