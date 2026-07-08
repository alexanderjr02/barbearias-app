import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// PATCH /api/clients/{id} — sets a client's profile photo. Only works for
// clients with a linked User account (id is a userId, not a guest phone
// number) who have at least one appointment at this barbershop.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !("avatar" in body)) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }
  if (typeof body.avatar !== "string" && body.avatar !== null) {
    return NextResponse.json({ error: "avatar inválido" }, { status: 400 });
  }

  const hasAppointment = await prisma.appointment.findFirst({
    where: { clientId: id, barbershopId: session.barbershopId },
  });
  if (!hasAppointment) {
    return NextResponse.json({ error: "Cliente não encontrado nesta barbearia" }, { status: 404 });
  }

  const user = await prisma.user.update({ where: { id }, data: { avatar: body.avatar } });
  return NextResponse.json({ id: user.id, avatar: user.avatar });
}
