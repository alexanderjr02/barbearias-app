import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { runAssistant, assistantEnabled, type ChatTurn } from "@/lib/chatbot/assistant";
import { runCopilot } from "@/lib/chatbot/copilot";
import { planHasAI } from "@/lib/billing";
import { notifyBarbershop } from "@/lib/gestorNotifications";

// WhatsApp Cloud API webhook — the inbound half of the 24/7 assistant. The
// outbound sender already lives in src/lib/whatsapp.ts; this receives client
// messages and answers them with the same AI assistant used in-app.
//
// Configure (env):
//   WHATSAPP_VERIFY_TOKEN   — arbitrary string you also type into the Meta
//                             webhook "Verify token" field.
//   WHATSAPP_BARBERSHOP_ID  — which barbershop this WhatsApp number belongs to
//                             (one number = one shop).
//   plus WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID (already used for sending).
//
// Until those are set the endpoint is inert — nothing breaks.

// Meta calls GET once to verify the webhook subscription.
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

const HANDOFF_RE = /atendente|humano|pessoa|falar com|reclama|gerente/i;

interface WaMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  // Always ACK fast so Meta doesn't retry; process best-effort below.
  try {
    const barbershopId = process.env.WHATSAPP_BARBERSHOP_ID;
    if (!barbershopId) return NextResponse.json({ ok: true });

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const message: WaMessage | undefined = value?.messages?.[0];
    if (!message || message.type !== "text") return NextResponse.json({ ok: true });

    const from = message.from ?? "";
    const text = message.text?.body?.trim() ?? "";
    if (!from || !text) return NextResponse.json({ ok: true });

    // Session keyed by the client's phone, so the assistant keeps context.
    const sessionId = `wa:${from}`;
    await prisma.chatMessage.create({ data: { content: text, role: "USER", sessionId, barbershopId } });

    // Human handoff: flag the team and let the client know.
    if (HANDOFF_RE.test(text)) {
      await notifyBarbershop(barbershopId, "SUPPORT_REPLY", "Cliente pediu atendimento humano 💬", `Pelo WhatsApp (${from}): "${text.slice(0, 120)}"`, "/dashboard");
      const reply = "Claro! Já avisei a equipe — em breve alguém fala com você por aqui. 🙌";
      await prisma.chatMessage.create({ data: { content: reply, role: "BOT", sessionId, barbershopId } });
      await sendWhatsAppText(from, reply);
      return NextResponse.json({ ok: true });
    }

    const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true, owner: { select: { phone: true } } } });
    // If the message comes from the OWNER's phone, they operate the business by
    // WhatsApp via the Copiloto (agendar, cancelar, fechar agenda, financeiro…).
    const fromDigits = from.replace(/\D/g, "").slice(-8);
    const ownerDigits = (shop?.owner?.phone ?? "").replace(/\D/g, "").slice(-8);
    const isGestor = ownerDigits.length >= 8 && fromDigits === ownerDigits;

    let reply: string;
    if (assistantEnabled() && planHasAI(shop?.plan)) {
      const rows: { content: string; role: string }[] = await prisma.chatMessage.findMany({
        where: { sessionId, barbershopId },
        orderBy: { createdAt: "asc" },
        take: 30,
        select: { content: true, role: true },
      });
      const history: ChatTurn[] = rows.map((r) => ({ role: r.role === "USER" ? "user" : "assistant", content: r.content }));
      try {
        if (isGestor) {
          const res = await runCopilot("GESTOR", barbershopId, null, history);
          reply = res.reply + (res.actions.length ? `\n\n(Toque nas ações no painel/app: ${res.actions.map((a) => a.label).join(", ")})` : "");
        } else {
          reply = await runAssistant(barbershopId, history);
        }
      } catch {
        reply = "Tive um probleminha aqui agora. Pode repetir daqui a pouco? 🙏";
      }
    } else {
      reply = "Oi! 👋 Para agendar, ver serviços ou seus horários, baixe nosso app ou acesse nossa página de agendamento. Se precisar, é só escrever *atendente* que chamamos a equipe.";
    }

    await prisma.chatMessage.create({ data: { content: reply, role: "BOT", sessionId, barbershopId } });
    await sendWhatsAppText(from, reply);
  } catch (err) {
    console.error("[whatsapp webhook]", err);
  }
  return NextResponse.json({ ok: true });
}
