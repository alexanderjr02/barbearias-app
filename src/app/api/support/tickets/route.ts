import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// GET /api/support/tickets — every ticket opened by this barbershop.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { barbershopId: session.barbershopId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
    },
  });

  return NextResponse.json(
    tickets.map((t: (typeof tickets)[number]) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      messageCount: t._count.messages,
      lastMessage: t.messages[0]?.body ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
  );
}

// POST /api/support/tickets — opens a new ticket with its first message.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.subject || !body?.body) {
    return NextResponse.json({ error: "Assunto e mensagem são obrigatórios" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      barbershopId: session.barbershopId,
      createdById: session.sub,
      subject: body.subject,
      priority: typeof body.priority === "string" && ["LOW", "NORMAL", "HIGH"].includes(body.priority) ? body.priority : "NORMAL",
      messages: { create: { authorId: session.sub, body: body.body } },
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
