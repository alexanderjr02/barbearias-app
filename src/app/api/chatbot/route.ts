import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getBotResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.match(/olá|oi|hey|bom dia|boa tarde|boa noite/)) {
    return "Olá! 👋 Sou o assistente virtual da barbearia. Posso te ajudar com:\n\n1️⃣ Agendar um horário\n2️⃣ Ver nossos serviços e preços\n3️⃣ Horário de funcionamento\n4️⃣ Falar com a equipe\n\nO que você precisa?";
  }
  if (lower.match(/agendar|agendamento|marcar|horário|hora/)) {
    return "Ótimo! Para agendar, acesse nossa página de agendamento online ou me diga:\n\n• Qual serviço você deseja?\n• Qual dia e horário prefere?\n\nVou te ajudar a encontrar o melhor horário! 📅";
  }
  if (lower.match(/serviço|serviços|preço|valor|quanto|corte|barba/)) {
    return "Nossos serviços:\n\n✂️ Corte Simples — R$ 35 (30min)\n✂️ Corte Degradê — R$ 45 (45min)\n✂️🪒 Corte + Barba — R$ 55 (60min)\n🪒 Barba Completa — R$ 25 (30min)\n💆 Tratamento Capilar — R$ 45 (60min)\n\nQual te interessa?";
  }
  if (lower.match(/horário|funciona|abre|fecha|quando/)) {
    return "Nosso funcionamento:\n\n🗓️ Segunda a Sexta: 9h às 20h\n🗓️ Sábado: 9h às 18h\n🗓️ Domingo: 10h às 16h\n\nTemos horários disponíveis hoje! Quer agendar?";
  }
  if (lower.match(/localização|endereço|onde|como chegar/)) {
    return "📍 Estamos em:\nRua das Barbearias, 123\nSão Paulo, SP\n\nA 2 min da estação de metrô.\n\nQuer ver no mapa ou agendar?";
  }
  if (lower.match(/cancelar|cancela|cancelamento/)) {
    return "Para cancelar ou remarcar, entre em contato pelo WhatsApp com pelo menos 2h de antecedência.\n\nWhatsApp: (11) 99999-9999\n\nPosso te ajudar com mais alguma coisa?";
  }
  return "Entendi! Para mais informações:\n\n📞 (11) 99999-9999\n💬 WhatsApp: (11) 99999-9999\n📅 Ou agende online pelo nosso site\n\nPosso te ajudar com algo mais?";
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

    // Generate bot response
    const botResponse = getBotResponse(message);

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
