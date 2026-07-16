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
