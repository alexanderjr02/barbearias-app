import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assistantEnabled } from "@/lib/chatbot/assistant";
import { planHasAI } from "@/lib/billing";
import { runCopilot, simulatedReply, copilotSuggestions, unavailableAiNote, type CopilotRole, type ChatTurn, type CopilotAction } from "@/lib/chatbot/copilot";
import { aiQuota } from "@/lib/ai/usage";

// POST /api/copilot/chat { messages: [{role, content}] } — the business copilot
// for the gestor/barber. Uses the AI loop when a key is configured, otherwise
// a deterministic "simulated" responder so it's usable right now.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const isGestor = session.role === "OWNER" || session.role === "MANAGER";
  const isBarber = session.role === "BARBER";
  if (!isGestor && !isBarber) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (!session.barbershopId) return NextResponse.json({ error: "Sem barbearia" }, { status: 400 });

  // The Copiloto is a Pro+ feature.
  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  if (!planHasAI(shop?.plan)) {
    return NextResponse.json({
      reply: "O Copiloto faz parte do plano Pro. Faça upgrade pra desbloquear seu assistente de negócio com IA.",
      aiPowered: false,
      locked: true,
      note: "Recurso do plano Pro",
      suggestions: [],
    });
  }

  const role: CopilotRole = isBarber ? "BARBER" : "GESTOR";
  let staffId: string | null = null;
  if (isBarber) {
    const staff = await prisma.staff.findUnique({ where: { userId: session.sub }, select: { id: true } });
    staffId = staff?.id ?? null;
  }

  const body = await request.json().catch(() => null);
  // Hardening: keep only valid turns, cap each message length and the count so
  // a malformed/huge payload can never break the request or blow up costs.
  const history: ChatTurn[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m: unknown): m is ChatTurn => !!m && typeof (m as ChatTurn).content === "string" && ((m as ChatTurn).role === "user" || (m as ChatTurn).role === "assistant"))
    .slice(-24)
    .map((m: ChatTurn) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser || !lastUser.content.trim()) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

  let reply: string;
  let actions: CopilotAction[] = [];
  let undo: { id: string; label: string } | undefined;
  // Margin guardrail: over the plan's daily AI cap, serve the FREE simulated
  // responder instead of calling the model, so cost stays bounded.
  const quota = await aiQuota(session.barbershopId, shop?.plan);
  const aiPowered = assistantEnabled() && quota.allowed;
  let capNote: string | null = null;
  if (aiPowered) {
    try {
      // Só o OWNER enxerga a rede — um MANAGER responde pela loja dele.
      const ownerId = session.role === "OWNER" ? session.sub : null;
      const res = await runCopilot(role, session.barbershopId, staffId, history, ownerId, session.sub);
      reply = res.reply;
      actions = res.actions;
      undo = res.undo;
    } catch {
      reply = await simulatedReply(role, session.barbershopId, staffId, lastUser.content);
    }
  } else {
    reply = await simulatedReply(role, session.barbershopId, staffId, lastUser.content);
    if (assistantEnabled() && !quota.allowed) capNote = "Limite diário de IA atingido — respostas no modo rápido até amanhã.";
  }

  // Persist this turn so the conversation survives closing/reopening AND can be
  // browsed later. Each conversation is its own thread (conversationId).
  const conversationId = typeof body?.conversationId === "string" && body.conversationId.trim() ? body.conversationId.trim() : "default";
  const memSession = `copilot:${session.sub}:${conversationId}`;
  try {
    await prisma.chatMessage.create({ data: { content: lastUser.content, role: "USER", sessionId: memSession, barbershopId: session.barbershopId } });
    await prisma.chatMessage.create({ data: { content: reply, role: "BOT", sessionId: memSession, barbershopId: session.barbershopId } });
  } catch {
    // non-critical
  }

  return NextResponse.json({ reply, actions, undo, aiPowered, note: capNote ?? unavailableAiNote(), suggestions: copilotSuggestions(role) });
}
