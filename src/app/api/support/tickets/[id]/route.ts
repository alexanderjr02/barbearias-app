import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

async function loadOwnTicket(id: string, barbershopId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } },
  });
  if (!ticket || ticket.barbershopId !== barbershopId) return null;
  return ticket;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  const ticket = await loadOwnTicket(id, session.barbershopId);
  if (!ticket) {
    return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    messages: ticket.messages.map((m: (typeof ticket.messages)[number]) => ({
      id: m.id,
      body: m.body,
      authorName: m.author.name,
      isAdmin: ["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(m.author.role),
      createdAt: m.createdAt,
    })),
  });
}

// POST — reply to your own ticket. Replying to a RESOLVED ticket reopens it.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body?.body) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  const ticket = await loadOwnTicket(id, session.barbershopId);
  if (!ticket) {
    return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
  }
  if (ticket.status === "CLOSED") {
    return NextResponse.json({ error: "Este chamado está fechado" }, { status: 400 });
  }

  const message = await prisma.ticketMessage.create({ data: { ticketId: id, authorId: session.sub, body: body.body } });
  await prisma.supportTicket.update({
    where: { id },
    data: { status: ticket.status === "RESOLVED" ? "IN_PROGRESS" : ticket.status },
  });

  return NextResponse.json(message, { status: 201 });
}

// PATCH — the gestor can only self-close their own ticket; every other
// status transition is admin-only (see /api/admin/support/tickets/[id]).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (body?.status !== "CLOSED") {
    return NextResponse.json({ error: "Ação não permitida" }, { status: 400 });
  }

  const ticket = await loadOwnTicket(id, session.barbershopId);
  if (!ticket) {
    return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
  }

  const updated = await prisma.supportTicket.update({ where: { id }, data: { status: "CLOSED" } });
  return NextResponse.json(updated);
}
