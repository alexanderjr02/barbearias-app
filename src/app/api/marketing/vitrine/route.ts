import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { assistantEnabled } from "@/lib/chatbot/assistant";
import { getAnthropic } from "@/lib/chatbot/anthropicClient";
import { recordAiUsage } from "@/lib/ai/usage";
import { addUtcDays, startOfUtcDay } from "@/lib/dateRange";

// GET /api/marketing/vitrine
//
// O post da semana, montado sozinho.
//
// Barbearia vive de Instagram e postar é justamente a tarefa que ninguém faz:
// exige escolher a foto, escrever, e lembrar. Aqui o sistema escolhe o melhor
// antes/depois dos últimos 7 dias (nota do cliente primeiro, valor depois),
// escreve a legenda e entrega pronto.
//
// A trava que não pode faltar: só entra foto de cliente que autorizou uso de
// imagem. Publicar o rosto de alguém sem aceite não é descuido de produto, é
// problema jurídico.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const bid = session.barbershopId;

  const desde = addUtcDays(startOfUtcDay(new Date()), -7);
  const candidatos = await prisma.appointment.findMany({
    where: {
      barbershopId: bid,
      status: "COMPLETED",
      date: { gte: desde },
      resultPhoto: { not: null },
      clientId: { not: null },
    },
    orderBy: { date: "desc" },
    take: 30,
    select: {
      id: true,
      clientId: true,
      clientName: true,
      resultPhoto: true,
      referencePhoto: true,
      totalPrice: true,
      recipeMachine: true,
      recipeFinish: true,
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  if (candidatos.length === 0) {
    return NextResponse.json({ temPost: false, motivo: "Nenhuma foto de resultado nos últimos 7 dias." });
  }

  // Consentimento de imagem: só quem aceitou receber/aparecer entra.
  const ids = candidatos.map((c: (typeof candidatos)[number]) => c.clientId!).filter(Boolean);
  const links = await prisma.barbershopClient.findMany({
    where: { barbershopId: bid, userId: { in: ids }, marketingConsent: true },
    select: { userId: true },
  });
  const autorizados = new Set(links.map((l: { userId: string }) => l.userId));
  const permitidos = candidatos.filter((c: (typeof candidatos)[number]) => c.clientId && autorizados.has(c.clientId));

  if (permitidos.length === 0) {
    return NextResponse.json({
      temPost: false,
      motivo: "Há fotos da semana, mas nenhuma de cliente que autorizou uso de imagem.",
    });
  }

  // Nota do cliente pesa mais que o valor: o post que convence é o do corte
  // que o cliente amou, não o mais caro.
  const notas = await prisma.review.findMany({
    where: { barbershopId: bid, appointmentId: { in: permitidos.map((c: (typeof permitidos)[number]) => c.id) } },
    select: { appointmentId: true, rating: true, comment: true },
  });
  type Nota = { appointmentId: string; rating: number; comment: string | null };
  const notaPor = new Map<string, Nota>((notas as Nota[]).map((n) => [n.appointmentId, n]));

  const escolhido = [...permitidos].sort((a, b) => {
    const na = notaPor.get(a.id)?.rating ?? 0;
    const nb = notaPor.get(b.id)?.rating ?? 0;
    if (nb !== na) return nb - na;
    return b.totalPrice - a.totalPrice;
  })[0];

  const nota = notaPor.get(escolhido.id);
  const primeiroNome = escolhido.clientName.split(" ")[0];
  const servico = escolhido.service?.name ?? "corte";
  const barbeiro = escolhido.staff?.name?.split(" ")[0] ?? "";

  // Legenda determinística: existe sempre, com ou sem IA ligada.
  let legenda = `${servico} no ${primeiroNome}${barbeiro ? `, com o ${barbeiro}` : ""}.${
    nota?.comment ? ` "${nota.comment.trim().slice(0, 120)}"` : ""
  }\n\nAgende o seu pelo link da bio.`;
  let porIA = false;

  if (assistantEnabled()) {
    try {
      const client = getAnthropic();
      const modelo = process.env.CHATBOT_MODEL || "claude-opus-4-8";
      const msg = await client.messages.create({
        model: modelo,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Escreva a legenda de um post de Instagram de uma barbearia sobre este atendimento.

Serviço: ${servico}
Cliente: ${primeiroNome}
Barbeiro: ${barbeiro || "não informado"}
${escolhido.recipeMachine ? `Técnica: ${escolhido.recipeMachine}${escolhido.recipeFinish ? `, ${escolhido.recipeFinish}` : ""}` : ""}
${nota ? `Nota do cliente: ${nota.rating}/5${nota.comment ? `. Comentário: "${nota.comment}"` : ""}` : ""}

Regras: português do Brasil, tom de barbearia (direto, sem formalidade), no máximo 3 linhas, termine chamando para agendar. Não use travessão. Não use emoji. Devolva só a legenda.`,
          },
        ],
      });
      const texto = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (texto) {
        legenda = texto;
        porIA = true;
      }
      await recordAiUsage(bid, "marketing", modelo, msg.usage?.input_tokens ?? 0, msg.usage?.output_tokens ?? 0);
    } catch (e) {
      console.warn("[vitrine] legenda por IA falhou, usando a padrão:", e);
    }
  }

  return NextResponse.json({
    temPost: true,
    porIA,
    antes: escolhido.referencePhoto,
    depois: escolhido.resultPhoto,
    cliente: primeiroNome,
    servico,
    barbeiro,
    nota: nota?.rating ?? null,
    legenda,
  });
}
