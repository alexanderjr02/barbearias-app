import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/chatbot/anthropicClient";
import { recordAiUsage } from "@/lib/ai/usage";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { assistantEnabled } from "@/lib/chatbot/assistant";
import { planHasAI } from "@/lib/billing";

// POST /api/copilot/marketing { occasion } — the AI marketing copywriter.
// Generates a ready-to-send promo message in the shop's voice. Pro+ + key.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { name: true, plan: true } });
  if (!planHasAI(shop?.plan)) return NextResponse.json({ available: false, locked: true });
  if (!assistantEnabled()) return NextResponse.json({ available: false });

  const body = await request.json().catch(() => null);
  const occasion = String(body?.occasion ?? "").trim();
  if (!occasion) return NextResponse.json({ error: "Descreva a ocasião ou objetivo." }, { status: 400 });

  try {
    const client = getAnthropic();
    const msg = await client.messages.create({
      model: process.env.CHATBOT_MODEL || "claude-opus-4-8",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Você é redator de marketing da barbearia "${shop?.name ?? "nossa barbearia"}". Escreva uma mensagem curta e persuasiva de divulgação para: "${occasion}". Tom brasileiro, animado e direto, com 1 emoji ou dois, pronta para enviar no WhatsApp/Instagram. Inclua uma chamada para ação (agendar). No máximo 4 linhas. Responda só com o texto da mensagem.`,
        },
      ],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    await recordAiUsage(session.barbershopId, "marketing", process.env.CHATBOT_MODEL || "claude-opus-4-8", msg.usage?.input_tokens ?? 0, msg.usage?.output_tokens ?? 0);
    return NextResponse.json({ available: true, text });
  } catch (e) {
    return NextResponse.json({ available: true, text: `Não consegui gerar agora. ${e instanceof Error ? e.message : ""}`.trim() });
  }
}
