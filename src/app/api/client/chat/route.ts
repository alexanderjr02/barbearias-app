import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { planHasAI } from "@/lib/billing";
import { runAssistant, assistantEnabled, type ChatTurn } from "@/lib/chatbot/assistant";
import { rhythmContextLine } from "@/lib/copilot/clientAgent";

// POST /api/client/chat { message, barbershopId } — the logged-in client's
// personalized assistant. Unlike the anonymous /api/chatbot, it knows WHO the
// client is: greets by name, remembers past visits/preferences, and the
// conversation persists across app sessions (per client). AI is Pro+ + key.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const message: string = (body?.message ?? "").toString().trim().slice(0, 2000);
  const barbershopId: string = (body?.barbershopId ?? "").toString();
  if (!message || !barbershopId) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const clientId = session.sub;
  const sessionKey = `client:${clientId}@${barbershopId}`;

  // Persist the incoming message (conversation memory).
  await prisma.chatMessage.create({ data: { content: message, role: "USER", sessionId: sessionKey, barbershopId } });

  const [shop, user, prefs, visits, priorRows] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true } }),
    prisma.user.findUnique({ where: { id: clientId }, select: { name: true } }),
    prisma.clientPreferences.findUnique({ where: { clientId } }),
    prisma.appointment.findMany({
      where: { clientId, barbershopId, status: "COMPLETED" },
      orderBy: { date: "desc" },
      take: 5,
      select: { date: true, service: { select: { name: true } }, staff: { select: { name: true } } },
    }),
    prisma.chatMessage.findMany({ where: { sessionId: sessionKey }, orderBy: { createdAt: "asc" }, take: 30, select: { content: true, role: true } }),
  ]);

  let reply: string;
  if (assistantEnabled() && planHasAI(shop?.plan)) {
    type Visit = (typeof visits)[number];
    const visitLine = visits.length
      ? visits.map((v: Visit) => `${v.service?.name ?? "serviço"} com ${v.staff?.name ?? "barbeiro"} em ${v.date.toISOString().slice(0, 10)}`).join("; ")
      : "ainda sem visitas concluídas";
    const prefLine = prefs
      ? [prefs.machine && `máquina/laterais: ${prefs.machine}`, prefs.products && `produtos: ${prefs.products}`, prefs.allergies && `alergias: ${prefs.allergies}`, prefs.drink && `bebida: ${prefs.drink}`, prefs.chat && `conversa: ${prefs.chat}`, prefs.notes && `obs: ${prefs.notes}`].filter(Boolean).join("; ")
      : "sem preferências cadastradas";
    const rhythmLine = await rhythmContextLine(barbershopId, clientId).catch(() => "");
    const context = `Nome: ${user?.name ?? "cliente"}.\nÚltimas visitas: ${visitLine}.\nPreferências: ${prefLine}.${rhythmLine ? `\n${rhythmLine}` : ""}`;

    type Row = (typeof priorRows)[number];
    const history: ChatTurn[] = priorRows.map((r: Row) => ({ role: r.role === "USER" ? "user" : "assistant", content: r.content }));
    try {
      reply = await runAssistant(barbershopId, history, context);
    } catch {
      reply = `Oi${user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Tive um probleminha agora. Pode repetir?`;
    }
  } else {
    reply = `Oi${user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋 Posso te ajudar a agendar, ver serviços ou seus horários. O que você precisa?`;
  }

  await prisma.chatMessage.create({ data: { content: reply, role: "BOT", sessionId: sessionKey, barbershopId } });
  return NextResponse.json({ response: reply });
}

// GET /api/client/chat?barbershopId= — the persisted conversation, so the chat
// picks up where it left off.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ messages: [] });
  const barbershopId = request.nextUrl.searchParams.get("barbershopId");
  if (!barbershopId) return NextResponse.json({ messages: [] });
  const rows = await prisma.chatMessage.findMany({
    where: { sessionId: `client:${session.sub}@${barbershopId}` },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { content: true, role: true },
  });
  type Row = (typeof rows)[number];
  return NextResponse.json({ messages: rows.map((r: Row) => ({ role: r.role === "USER" ? "user" : "assistant", content: r.content })) });
}
