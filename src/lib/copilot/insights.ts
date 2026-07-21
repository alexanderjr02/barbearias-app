import { prisma } from "@/lib/db";
import { startOfUtcDay, addUtcDays, startOfUtcMonth } from "@/lib/dateRange";
import { buildDaySlots, shopNow } from "@/lib/scheduling";

// The deterministic business-intelligence layer behind the Copiloto. Every
// function here works with ZERO AI — it's plain queries over the shop's own
// data. The AI copilot (chatbot/copilot.ts) simply wraps these as tools, and
// the briefing endpoint composes them. This keeps the whole feature usable and
// testable before any Anthropic key is configured.

function dateKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const money = (n: number) => `R$ ${n.toFixed(2)}`;

export async function revenueSummary(barbershopId: string) {
  const now = new Date();
  const startToday = startOfUtcDay(now);
  const startWeek = addUtcDays(startToday, -6); // rolling 7 days incl. today
  const startPrevWeek = addUtcDays(startToday, -13);
  const startMonth = startOfUtcMonth(now);

  const completed = await prisma.appointment.findMany({
    where: { barbershopId, status: "COMPLETED", date: { gte: startPrevWeek } },
    select: { totalPrice: true, date: true },
  });
  type Row = (typeof completed)[number];
  const sumBetween = (from: Date, to: Date) =>
    completed.filter((a: Row) => a.date >= from && a.date < to).reduce((s: number, a: Row) => s + a.totalPrice, 0);

  const endToday = addUtcDays(startToday, 1);
  const thisWeek = sumBetween(startWeek, endToday);
  const prevWeek = sumBetween(startPrevWeek, startWeek);

  const monthRows = await prisma.appointment.findMany({
    where: { barbershopId, status: "COMPLETED", date: { gte: startMonth } },
    select: { totalPrice: true },
  });
  const monthRevenue = monthRows.reduce((s: number, a: { totalPrice: number }) => s + a.totalPrice, 0);
  const avgTicket = monthRows.length ? monthRevenue / monthRows.length : 0;
  const delta = prevWeek > 0 ? ((thisWeek - prevWeek) / prevWeek) * 100 : null;

  return {
    today: sumBetween(startToday, endToday),
    thisWeek,
    prevWeek,
    weekDeltaPercent: delta,
    monthRevenue,
    monthCount: monthRows.length,
    avgTicket,
  };
}

export interface ChurnedClient {
  clientId: string | null;
  name: string;
  phone: string;
  lastVisit: string;
  daysSince: number;
  visits: number;
}

export async function churnedClients(barbershopId: string, days = 45, limit = 25): Promise<ChurnedClient[]> {
  const now = new Date();
  const startToday = startOfUtcDay(now);
  const cutoff = addUtcDays(startToday, -days);

  const appts = await prisma.appointment.findMany({
    where: { barbershopId },
    select: { clientId: true, clientName: true, clientPhone: true, date: true, status: true },
    orderBy: { date: "desc" },
  });
  type Row = (typeof appts)[number];

  const byKey = new Map<string, { clientId: string | null; name: string; phone: string; lastCompleted: Date | null; visits: number; hasUpcoming: boolean }>();
  for (const a of appts) {
    const key = a.clientId ?? a.clientPhone ?? a.clientName;
    if (!key) continue;
    const cur = byKey.get(key) ?? { clientId: a.clientId, name: a.clientName, phone: a.clientPhone, lastCompleted: null, visits: 0, hasUpcoming: false };
    if (a.status === "COMPLETED") {
      cur.visits += 1;
      if (!cur.lastCompleted || a.date > cur.lastCompleted) cur.lastCompleted = a.date;
    }
    if (a.date >= startToday && ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"].includes(a.status)) cur.hasUpcoming = true;
    byKey.set(key, cur);
  }

  const out: ChurnedClient[] = [];
  for (const c of byKey.values()) {
    if (!c.lastCompleted || c.hasUpcoming) continue;
    if (c.lastCompleted >= cutoff) continue;
    const daysSince = Math.floor((startToday.getTime() - c.lastCompleted.getTime()) / 86400000);
    out.push({ clientId: c.clientId, name: c.name, phone: c.phone, lastVisit: dateKeyOf(c.lastCompleted), daysSince, visits: c.visits });
  }
  out.sort((a, b) => b.visits - a.visits || a.daysSince - b.daysSince);
  return out.slice(0, limit);
}

// Horários livres nos próximos `days` dias (a "capacidade parada" da semana).
// É o gatilho da campanha "encher a semana": dinheiro parado que dá pra
// converter em agendamento.
export async function emptySlotsThisWeek(barbershopId: string, days = 6): Promise<{ days: number; totalFree: number }> {
  const now = shopNow();
  const staff = await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true } });
  type StaffRow = (typeof staff)[number];
  const base = new Date(`${now.dateKey}T00:00:00.000Z`);
  let totalFree = 0;
  for (let i = 0; i < days; i++) {
    const dateKey = dateKeyOf(addUtcDays(base, i));
    for (const st of staff as StaffRow[]) {
      const { slots } = await buildDaySlots({ barbershopId, staffId: st.id, dateKey, durationMinutes: 30 });
      totalFree += slots.filter((s) => s.status === "available").length;
    }
  }
  return { days, totalFree };
}

export async function emptySlotsToday(barbershopId: string) {
  const now = shopNow();
  const staff = await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
  type StaffRow = (typeof staff)[number];
  const perStaff: { staffId: string; name: string; free: string[] }[] = [];
  let totalFree = 0;
  for (const st of staff as StaffRow[]) {
    const { slots } = await buildDaySlots({ barbershopId, staffId: st.id, dateKey: now.dateKey, durationMinutes: 30 });
    const free = slots.filter((s) => s.status === "available").map((s) => s.time);
    totalFree += free.length;
    if (free.length) perStaff.push({ staffId: st.id, name: st.name, free });
  }
  return { dateKey: now.dateKey, totalFree, perStaff };
}

export async function topClients(barbershopId: string, limit = 10) {
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, status: "COMPLETED" },
    select: { clientId: true, clientName: true, clientPhone: true, totalPrice: true, date: true },
  });
  type Row = (typeof appts)[number];
  const byKey = new Map<string, { name: string; visits: number; spent: number; last: Date }>();
  for (const a of appts) {
    const key = a.clientId ?? a.clientPhone ?? a.clientName;
    if (!key) continue;
    const cur = byKey.get(key) ?? { name: a.clientName, visits: 0, spent: 0, last: a.date };
    cur.visits += 1;
    cur.spent += a.totalPrice;
    if (a.date > cur.last) cur.last = a.date;
    byKey.set(key, cur);
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.spent - a.spent)
    .slice(0, limit)
    .map((c) => ({ name: c.name, visits: c.visits, spent: c.spent, lastVisit: dateKeyOf(c.last) }));
}

export async function barberLeaderboard(barbershopId: string) {
  const startMonth = startOfUtcMonth(new Date());
  const [appts, staff, reviews] = await Promise.all([
    prisma.appointment.findMany({ where: { barbershopId, status: "COMPLETED", date: { gte: startMonth } }, select: { staffId: true, totalPrice: true } }),
    prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true, commissionRate: true } }),
    prisma.review.groupBy({ by: ["staffId"], _avg: { rating: true }, _count: { rating: true } }),
  ]);
  type ApptRow = (typeof appts)[number];
  const revByStaff = new Map<string, { revenue: number; count: number }>();
  for (const a of appts as ApptRow[]) {
    const cur = revByStaff.get(a.staffId) ?? { revenue: 0, count: 0 };
    cur.revenue += a.totalPrice;
    cur.count += 1;
    revByStaff.set(a.staffId, cur);
  }
  const ratingByStaff = new Map<string, { avg: number | null; count: number }>();
  for (const r of reviews as { staffId: string; _avg: { rating: number | null }; _count: { rating: number } }[]) {
    ratingByStaff.set(r.staffId, { avg: r._avg.rating, count: r._count.rating });
  }
  type StaffRow = (typeof staff)[number];
  return (staff as StaffRow[])
    .map((s) => {
      const rev = revByStaff.get(s.id) ?? { revenue: 0, count: 0 };
      const rt = ratingByStaff.get(s.id) ?? { avg: null, count: 0 };
      return { name: s.name, revenue: rev.revenue, count: rev.count, commission: rev.revenue * s.commissionRate, avgRating: rt.avg, ratingCount: rt.count };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function lowStock(barbershopId: string) {
  const products = await prisma.product.findMany({
    where: { barbershopId, isActive: true },
    select: { name: true, quantity: true, minQuantity: true },
  });
  type Row = (typeof products)[number];
  return (products as Row[])
    .filter((p) => p.quantity <= p.minQuantity)
    .map((p) => ({ name: p.name, quantity: p.quantity, minQuantity: p.minQuantity }));
}

export async function tomorrowAppointments(barbershopId: string) {
  const startTomorrow = addUtcDays(startOfUtcDay(new Date()), 1);
  const endTomorrow = addUtcDays(startTomorrow, 1);
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, date: { gte: startTomorrow, lt: endTomorrow }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    select: { id: true, startTime: true, status: true, clientName: true, clientId: true, staff: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });
  type Row = (typeof appts)[number];
  const list = (appts as Row[]).map((a) => ({ id: a.id, startTime: a.startTime, status: a.status, clientName: a.clientName, clientId: a.clientId, staffName: a.staff.name }));
  return { total: list.length, unconfirmed: list.filter((a) => a.status === "SCHEDULED").length, list };
}

// ---- Predictive / diagnostic ----

const onlyDigits8 = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").slice(-8);

/** Tomorrow's appointments whose client has a history of no-shows. */
export async function noShowRisk(barbershopId: string) {
  const startTomorrow = addUtcDays(startOfUtcDay(new Date()), 1);
  const endTomorrow = addUtcDays(startTomorrow, 1);
  const [tomorrow, noShows] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: startTomorrow, lt: endTomorrow }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      select: { clientName: true, clientPhone: true, startTime: true, staff: { select: { name: true } } },
    }),
    prisma.appointment.findMany({ where: { barbershopId, status: "NO_SHOW" }, select: { clientPhone: true } }),
  ]);
  const counts = new Map<string, number>();
  for (const n of noShows as { clientPhone: string }[]) {
    const k = onlyDigits8(n.clientPhone);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  type T = { clientName: string; clientPhone: string; startTime: string; staff: { name: string } | null };
  return (tomorrow as T[])
    .map((a) => ({ clientName: a.clientName, startTime: a.startTime, staff: a.staff?.name ?? "barbeiro", pastNoShows: counts.get(onlyDigits8(a.clientPhone)) ?? 0 }))
    .filter((x) => x.pastNoShows > 0)
    .sort((a, b) => b.pastNoShows - a.pastNoShows);
}

/** Clients overdue vs their own visit cadence — about to lapse (but not yet churned). */
export async function churnRisk(barbershopId: string, limit = 15) {
  const startToday = startOfUtcDay(new Date());
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, status: "COMPLETED" },
    select: { clientId: true, clientName: true, clientPhone: true, date: true },
    orderBy: { date: "asc" },
  });
  type A = { clientId: string | null; clientName: string; clientPhone: string; date: Date };
  const byKey = new Map<string, { name: string; dates: Date[] }>();
  for (const a of appts as A[]) {
    const k = a.clientId ?? a.clientPhone ?? a.clientName;
    if (!k) continue;
    const cur = byKey.get(k) ?? { name: a.clientName, dates: [] };
    cur.dates.push(a.date);
    byKey.set(k, cur);
  }
  const out: { name: string; daysSince: number; avgCadence: number; visits: number }[] = [];
  for (const c of byKey.values()) {
    if (c.dates.length < 2) continue;
    let gapSum = 0;
    for (let i = 1; i < c.dates.length; i++) gapSum += (c.dates[i].getTime() - c.dates[i - 1].getTime()) / 86400000;
    const avg = gapSum / (c.dates.length - 1);
    if (avg <= 0) continue;
    const last = c.dates[c.dates.length - 1];
    const daysSince = Math.floor((startToday.getTime() - last.getTime()) / 86400000);
    if (daysSince >= avg * 1.3 && daysSince < 45) out.push({ name: c.name, daysSince, avgCadence: Math.round(avg), visits: c.dates.length });
  }
  out.sort((a, b) => b.daysSince / b.avgCadence - a.daysSince / a.avgCadence);
  return out.slice(0, limit);
}

/** Appointment volume by weekday over the last 90 days. */
export async function busyDays(barbershopId: string) {
  const since = addUtcDays(startOfUtcDay(new Date()), -90);
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, status: { in: ["COMPLETED", "SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"] }, date: { gte: since } },
    select: { date: true },
  });
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const a of appts as { date: Date }[]) counts[a.date.getUTCDay()]++;
  const ranked = counts.map((c, i) => ({ day: names[i], count: c })).sort((a, b) => b.count - a.count);
  return { ranked, busiest: ranked[0], quietest: ranked[ranked.length - 1] };
}

/** Compares the last 7 days with the previous 7 and finds the biggest drag. */
export async function diagnose(barbershopId: string) {
  const startToday = startOfUtcDay(new Date());
  const endToday = addUtcDays(startToday, 1);
  const startWeek = addUtcDays(startToday, -6);
  const startPrev = addUtcDays(startToday, -13);
  type A = { totalPrice: number; staff: { name: string } };
  const [thisW, prevW, noShows, timeOffs] = await Promise.all([
    prisma.appointment.findMany({ where: { barbershopId, status: "COMPLETED", date: { gte: startWeek, lt: endToday } }, select: { totalPrice: true, staff: { select: { name: true } } } }),
    prisma.appointment.findMany({ where: { barbershopId, status: "COMPLETED", date: { gte: startPrev, lt: startWeek } }, select: { totalPrice: true, staff: { select: { name: true } } } }),
    prisma.appointment.count({ where: { barbershopId, status: "NO_SHOW", date: { gte: startWeek, lt: endToday } } }),
    prisma.staffTimeOff.count({ where: { staff: { barbershopId }, date: { gte: startWeek, lt: endToday } } }),
  ]);
  const sum = (arr: A[]) => arr.reduce((s: number, a: A) => s + a.totalPrice, 0);
  const thisRev = sum(thisW as A[]);
  const prevRev = sum(prevW as A[]);
  const perThis = new Map<string, number>();
  const perPrev = new Map<string, number>();
  for (const a of thisW as A[]) perThis.set(a.staff.name, (perThis.get(a.staff.name) ?? 0) + a.totalPrice);
  for (const a of prevW as A[]) perPrev.set(a.staff.name, (perPrev.get(a.staff.name) ?? 0) + a.totalPrice);
  const barberDeltas = [...new Set([...perThis.keys(), ...perPrev.keys()])]
    .map((n) => ({ name: n, delta: (perThis.get(n) ?? 0) - (perPrev.get(n) ?? 0) }))
    .sort((a, b) => a.delta - b.delta);
  return {
    thisRev,
    prevRev,
    delta: thisRev - prevRev,
    deltaPercent: prevRev > 0 ? ((thisRev - prevRev) / prevRev) * 100 : null,
    thisCount: (thisW as A[]).length,
    prevCount: (prevW as A[]).length,
    noShows,
    timeOffs,
    worstBarber: barberDeltas[0] ?? null,
  };
}

/** Monthly revenue goal progress + what's needed per remaining day. */
export async function goalProgress(barbershopId: string) {
  const [shop, rows] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { monthlyGoal: true } }),
    prisma.appointment.findMany({ where: { barbershopId, status: "COMPLETED", date: { gte: startOfUtcMonth(new Date()) } }, select: { totalPrice: true } }),
  ]);
  const revenue = (rows as { totalPrice: number }[]).reduce((s: number, a: { totalPrice: number }) => s + a.totalPrice, 0);
  const now = new Date();
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
  const daysLeft = daysInMonth - now.getUTCDate();
  const goal = shop?.monthlyGoal ?? null;
  return { goal, revenue, percent: goal ? (revenue / goal) * 100 : null, daysLeft, neededPerDay: goal && daysLeft > 0 ? Math.max(0, (goal - revenue) / daysLeft) : null };
}

/** Composes the full gestor briefing — the proactive "bom dia" panel. */
export async function buildBriefing(barbershopId: string) {
  const [revenue, churned, empty, stock, tomorrow] = await Promise.all([
    revenueSummary(barbershopId),
    churnedClients(barbershopId),
    emptySlotsToday(barbershopId),
    lowStock(barbershopId),
    tomorrowAppointments(barbershopId),
  ]);

  const potentialWinback = Math.round(churned.length * (revenue.avgTicket || 0));

  const cards: {
    id: string;
    kind: "revenue" | "churn" | "empty" | "confirm" | "stock";
    icon: string;
    title: string;
    body: string;
    action?: { id: string; label: string };
    count: number;
  }[] = [];

  cards.push({
    id: "revenue",
    kind: "revenue",
    icon: "trending",
    title: "Faturamento da semana",
    body:
      revenue.weekDeltaPercent == null
        ? `${money(revenue.thisWeek)} nos últimos 7 dias.`
        : `${money(revenue.thisWeek)} nos últimos 7 dias (${revenue.weekDeltaPercent >= 0 ? "+" : ""}${revenue.weekDeltaPercent.toFixed(0)}% vs semana anterior).`,
    count: 0,
  });

  if (churned.length > 0) {
    cards.push({
      id: "churn",
      kind: "churn",
      icon: "ghost",
      title: `${churned.length} clientes sumidos`,
      body: `Não voltam há mais de 45 dias — cerca de ${money(potentialWinback)} parados. Quer chamar de volta?`,
      action: { id: "winback_churned", label: "Chamar de volta" },
      count: churned.length,
    });
  }

  if (empty.totalFree > 0) {
    cards.push({
      id: "empty",
      kind: "empty",
      icon: "calendar",
      title: `${empty.totalFree} horários livres hoje`,
      body: empty.perStaff.length ? `Buracos na agenda de ${empty.perStaff.map((s) => s.name.split(" ")[0]).join(", ")}. Avise quem está na fila de espera.` : "Há espaço livre hoje.",
      action: { id: "notify_waitlist", label: "Avisar fila de espera" },
      count: empty.totalFree,
    });
  }

  if (tomorrow.unconfirmed > 0) {
    cards.push({
      id: "confirm",
      kind: "confirm",
      icon: "check",
      title: `${tomorrow.unconfirmed} agendamentos de amanhã sem confirmar`,
      body: "Confirmar agora reduz falta (no-show). Quer confirmar todos?",
      action: { id: "confirm_tomorrow", label: "Confirmar todos" },
      count: tomorrow.unconfirmed,
    });
  }

  if (stock.length > 0) {
    cards.push({
      id: "stock",
      kind: "stock",
      icon: "box",
      title: `${stock.length} produtos acabando`,
      body: stock.map((p) => `${p.name} (${p.quantity})`).join(", "),
      count: stock.length,
    });
  }

  return { cards, revenue, churnedCount: churned.length, emptyToday: empty.totalFree, tomorrowUnconfirmed: tomorrow.unconfirmed, lowStockCount: stock.length };
}
