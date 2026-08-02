import { prisma } from "@/lib/db";
import { addUtcDays, startOfUtcDay } from "@/lib/dateRange";

/**
 * A parte do auto-piloto que olha para a FRENTE.
 *
 * Até aqui ele só reagia: vagou um horário, chama a fila. Um dia que já nasceu
 * fraco daqui a três dias não disparava nada, e quando chegava não havia mais
 * o que fazer, cadeira vazia não se recupera depois.
 */

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export interface DiaFraco {
  dateKey: string;
  rotulo: string;
  ocupacao: number;
}

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/**
 * O pior dia entre depois de amanhã e daqui a 5 dias, se estiver abaixo do
 * piso de ocupação.
 *
 * Começa em D+2 de propósito: amanhã já está praticamente decidido, avisar não
 * muda nada e só gera ruído. E ignora dia fechado, que tem capacidade zero e
 * apareceria como 0% todo santo domingo.
 */
export async function diaFracoAFrente(barbershopId: string, piso = 40): Promise<DiaFraco | null> {
  try {
    const [horarios, barbeiros] = await Promise.all([
      prisma.workingHour.findMany({ where: { barbershopId } }),
      prisma.staff.count({ where: { barbershopId, isActive: true } }),
    ]);
    if (barbeiros === 0) return null;

    const hoje = startOfUtcDay(new Date());
    let pior: DiaFraco | null = null;

    for (let d = 2; d <= 5; d++) {
      const dia = addUtcDays(hoje, d);
      const hh = horarios.find((h: (typeof horarios)[number]) => h.dayOfWeek === dia.getUTCDay());
      if (!hh || !hh.isOpen) continue;

      const capacidade = Math.max(0, minutos(hh.closeTime) - minutos(hh.openTime)) * barbeiros;
      if (capacidade === 0) continue;

      const marcados = await prisma.appointment.findMany({
        where: { barbershopId, date: dia, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
        select: { startTime: true, endTime: true },
      });
      const vendidos = marcados.reduce(
        (acc: number, a: { startTime: string; endTime: string }) => acc + Math.max(0, minutos(a.endTime) - minutos(a.startTime)),
        0,
      );
      const ocupacao = Math.round((vendidos / capacidade) * 100);
      if (ocupacao >= piso) continue;
      if (pior && pior.ocupacao <= ocupacao) continue;

      pior = {
        dateKey: dia.toISOString().slice(0, 10),
        rotulo: `${DIAS[dia.getUTCDay()]} (${String(dia.getUTCDate()).padStart(2, "0")}/${String(dia.getUTCMonth() + 1).padStart(2, "0")})`,
        ocupacao,
      };
    }
    return pior;
  } catch (err) {
    console.warn("[previsao] dia fraco não calculado:", err);
    return null;
  }
}

/**
 * Quem tem histórico de faltar, entre os clientes passados.
 *
 * O risco de falta já era calculado no sistema, mas só respondia se alguém
 * perguntasse no chat. Aqui ele passa a mudar o texto da confirmação: em vez
 * de avisar, pede resposta, que é o que faz alguém desmarcar em vez de sumir.
 *
 * Duas faltas é o corte. Uma pode ser imprevisto de qualquer um; duas é padrão.
 */
export async function clientesComRiscoDeFalta(barbershopId: string, clientIds: string[]): Promise<Set<string>> {
  const risco = new Set<string>();
  if (clientIds.length === 0) return risco;
  try {
    const faltas = await prisma.appointment.groupBy({
      by: ["clientId"],
      where: { barbershopId, clientId: { in: clientIds }, status: "NO_SHOW" },
      _count: { _all: true },
    });
    for (const f of faltas as { clientId: string | null; _count: { _all: number } }[]) {
      if (f.clientId && f._count._all >= 2) risco.add(f.clientId);
    }
  } catch (err) {
    console.warn("[previsao] risco de falta não calculado:", err);
  }
  return risco;
}
