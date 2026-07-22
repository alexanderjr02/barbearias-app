import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { notifyBarbershop } from "@/lib/gestorNotifications";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAnyAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      barbershop: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } },
    },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    barbershopName: ticket.barbershop.name,
    createdByName: ticket.createdBy.name,
    createdByEmail: ticket.createdBy.email,
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

// POST — admin reply. Replying auto-advances OPEN -> IN_PROGRESS.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAnyAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body?.body) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id }, select: { status: true, barbershopId: true, subject: true } });
  if (!ticket) {
    return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
  }

  const message = await prisma.ticketMessage.create({ data: { ticketId: id, authorId: session.sub, body: body.body } });
  await prisma.supportTicket.update({
    where: { id },
    data: { status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status },
  });
  await logAdminAction({ actorId: session.sub, action: "support.reply_sent", targetType: "SupportTicket", targetId: id });
  await notifyBarbershop(ticket.barbershopId, "SUPPORT_REPLY", "Suporte respondeu", `Nova resposta em "${ticket.subject}"`, `/dashboard/support/${id}`);

  return NextResponse.json(message, { status: 201 });
}

// PATCH — admin can set any status.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAnyAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body?.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const updated = await prisma.supportTicket.update({ where: { id }, data: { status: body.status } });
  await logAdminAction({ actorId: session.sub, action: "support.status_changed", targetType: "SupportTicket", targetId: id, metadata: { status: body.status } });

  return NextResponse.json(updated);
}
