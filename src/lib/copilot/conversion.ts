import { prisma } from "@/lib/db";

/**
 * Mede se a ação do auto-piloto virou dinheiro.
 *
 * Antes disto ele registrava o que fez e um valor ESTIMADO de recuperação, mas
 * nunca sabia se a mensagem funcionou. Um win-back que ninguém responde e um
 * que traz metade dos clientes de volta ficavam idênticos no histórico, então
 * ele repetia os dois para sempre com a mesma confiança.
 *
 * A regra de atribuição é a mais conservadora que faz sentido: se o cliente
 * agendou dentro de 72h depois de receber, conta. Fora disso, não. Não é
 * causalidade provada, é a janela padrão de atribuição por contato direto, e
 * erra para menos, que é o lado certo de errar quando o número serve para
 * decidir se continua gastando mensagem com aquilo.
 */
export const JANELA_HORAS = 72;

/** Ações que pedem uma resposta do cliente. Confirmar agendamento não entra:
 *  o cliente já tinha horário, não há o que converter. */
const ACOES_COM_PEDIDO = ["winback", "birthday", "slot_filled", "fill_week", "promo"];

/**
 * Marca como convertida a ação mais recente que pediu algo a este cliente,
 * se ela ainda estiver dentro da janela. Chamado quando um agendamento nasce.
 *
 * Nunca lança: medir não pode derrubar o agendamento que está sendo criado.
 */
export async function registrarConversao(barbershopId: string, clientId: string | null | undefined): Promise<void> {
  if (!clientId) return;
  try {
    const limite = new Date(Date.now() - JANELA_HORAS * 60 * 60 * 1000);
    const alvo = await prisma.autopilotLog.findFirst({
      where: {
        barbershopId,
        clientId,
        convertedAt: null,
        action: { in: ACOES_COM_PEDIDO },
        createdAt: { gte: limite },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (alvo) {
      await prisma.autopilotLog.update({ where: { id: alvo.id }, data: { convertedAt: new Date() } });
    }
  } catch (err) {
    console.warn("[conversao] não registrada:", err);
  }
}

export interface DesempenhoAcao {
  action: string;
  enviadas: number;
  converteram: number;
  taxa: number;
}

/**
 * Quanto cada tipo de ação converte nos últimos N dias. É com isto que o
 * gestor (e o próprio Copiloto) decide onde vale insistir.
 */
export async function desempenhoAutopilot(barbershopId: string, dias = 90): Promise<DesempenhoAcao[]> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const linhas = await prisma.autopilotLog.findMany({
    where: { barbershopId, createdAt: { gte: desde }, action: { in: ACOES_COM_PEDIDO }, clientId: { not: null } },
    select: { action: true, convertedAt: true },
  });

  const mapa = new Map<string, { enviadas: number; converteram: number }>();
  for (const l of linhas) {
    const e = mapa.get(l.action) ?? { enviadas: 0, converteram: 0 };
    e.enviadas++;
    if (l.convertedAt) e.converteram++;
    mapa.set(l.action, e);
  }

  return [...mapa.entries()]
    .map(([action, v]) => ({
      action,
      enviadas: v.enviadas,
      converteram: v.converteram,
      taxa: v.enviadas > 0 ? v.converteram / v.enviadas : 0,
    }))
    .sort((a, b) => b.taxa - a.taxa);
}

/**
 * A ação está pagando o incômodo?
 *
 * Só opina depois de uma amostra que valha (20 envios). Abaixo disso, dois
 * azares seguidos derrubariam uma campanha boa, então prefere não julgar.
 */
export async function acaoValeAPena(barbershopId: string, action: string, minimo = 20, pisoTaxa = 0.05): Promise<boolean> {
  try {
    const linhas = await desempenhoAutopilot(barbershopId);
    const d = linhas.find((l) => l.action === action);
    if (!d || d.enviadas < minimo) return true;
    return d.taxa >= pisoTaxa;
  } catch {
    return true;
  }
}

export const ROTULO_ACAO: Record<string, string> = {
  winback: "Chamar sumidos",
  birthday: "Aniversário",
  slot_filled: "Horário que vagou",
  fill_week: "Encher a semana",
  promo: "Promoção",
};
