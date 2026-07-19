import { prisma } from "@/lib/db";
import { startOfUtcDay, addUtcDays, startOfUtcMonth } from "@/lib/dateRange";
import { shopNow, timeToMinutes } from "@/lib/scheduling";
import { revenueSummary, churnedClients, emptySlotsToday, lowStock, busyDays } from "./insights";

// The "10 segundos que valem horas ou dias" engine — heavier analytics the
// Copiloto exposes as tools: revenue-leak audit, month close, agenda gap
// finder, decision simulator, weekly-schedule suggester and cashbox close.
// All deterministic (zero AI): plain queries the AI narrates. Buildable and
// testable before any Anthropic key.

const OCCUPYING = ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"];

/**
 * "Onde estou perdendo dinheiro?" — one report that aggregates every leak:
 * clientes sumidos, no-shows do mês, horários vazios hoje e estoque parado,
 * com um total estimado de R$ escapando + as ações que tapam cada buraco.
 */
export async function revenueLeak(barbershopId: string) {
  const startMonth = startOfUtcMonth(new Date());
  const [rev, churned, empty, stock, noShowRows] = await Promise.all([
    revenueSummary(barbershopId),
    churnedClients(barbershopId),
    emptySlotsToday(barbershopId),
    lowStock(barbershopId),
    prisma.appointment.findMany({ where: { barbershopId, status: "NO_SHOW", date: { gte: startMonth } }, select: { totalPrice: true } }),
  ]);

  const avgTicket = rev.avgTicket || 0;
  type P = { totalPrice: number };
  const noShowLost = (noShowRows as P[]).reduce((s: number, a: P) => s + a.totalPrice, 0);
  const noShowCount = noShowRows.length;

  const churnPotential = Math.round(churned.length * avgTicket); // um retorno por sumido
  const emptyPotential = Math.round(empty.totalFree * avgTicket); // se cada buraco virasse corte
  const stockCount = stock.length;

  const totalLeak = Math.round(churnPotential + noShowLost + emptyPotential);

  return {
    totalLeak,
    avgTicket,
    breakdown: [
      { id: "churn", label: "Clientes sumidos", count: churned.length, value: churnPotential, action: "winback_churned", tip: "Chamar de volta quem tem conta." },
      { id: "noshow", label: "No-shows do mês", count: noShowCount, value: Math.round(noShowLost), action: null, tip: "Confirme amanhã e cobre sinal dos faltantes." },
      { id: "empty", label: "Horários vazios hoje", count: empty.totalFree, value: emptyPotential, action: "notify_waitlist", tip: "Avise a fila de espera / sumidos." },
      { id: "stock", label: "Produtos parados/acabando", count: stockCount, value: 0, action: null, tip: "Reponha os que acabaram; queime os encalhados." },
    ].filter((b) => b.count > 0),
  };
}

/**
 * "Fecha o meu mês" — fechamento financeiro completo em 10s: faturamento,
 * comissão de CADA barbeiro, receitas/despesas manuais, gorjetas, imposto
 * estimado (ISS) e o lucro. Horas de planilha viram um comando.
 */
export async function closeMonth(barbershopId: string, monthOffset = 0) {
  const now = new Date();
  const start = startOfUtcMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1)));
  const end = startOfUtcMonth(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)));

  const [shop, appts, staff, txs, tips] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { issRate: true, monthlyGoal: true } }),
    prisma.appointment.findMany({ where: { barbershopId, status: "COMPLETED", date: { gte: start, lt: end } }, select: { staffId: true, totalPrice: true } }),
    prisma.staff.findMany({ where: { barbershopId }, select: { id: true, name: true, commissionRate: true } }),
    prisma.financialTransaction.findMany({ where: { barbershopId, date: { gte: start, lt: end } }, select: { type: true, amount: true } }),
    prisma.tip.findMany({ where: { barbershopId, createdAt: { gte: start, lt: end } }, select: { amount: true } }),
  ]);

  type A = { staffId: string; totalPrice: number };
  const grossRevenue = (appts as A[]).reduce((s, a) => s + a.totalPrice, 0);
  const count = appts.length;

  const revByStaff = new Map<string, number>();
  for (const a of appts as A[]) revByStaff.set(a.staffId, (revByStaff.get(a.staffId) ?? 0) + a.totalPrice);
  type S = { id: string; name: string; commissionRate: number };
  const perBarber = (staff as S[])
    .map((s) => {
      const revenue = revByStaff.get(s.id) ?? 0;
      return { name: s.name, revenue: Math.round(revenue), rate: s.commissionRate, commission: Math.round(revenue * s.commissionRate) };
    })
    .filter((b) => b.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const totalCommission = perBarber.reduce((s, b) => s + b.commission, 0);

  type T = { type: string; amount: number };
  const manualIncome = (txs as T[]).filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenses = (txs as T[]).filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const tipTotal = (tips as { amount: number }[]).reduce((s, t) => s + t.amount, 0);

  const issRate = shop?.issRate ?? null;
  const taxEstimate = issRate ? Math.round((grossRevenue * issRate) / 100) : null;
  const profit = Math.round(grossRevenue + manualIncome - expenses - totalCommission - (taxEstimate ?? 0));

  const label = `${String(start.getUTCMonth() + 1).padStart(2, "0")}/${start.getUTCFullYear()}`;
  return {
    month: label,
    grossRevenue: Math.round(grossRevenue),
    appointments: count,
    manualIncome: Math.round(manualIncome),
    expenses: Math.round(expenses),
    totalCommission,
    tips: Math.round(tipTotal),
    issRate,
    taxEstimate,
    profit,
    perBarber,
    goal: shop?.monthlyGoal ?? null,
  };
}

/**
 * "Otimiza minha agenda" — acha os buracos (tempo morto) entre atendimentos de
 * cada barbeiro num dia, some quanto está parado e estime quanto isso custa.
 * Ninguém faz isso na mão.
 */
export async function agendaGaps(barbershopId: string, dateKey?: string, minGap = 20) {
  const dk = dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : shopNow().dateKey;
  const dayStart = new Date(dk);
  const dayEnd = addUtcDays(dayStart, 1);
  const [staff, rev] = await Promise.all([
    prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } }),
    revenueSummary(barbershopId),
  ]);
  const avgTicket = rev.avgTicket || 0;

  type St = { id: string; name: string };
  const perStaff: { name: string; gaps: { from: string; to: string; minutes: number }[]; deadMinutes: number }[] = [];
  let totalDead = 0;
  for (const st of staff as St[]) {
    const appts = await prisma.appointment.findMany({
      where: { barbershopId, staffId: st.id, status: { in: OCCUPYING }, date: { gte: dayStart, lt: dayEnd } },
      orderBy: { startTime: "asc" },
      select: { startTime: true, endTime: true },
    });
    type Ap = { startTime: string; endTime: string };
    const list = appts as Ap[];
    if (list.length < 2) continue;
    const gaps: { from: string; to: string; minutes: number }[] = [];
    let dead = 0;
    for (let i = 1; i < list.length; i++) {
      const gap = timeToMinutes(list[i].startTime) - timeToMinutes(list[i - 1].endTime);
      if (gap >= minGap) {
        gaps.push({ from: list[i - 1].endTime, to: list[i].startTime, minutes: gap });
        dead += gap;
      }
    }
    if (gaps.length) {
      perStaff.push({ name: st.name, gaps, deadMinutes: dead });
      totalDead += dead;
    }
  }
  // Um corte médio ~40min; cada bloco morto poderia caber um atendimento.
  const estLost = Math.round((totalDead / 40) * avgTicket);
  return { dateKey: dk, totalDeadMinutes: totalDead, estimatedLost: estLost, perStaff };
}

/**
 * "E se...?" — simula uma decisão antes de arriscar. type:
 *  - "price": {pct} muda o preço em % (serviço específico ou todos) → impacto no mês/ano.
 *  - "hire": adiciona 1 barbeiro → receita potencial na mesma utilização.
 */
export async function simulateDecision(barbershopId: string, input: { type: string; pct?: number; serviceName?: string }) {
  const startMonth = startOfUtcMonth(new Date());
  if (input.type === "price") {
    const pct = Number(input.pct);
    if (!Number.isFinite(pct)) return { error: "Informe a variação de preço em % (ex: 10)." };
    const where: Record<string, unknown> = { barbershopId, status: "COMPLETED", date: { gte: startMonth } };
    let scope = "todos os serviços";
    if (input.serviceName) {
      const svc = await prisma.service.findFirst({ where: { barbershopId, name: { contains: input.serviceName } }, select: { id: true, name: true } });
      if (svc) { where.serviceId = svc.id; scope = svc.name; }
    }
    const rows = await prisma.appointment.findMany({ where, select: { totalPrice: true } });
    const monthRevenue = (rows as { totalPrice: number }[]).reduce((s, a) => s + a.totalPrice, 0);
    const monthDelta = Math.round((monthRevenue * pct) / 100);
    return {
      type: "price",
      scope,
      pct,
      currentMonthRevenue: Math.round(monthRevenue),
      projectedMonthRevenue: Math.round(monthRevenue + monthDelta),
      monthDelta,
      yearDelta: monthDelta * 12,
      caveat: "Assume o mesmo volume de clientes. Aumentos grandes podem reduzir a procura.",
    };
  }
  if (input.type === "hire") {
    const [staff, rows] = await Promise.all([
      prisma.staff.count({ where: { barbershopId, isActive: true } }),
      prisma.appointment.findMany({ where: { barbershopId, status: "COMPLETED", date: { gte: startMonth } }, select: { totalPrice: true } }),
    ]);
    const monthRevenue = (rows as { totalPrice: number }[]).reduce((s, a) => s + a.totalPrice, 0);
    const perBarber = staff > 0 ? monthRevenue / staff : 0;
    return {
      type: "hire",
      currentBarbers: staff,
      avgRevenuePerBarber: Math.round(perBarber),
      potentialExtraMonth: Math.round(perBarber),
      potentialExtraYear: Math.round(perBarber * 12),
      caveat: "Potencial na MESMA ocupação média por barbeiro. Um novo profissional leva semanas pra encher a agenda.",
    };
  }
  return { error: "Tipo inválido. Use 'price' ou 'hire'." };
}

/**
 * "Monta a escala da semana" — recomenda quantos barbeiros por dia com base na
 * demanda dos últimos 90 dias, pra não sobrar equipe no dia fraco nem faltar no
 * pico.
 */
export async function suggestSchedule(barbershopId: string) {
  const [days, staffCount] = await Promise.all([
    busyDays(barbershopId),
    prisma.staff.count({ where: { barbershopId, isActive: true } }),
  ]);
  const total = days.ranked.reduce((s, d) => s + d.count, 0) || 1;
  const recommendation = days.ranked
    .slice()
    .sort((a, b) => ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"].indexOf(a.day) - ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"].indexOf(b.day))
    .map((d) => {
      const share = d.count / total;
      // proporcional à demanda, no mínimo 1 quando há movimento
      let recommend = Math.max(d.count > 0 ? 1 : 0, Math.round(share * 7 * staffCount / 1));
      recommend = Math.min(recommend, staffCount);
      return { day: d.day, demand: d.count, recommendBarbers: recommend };
    });
  return { staffCount, busiest: days.busiest, quietest: days.quietest, recommendation };
}

/**
 * "Qual serviço realmente dá lucro?" — margem por serviço, não faturamento.
 *
 * É a pergunta que o sistema não conseguia responder: sem o custo, o campeão
 * de vendas parecia o campeão de lucro. Aqui entram volume, receita, custo
 * direto, comissão paga e a margem que sobra de fato.
 */
export async function serviceMargins(barbershopId: string) {
  const startMonth = startOfUtcMonth(new Date());
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, status: "COMPLETED", date: { gte: startMonth } },
    select: { totalPrice: true, serviceId: true, service: { select: { name: true, cost: true, duration: true } }, staff: { select: { commissionRate: true } } },
  });
  type A = { totalPrice: number; serviceId: string; service: { name: string; cost: number; duration: number } | null; staff: { commissionRate: number } | null };

  const per = new Map<string, { name: string; count: number; revenue: number; cost: number; commission: number; minutes: number }>();
  for (const a of appts as A[]) {
    if (!a.service) continue;
    const cur = per.get(a.serviceId) ?? { name: a.service.name, count: 0, revenue: 0, cost: 0, commission: 0, minutes: 0 };
    cur.count += 1;
    cur.revenue += a.totalPrice;
    cur.cost += a.service.cost;
    cur.commission += a.totalPrice * (a.staff?.commissionRate ?? 0);
    cur.minutes += a.service.duration;
    per.set(a.serviceId, cur);
  }

  const rows = [...per.values()].map((s) => {
    const profit = s.revenue - s.cost - s.commission;
    return {
      name: s.name,
      count: s.count,
      revenue: Math.round(s.revenue),
      cost: Math.round(s.cost),
      commission: Math.round(s.commission),
      profit: Math.round(profit),
      marginPercent: s.revenue > 0 ? Math.round((profit / s.revenue) * 100) : 0,
      // Lucro por hora de cadeira: um serviço de margem alta que ocupa a
      // cadeira o dobro do tempo pode render menos que outro mais simples.
      profitPerHour: s.minutes > 0 ? Math.round((profit / s.minutes) * 60) : 0,
    };
  });

  const byProfit = [...rows].sort((a, b) => b.profit - a.profit);
  const byVolume = [...rows].sort((a, b) => b.count - a.count);
  const byHour = [...rows].sort((a, b) => b.profitPerHour - a.profitPerHour);
  const costsFilled = rows.some((r) => r.cost > 0);

  return {
    services: byProfit,
    mostProfitable: byProfit[0] ?? null,
    mostSold: byVolume[0] ?? null,
    bestPerHour: byHour[0] ?? null,
    worstMargin: rows.length > 1 ? [...rows].sort((a, b) => a.marginPercent - b.marginPercent)[0] : null,
    // Avisa quando ninguém preencheu custo — senão a margem parece ótima só
    // porque o custo está zerado, e o gestor tomaria decisão com número falso.
    costsFilled,
    warning: costsFilled ? null : "Nenhum serviço tem custo cadastrado, então a margem está igual ao faturamento menos comissão. Preencha o custo em Serviços para o número ficar real.",
  };
}

/**
 * "Responde as avaliações" — nota média, distribuição e as avaliações recentes
 * (com comentário) que valem uma resposta. O Copiloto usa isso pra redigir a
 * resposta de cada uma na voz da barbearia.
 */
export async function reputationSummary(barbershopId: string, limit = 8) {
  const reviews = await prisma.review.findMany({
    where: { staff: { barbershopId } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { rating: true, comment: true, createdAt: true, client: { select: { name: true } }, staff: { select: { name: true } } },
  });
  type R = { rating: number; comment: string | null; createdAt: Date; client: { name: string } | null; staff: { name: string } | null };
  const list = reviews as R[];
  const count = list.length;
  const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : null;
  const dist = [0, 0, 0, 0, 0]; // índice 0 = 1★ ... 4 = 5★
  for (const r of list) if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
  const recent = list
    .filter((r) => r.comment && r.comment.trim())
    .slice(0, limit)
    .map((r) => ({ rating: r.rating, comment: r.comment, client: r.client?.name ?? "Cliente", staff: r.staff?.name ?? "", date: r.createdAt.toISOString().slice(0, 10) }));
  return { avg: avg ? Math.round(avg * 10) / 10 : null, count, distribution: { "5": dist[4], "4": dist[3], "3": dist[2], "2": dist[1], "1": dist[0] }, recent };
}

/**
 * "Fecha o caixa do dia" — bate o dinheiro/cartão/pix informado com o que os
 * atendimentos concluídos hoje somam, e aponta divergência.
 */
export async function closeCashbox(barbershopId: string, input: { cash?: number; card?: number; pix?: number }) {
  const dk = shopNow().dateKey;
  const dayStart = new Date(dk);
  const dayEnd = addUtcDays(dayStart, 1);
  const rows = await prisma.appointment.findMany({
    where: { barbershopId, status: "COMPLETED", date: { gte: dayStart, lt: dayEnd } },
    select: { totalPrice: true },
  });
  const expected = (rows as { totalPrice: number }[]).reduce((s, a) => s + a.totalPrice, 0);
  const cash = Number(input.cash) || 0;
  const card = Number(input.card) || 0;
  const pix = Number(input.pix) || 0;
  const reported = cash + card + pix;
  const diff = Math.round((reported - expected) * 100) / 100;
  return {
    dateKey: dk,
    appointments: rows.length,
    expected: Math.round(expected),
    reported: Math.round(reported),
    breakdown: { cash, card, pix },
    difference: diff,
    status: Math.abs(diff) < 1 ? "ok" : diff > 0 ? "sobra" : "falta",
  };
}
