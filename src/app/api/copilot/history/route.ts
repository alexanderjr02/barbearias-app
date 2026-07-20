import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/copilot/history?conversationId= — messages of one conversation
// thread, so it picks up where it left off. Without conversationId, returns the
// most recent thread's messages (continuity on open).
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const isGestor = session.role === "OWNER" || session.role === "MANAGER";
  const isBarber = session.role === "BARBER";
  if (!isGestor && !isBarber) return NextResponse.json({ messages: [] });

  const prefix = `copilot:${session.sub}:`;
  const convId = request.nextUrl.searchParams.get("conversationId");

  let sessionId: string | null = convId ? `${prefix}${convId}` : null;
  if (!sessionId) {
    // Most recent thread.
    const last = await prisma.chatMessage.findFirst({
      where: { sessionId: { startsWith: prefix } },
      orderBy: { createdAt: "desc" },
      select: { sessionId: true },
    });
    sessionId = last?.sessionId ?? null;
  }
  if (!sessionId) return NextResponse.json({ messages: [], conversationId: null });

  const rows = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: { content: true, role: true },
  });
  type Row = (typeof rows)[number];
  return NextResponse.json({
    conversationId: sessionId.slice(prefix.length),
    messages: rows.map((r: Row) => ({ role: r.role === "USER" ? "user" : "assistant", content: r.content })),
  });
}

// DELETE /api/copilot/history?conversationId= — deletes one conversation.
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const convId = request.nextUrl.searchParams.get("conversationId");
  const prefix = `copilot:${session.sub}:`;
  if (convId) {
    await prisma.chatMessage.deleteMany({ where: { sessionId: `${prefix}${convId}` } });
  } else {
    await prisma.chatMessage.deleteMany({ where: { sessionId: { startsWith: prefix } } });
  }
  return NextResponse.json({ ok: true });
}
