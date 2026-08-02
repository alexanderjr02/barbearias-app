import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAssistant, assistantEnabled, type ChatTurn } from "@/lib/chatbot/assistant";
import { planHasAI } from "@/lib/billing";

function getBotResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.match(/olá|oi|hey|bom dia|boa tarde|boa noite/)) {
    return "Olá! Sou o assistente virtual da barbearia. Posso te ajudar com:\n\nAgendar um horário\nVer nossos serviços e preços\nHorário de funcionamento\nFalar com a equipe\n\nO que você precisa?";
  }
  if (lower.match(/agendar|agendamento|marcar|horário|hora/)) {
    return "Ótimo! Para agendar, acesse nossa página de agendamento online ou me diga:\n\n• Qual serviço você deseja?\n• Qual dia e horário prefere?\n\nVou te ajudar a encontrar o melhor horário!";
  }
  if (lower.match(/serviço|serviços|preço|valor|quanto|corte|barba/)) {
    return "Nossos serviços:\n\nCorte Simples. R$ 35 (30min)\nCorte Degradê. R$ 45 (45min)\nCorte + Barba. R$ 55 (60min)\nBarba Completa. R$ 25 (30min)\nTratamento Capilar. R$ 45 (60min)\n\nQual te interessa?";
  }
  if (lower.match(/horário|funciona|abre|fecha|quando/)) {
    return "Nosso funcionamento:\n\nSegunda a Sexta: 9h às 20h\nSábado: 9h às 18h\nDomingo: 10h às 16h\n\nTemos horários disponíveis hoje! Quer agendar?";
  }
  if (lower.match(/localização|endereço|onde|como chegar/)) {
    return "Estamos em:\nRua das Barbearias, 123\nSão Paulo, SP\n\nA 2 min da estação de metrô.\n\nQuer ver no mapa ou agendar?";
  }
  if (lower.match(/cancelar|cancela|cancelamento/)) {
    return "Para cancelar ou remarcar, entre em contato pelo WhatsApp com pelo menos 2h de antecedência.\n\nWhatsApp: (11) 99999-9999\n\nPosso te ajudar com mais alguma coisa?";
  }
  return "Entendi! Para mais informações:\n\n(11) 99999-9999\nWhatsApp: (11) 99999-9999\nOu agende online pelo nosso site\n\nPosso te ajudar com algo mais?";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, barbershopId } = body;

    if (!message || !sessionId || !barbershopId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store message
    await prisma.chatMessage.create({
      data: {
        content: message,
        role: "USER",
        sessionId,
        barbershopId,
      },
    });

    // Generate bot response, a real AI assistant (with tool use: booking,
    // rescheduling, availability) when an Anthropic key is configured, else the
    // simple canned answers below.
    // The AI assistant is a paid feature (Pro+). On the Essencial tier the bot
    // falls back to the canned answers, even if a key is configured.
    const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true } });
    let botResponse: string;
    if (assistantEnabled() && planHasAI(shop?.plan)) {
      try {
        const rows: { content: string; role: string }[] = await prisma.chatMessage.findMany({
          where: { sessionId, barbershopId },
          orderBy: { createdAt: "asc" },
          take: 30,
          select: { content: true, role: true },
        });
        const history: ChatTurn[] = rows.map((r) => ({ role: r.role === "USER" ? "user" : "assistant", content: r.content }));
        botResponse = await runAssistant(barbershopId, history);
      } catch (err) {
        console.error("[chatbot] assistant failed, using fallback:", err);
        botResponse = getBotResponse(message);
      }
    } else {
      botResponse = getBotResponse(message);
    }

    // Store bot response
    await prisma.chatMessage.create({
      data: {
        content: botResponse,
        role: "BOT",
        sessionId,
        barbershopId,
      },
    });

    return NextResponse.json({ response: botResponse });
  } catch {
    // Fallback without DB
    const body = await request.json().catch(() => ({}));
    const { message = "" } = body as { message?: string };
    return NextResponse.json({
      response: getBotResponse(message),
    });
  }
}
