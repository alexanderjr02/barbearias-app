import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/client/reviews — the logged-in client rates a COMPLETED
// appointment of theirs. One review per appointment, ever.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  if (!body?.appointmentId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Avaliação inválida" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: body.appointmentId } });
  if (!appointment || appointment.clientId !== session.sub) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }
  if (appointment.status !== "COMPLETED") {
    return NextResponse.json({ error: "Só é possível avaliar um atendimento concluído" }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({ where: { appointmentId: appointment.id } });
  if (existing) {
    return NextResponse.json({ error: "Este atendimento já foi avaliado" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      appointmentId: appointment.id,
      staffId: appointment.staffId,
      clientId: session.sub,
      rating,
      comment: typeof body.comment === "string" ? body.comment.slice(0, 500) : undefined,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
