import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/copilot/conversations — the list of the user's past Copiloto
// conversations (threads), newest first, each with a title (first message) so
// they can be browsed and revisited.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const isGestor = session.role === "OWNER" || session.role === "MANAGER";
  const isBarber = session.role === "BARBER";
  if (!isGestor && !isBarber) return NextResponse.json({ conversations: [] });

  const prefix = `copilot:${session.sub}:`;
  const rows = await prisma.chatMessage.findMany({
    where: { sessionId: { startsWith: prefix } },
    orderBy: { createdAt: "asc" },
    select: { sessionId: true, content: true, role: true, createdAt: true },
  });
  type Row = (typeof rows)[number];

  const byConv = new Map<string, { title: string; updatedAt: Date; count: number }>();
  for (const r of rows as Row[]) {
    const id = r.sessionId.slice(prefix.length);
    const cur = byConv.get(id);
    if (!cur) {
      byConv.set(id, { title: r.role === "USER" ? r.content : "Conversa", updatedAt: r.createdAt, count: 1 });
    } else {
      if (cur.title === "Conversa" && r.role === "USER") cur.title = r.content;
      cur.updatedAt = r.createdAt;
      cur.count += 1;
    }
  }

  const conversations = [...byConv.entries()]
    .map(([id, v]) => ({ id, title: v.title.length > 60 ? `${v.title.slice(0, 60)}…` : v.title, updatedAt: v.updatedAt, count: v.count }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return NextResponse.json({ conversations });
}
