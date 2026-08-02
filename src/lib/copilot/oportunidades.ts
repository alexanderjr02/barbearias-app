import { prisma } from "@/lib/db";
import { addUtcDays, startOfUtcDay } from "@/lib/dateRange";

/**
 * As análises que exigem JULGAMENTO, não relatório.
 *
 * Um relatório diz "segunda faturou R$ 400". Isto diz "você tem três barbeiros
 * na segunda enchendo 40% da agenda e três na sexta enchendo 95%: mova um e
 * ganhe R$ X sem contratar ninguém". A diferença entre as duas frases é o
 * produto inteiro.
 *
 * Tudo aqui é determinístico, sai dos números da própria loja. Não depende de
 * modelo nenhum, então funciona no dia um, e continua funcionando se a IA cair.
 */

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export interface Oportunidade {
  tipo: "fuga" | "escala" | "preco_barbeiro" | "preco_horario";
  titulo: string;
  detalhe: string;
  /** R$ por mês em jogo. Ordena a lista: dinheiro na frente. */
  valorMes: number;
}

/**
 * FUGA ANTECIPADA.
 *
 * O win-back dispara num prazo fixo (45 dias). Só que cada cliente tem o
 * próprio ritmo: quem corta a cada 21 dias e chegou aos 30 já está indo
 * embora, faltando ainda duas semanas para o gatilho acordar. Resgatar morno
 * custa uma mensagem; resgatar frio custa desconto.
 *
 * Exige histórico de verdade (3 visitas) para não confundir cliente novo com
 * cliente sumindo, e um atraso de 40% sobre o próprio ritmo, que é grande o
 * bastante para não ser só a semana corrida dele.
 */
export async function fugaAntecipada(barbershopId: string, limite = 12): Promise<{ clientId: string; nome: string; ritmo: number; atraso: number; ticket: number }[]> {
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, status: "COMPLETED", clientId: { not: null } },
    orderBy: { date: "asc" },
    select: { clientId: true, clientName: true, date: true, totalPrice: true },
  });

  type Linha = { nome: string; datas: Date[]; total: number };
  const porCliente = new Map<string, Linha>();
  for (const a of appts as { clientId: string | null; clientName: string; date: Date; totalPrice: number }[]) {
    if (!a.clientId) continue;
    const e = porCliente.get(a.clientId) ?? { nome: a.clientName, datas: [], total: 0 };
    e.datas.push(a.date);
    e.total += a.totalPrice;
    porCliente.set(a.clientId, e);
  }

  const hoje = startOfUtcDay(new Date());
  const saida: { clientId: string; nome: string; ritmo: number; atraso: number; ticket: number }[] = [];

  for (const [clientId, l] of porCliente) {
    if (l.datas.length < 3) continue;
    const intervalos: number[] = [];
    for (let i = 1; i < l.datas.length; i++) {
      const d = Math.round((l.datas[i].getTime() - l.datas[i - 1].getTime()) / 86400000);
      if (d > 0 && d < 200) intervalos.push(d);
    }
    if (intervalos.length < 2) continue;
    const ritmo = Math.round(intervalos.reduce((s, d) => s + d, 0) / intervalos.length);
    if (ritmo < 7 || ritmo > 120) continue;

    const ultima = l.datas[l.datas.length - 1];
    const desde = Math.floor((hoje.getTime() - ultima.getTime()) / 86400000);
    // Já passou do ritmo com folga, mas ainda não é o sumido clássico: aqui é
    // onde uma mensagem ainda soa como cuidado e não como cobrança.
    if (desde < ritmo * 1.4 || desde > 45) continue;

    saida.push({ clientId, nome: l.nome, ritmo, atraso: desde - ritmo, ticket: l.total / l.datas.length });
  }

  return saida.sort((a, b) => b.ticket - a.ticket).slice(0, limite);
}

/**
 * ESCALA.
 *
 * Compara a ocupação média por dia da semana nas últimas 8 semanas. Se um dia
 * vive vazio e outro vive lotado com a mesma equipe, sobra gente num e falta no
 * outro. Escala é a segunda maior conta depois do aluguel e quase sempre é
 * definida por hábito, nunca por número.
 */
export async function desequilibrioDeEscala(barbershopId: string): Promise<Oportunidade | null> {
  const [horarios, barbeiros] = await Promise.all([
    prisma.workingHour.findMany({ where: { barbershopId } }),
    prisma.staff.count({ where: { barbershopId, isActive: true } }),
  ]);
  if (barbeiros < 2) return null;

  const desde = addUtcDays(startOfUtcDay(new Date()), -56);
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, date: { gte: desde }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    select: { date: true, startTime: true, endTime: true, totalPrice: true },
  });

  const vendidoPorDia = new Map<number, { minutos: number; receita: number; ocorrencias: Set<string> }>();
  for (const a of appts as { date: Date; startTime: string; endTime: string; totalPrice: number }[]) {
    const dw = a.date.getUTCDay();
    const e = vendidoPorDia.get(dw) ?? { minutos: 0, receita: 0, ocorrencias: new Set<string>() };
    e.minutos += Math.max(0, minutos(a.endTime) - minutos(a.startTime));
    e.receita += a.totalPrice;
    e.ocorrencias.add(a.date.toISOString().slice(0, 10));
    vendidoPorDia.set(dw, e);
  }

  const linhas: { dw: number; ocupacao: number; receitaDia: number }[] = [];
  for (const hh of horarios as { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[]) {
    if (!hh.isOpen) continue;
    const capacidadeDia = Math.max(0, minutos(hh.closeTime) - minutos(hh.openTime)) * barbeiros;
    if (capacidadeDia === 0) continue;
    const v = vendidoPorDia.get(hh.dayOfWeek);
    const dias = v?.ocorrencias.size ?? 0;
    if (dias < 3) continue; // amostra curta demais para opinar
    const ocupacao = Math.round(((v!.minutos / dias) / capacidadeDia) * 100);
    linhas.push({ dw: hh.dayOfWeek, ocupacao, receitaDia: v!.receita / dias });
  }
  if (linhas.length < 2) return null;

  const cheio = linhas.reduce((a, b) => (b.ocupacao > a.ocupacao ? b : a));
  const vazio = linhas.reduce((a, b) => (b.ocupacao < a.ocupacao ? b : a));
  // Só vale falar quando a diferença é grande e o dia cheio está mesmo no teto:
  // remanejar gente é decisão cara para se apoiar em ruído.
  if (cheio.ocupacao < 75 || cheio.ocupacao - vazio.ocupacao < 30) return null;

  // Quanto o dia cheio ainda deixa na mesa por falta de cadeira, por mês.
  const potencial = (cheio.receitaDia / Math.max(1, cheio.ocupacao)) * Math.min(100, cheio.ocupacao + 20) - cheio.receitaDia;
  return {
    tipo: "escala",
    titulo: "Sua equipe está no dia errado",
    detalhe: `${DIAS[vazio.dw]} enche ${vazio.ocupacao}% da agenda e ${DIAS[cheio.dw]} enche ${cheio.ocupacao}% com a mesma equipe. Mover um barbeiro de ${DIAS[vazio.dw]} para ${DIAS[cheio.dw]} rende sem contratar ninguém.`,
    valorMes: Math.max(0, Math.round(potencial * 4.3)),
  };
}

/**
 * PREÇO POR BARBEIRO.
 *
 * Nota alta com agenda lotada é o retrato de quem está barato. Salão de alto
 * padrão cobra diferente por profissional há décadas; barbearia não cobra
 * porque não tem o número na mão.
 */
export async function barbeiroSubvalorizado(barbershopId: string): Promise<Oportunidade | null> {
  const desde = addUtcDays(startOfUtcDay(new Date()), -56);
  const [equipe, horarios] = await Promise.all([
    prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } }),
    prisma.workingHour.findMany({ where: { barbershopId, isOpen: true } }),
  ]);
  if (equipe.length === 0 || horarios.length === 0) return null;

  const capacidadeSemana = horarios.reduce(
    (s: number, h: (typeof horarios)[number]) => s + Math.max(0, minutos(h.closeTime) - minutos(h.openTime)),
    0,
  );
  if (capacidadeSemana === 0) return null;

  const [appts, avaliacoes] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: desde }, status: "COMPLETED" },
      select: { staffId: true, startTime: true, endTime: true, totalPrice: true },
    }),
    prisma.review.groupBy({ by: ["staffId"], where: { barbershopId }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const nota = new Map<string, { media: number; qtd: number }>();
  for (const r of avaliacoes as { staffId: string | null; _avg: { rating: number | null }; _count: { _all: number } }[]) {
    if (r.staffId && r._avg.rating != null) nota.set(r.staffId, { media: r._avg.rating, qtd: r._count._all });
  }

  let melhor: Oportunidade | null = null;
  for (const s of equipe as { id: string; name: string }[]) {
    const meus = (appts as { staffId: string | null; startTime: string; endTime: string; totalPrice: number }[]).filter((a) => a.staffId === s.id);
    if (meus.length < 20) continue;
    const vendidos = meus.reduce((acc, a) => acc + Math.max(0, minutos(a.endTime) - minutos(a.startTime)), 0);
    const ocupacao = Math.round((vendidos / (capacidadeSemana * 8)) * 100);
    const n = nota.get(s.id);
    if (ocupacao < 80) continue;
    if (!n || n.qtd < 5 || n.media < 4.5) continue;

    const receita8sem = meus.reduce((acc, a) => acc + a.totalPrice, 0);
    // 10% é o degrau que a literatura de preço trata como quase indolor em
    // serviço com fila. Aqui é sugestão, não mudança automática.
    const ganhoMes = (receita8sem / 8) * 4.3 * 0.1;
    if (!melhor || ganhoMes > melhor.valorMes) {
      melhor = {
        tipo: "preco_barbeiro",
        titulo: `${s.name.split(" ")[0]} está barato`,
        detalhe: `Ele está com ${ocupacao}% de ocupação e nota ${n.media.toFixed(1).replace(".", ",")}. Quem tem fila e nota alta suporta preço maior. Um aumento de 10% só no atendimento dele mantém a agenda cheia.`,
        valorMes: Math.round(ganhoMes),
      };
    }
  }
  return melhor;
}

/**
 * PREÇO POR HORÁRIO.
 *
 * A faixa de horário que nunca enche é cadeira perecível, igual poltrona de
 * avião. Um desconto ali não canibaliza o horário nobre, que já lota.
 */
export async function horarioMorto(barbershopId: string): Promise<Oportunidade | null> {
  const desde = addUtcDays(startOfUtcDay(new Date()), -56);
  const [appts, horarios, barbeiros] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: desde }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { date: true, startTime: true, totalPrice: true },
    }),
    prisma.workingHour.findMany({ where: { barbershopId, isOpen: true } }),
    prisma.staff.count({ where: { barbershopId, isActive: true } }),
  ]);
  if (appts.length < 40 || horarios.length === 0 || barbeiros === 0) return null;

  // Conta por (dia da semana, hora cheia).
  const balde = new Map<string, number>();
  for (const a of appts as { date: Date; startTime: string; totalPrice: number }[]) {
    const chave = `${a.date.getUTCDay()}|${a.startTime.slice(0, 2)}`;
    balde.set(chave, (balde.get(chave) ?? 0) + 1);
  }

  const semanas = 8;
  let pior: { dw: number; hora: string; porSemana: number } | null = null;
  for (const hh of horarios as { dayOfWeek: number; openTime: string; closeTime: string }[]) {
    const ini = Math.floor(minutos(hh.openTime) / 60);
    const fim = Math.floor(minutos(hh.closeTime) / 60);
    for (let h = ini; h < fim; h++) {
      const hora = String(h).padStart(2, "0");
      const porSemana = (balde.get(`${hh.dayOfWeek}|${hora}`) ?? 0) / semanas;
      // Capacidade daquela hora é 1 atendimento por barbeiro, grosso modo.
      if (porSemana > barbeiros * 0.3) continue;
      if (!pior || porSemana < pior.porSemana) pior = { dw: hh.dayOfWeek, hora, porSemana };
    }
  }
  if (!pior) return null;

  const ticket = appts.reduce((s: number, a: { totalPrice: number }) => s + a.totalPrice, 0) / appts.length;
  // Encher metade da capacidade ociosa daquela hora, com 15% de desconto.
  const ganhoMes = Math.max(0, barbeiros - pior.porSemana) * 0.5 * ticket * 0.85 * 4.3;
  return {
    tipo: "preco_horario",
    titulo: `${DIAS[pior.dw]} às ${pior.hora}h vive vazia`,
    detalhe: `Essa faixa recebe menos de um atendimento por semana. Um desconto só ali enche cadeira que hoje não rende nada, sem tirar cliente do horário nobre, que já lota.`,
    valorMes: Math.round(ganhoMes),
  };
}

/** Tudo junto, do que vale mais para o que vale menos. */
export async function oportunidadesDeGestao(barbershopId: string): Promise<Oportunidade[]> {
  const [escala, barbeiro, horario] = await Promise.all([
    desequilibrioDeEscala(barbershopId).catch(() => null),
    barbeiroSubvalorizado(barbershopId).catch(() => null),
    horarioMorto(barbershopId).catch(() => null),
  ]);
  return [escala, barbeiro, horario].filter((o): o is Oportunidade => !!o && o.valorMes > 0).sort((a, b) => b.valorMes - a.valorMes);
}
