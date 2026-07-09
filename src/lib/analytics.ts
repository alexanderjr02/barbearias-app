import { prisma } from "./db";
import { getPlanPricing, PLANS, type PlatformPlan } from "./billing";

const DAY_MS = 24 * 60 * 60 * 1000;

// Real DAU/WAU/MAU from LoginEvent (one row per successful login) — there is
// no fabricated history here: before this feature shipped, no events exist,
// so counts naturally start at 0 and grow from real logins going forward.
export async function getActiveUserCounts() {
  const now = Date.now();
  const [dau, wau, mau] = await Promise.all([
    prisma.loginEvent.findMany({ where: { createdAt: { gte: new Date(now - 1 * DAY_MS) } }, distinct: ["userId"], select: { userId: true } }),
    prisma.loginEvent.findMany({ where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } }, distinct: ["userId"], select: { userId: true } }),
    prisma.loginEvent.findMany({ where: { createdAt: { gte: new Date(now - 30 * DAY_MS) } }, distinct: ["userId"], select: { userId: true } }),
  ]);
  return { dau: dau.length, wau: wau.length, mau: mau.length };
}

export async function getDailyActiveTrend(days = 14) {
  const now = new Date();
  const from = new Date(now.getTime() - days * DAY_MS);
  const events = await prisma.loginEvent.findMany({ where: { createdAt: { gte: from } }, select: { userId: true, createdAt: true } });

  const buckets: { key: string; label: string; users: Set<string> }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), users: new Set() });
  }
  for (const ev of events) {
    const key = ev.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.users.add(ev.userId);
  }

  return buckets.map((b) => ({ label: b.label, activeUsers: b.users.size }));
}

// Real usage of the (rule-based, no-LLM) chatbot — messages/day and which
// barbershops actually use it, from the existing ChatMessage model.
export async function getChatbotUsage() {
  const from = new Date(Date.now() - 30 * DAY_MS);
  const messages = await prisma.chatMessage.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true, barbershopId: true },
  });

  const byDay = new Map<string, number>();
  const byShop = new Map<string, number>();
  for (const m of messages) {
    const day = m.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    byShop.set(m.barbershopId, (byShop.get(m.barbershopId) ?? 0) + 1);
  }

  const now = new Date();
  const trend: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({ label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), count: byDay.get(key) ?? 0 });
  }

  const topShopIds = Array.from(byShop.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const shops: { id: string; name: string }[] = topShopIds.length
    ? await prisma.barbershop.findMany({ where: { id: { in: topShopIds.map(([id]) => id) } }, select: { id: true, name: true } })
    : [];
  const shopNameById = new Map(shops.map((s) => [s.id, s.name]));

  return {
    totalMessages30d: messages.length,
    trend,
    topBarbershops: topShopIds.map(([id, count]) => ({ barbershopName: shopNameById.get(id) ?? "—", count })),
  };
}

export interface CohortRow {
  cohort: string;
  size: number;
  retention: (number | null)[]; // % of the cohort with an owner login that month; null = month hasn't happened yet
}

// Retention by signup cohort — only meaningful from the day LoginEvent
// started being recorded (Fase 2), so early cohorts will show mostly zeros
// for now. That's correct, not a bug: no history is being invented.
export async function getRetentionCohorts(maxOffset = 3): Promise<CohortRow[]> {
  const shops = await prisma.barbershop.findMany({ select: { id: true, ownerId: true, createdAt: true } });
  if (shops.length === 0) return [];

  type ShopRow = (typeof shops)[number];
  const ownerIds = shops.map((s: ShopRow) => s.ownerId);
  const loginEvents = await prisma.loginEvent.findMany({ where: { userId: { in: ownerIds } }, select: { userId: true, createdAt: true } });

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const loginMonthsByOwner = new Map<string, Set<string>>();
  for (const ev of loginEvents) {
    if (!loginMonthsByOwner.has(ev.userId)) loginMonthsByOwner.set(ev.userId, new Set());
    loginMonthsByOwner.get(ev.userId)!.add(monthKey(ev.createdAt));
  }

  const cohorts = new Map<string, { ownerId: string }[]>();
  for (const shop of shops) {
    const key = monthKey(shop.createdAt);
    if (!cohorts.has(key)) cohorts.set(key, []);
    cohorts.get(key)!.push({ ownerId: shop.ownerId });
  }

  const now = new Date();
  const rows: CohortRow[] = [];
  for (const cohortKey of Array.from(cohorts.keys()).sort()) {
    const members = cohorts.get(cohortKey)!;
    const [cy, cm] = cohortKey.split("-").map(Number);
    const retention: (number | null)[] = [];
    for (let offset = 0; offset <= maxOffset; offset++) {
      const targetDate = new Date(cy, cm - 1 + offset, 1);
      if (targetDate > now) {
        retention.push(null);
        continue;
      }
      const targetKey = monthKey(targetDate);
      const activeCount = members.filter((m) => loginMonthsByOwner.get(m.ownerId)?.has(targetKey)).length;
      retention.push(Math.round((activeCount / members.length) * 100));
    }
    rows.push({ cohort: cohortKey, size: members.length, retention });
  }
  return rows;
}

export interface ActivationStep {
  step: string;
  count: number;
}

// Where a new gestor drops off before ever becoming a real, engaged
// customer — cadastro is the widest part of the funnel, "1º concluído" is
// the narrowest (and the point at which they've genuinely gotten value).
export async function getActivationFunnel(): Promise<ActivationStep[]> {
  const shops = await prisma.barbershop.findMany({
    select: { _count: { select: { staff: true, services: true, appointments: true } } },
  });

  type ShopCountRow = (typeof shops)[number];
  const total = shops.length;
  const withStaff = shops.filter((s: ShopCountRow) => s._count.staff > 0).length;
  const withServices = shops.filter((s: ShopCountRow) => s._count.services > 0).length;
  const withAppointment = shops.filter((s: ShopCountRow) => s._count.appointments > 0).length;
  const withCompleted = await prisma.barbershop.count({ where: { appointments: { some: { status: "COMPLETED" } } } });

  return [
    { step: "Cadastrou", count: total },
    { step: "Tem barbeiro", count: withStaff },
    { step: "Tem serviço", count: withServices },
    { step: "1º agendamento", count: withAppointment },
    { step: "1º concluído", count: withCompleted },
  ];
}

export interface PlanLimitUsageRow {
  barbershopId: string;
  barbershopName: string;
  plan: string;
  appointmentsUsedPct: number | null;
  staffUsedPct: number | null;
}

// Barbershops running hot against their plan's limits this month — the
// clearest, least pushy upsell signal there is: they're already trying to
// use more than they're paying for.
export async function getPlanLimitUsage(): Promise<PlanLimitUsageRow[]> {
  const pricing = await getPlanPricing();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const shops = await prisma.barbershop.findMany({
    where: { isActive: true },
    select: { id: true, name: true, plan: true, _count: { select: { staff: true } } },
  });
  type ShopLimitRow = (typeof shops)[number];
  const shopIds = shops.map((s: ShopLimitRow) => s.id);

  const appointmentCounts = await prisma.appointment.groupBy({
    by: ["barbershopId"],
    where: { barbershopId: { in: shopIds }, date: { gte: monthStart } },
    _count: { _all: true },
  });
  const apptCountByShop = new Map<string, number>(appointmentCounts.map((a: { barbershopId: string; _count: { _all: number } }) => [a.barbershopId, a._count._all]));

  const rows: PlanLimitUsageRow[] = [];
  for (const shop of shops) {
    const planKey = (PLANS.includes(shop.plan as PlatformPlan) ? shop.plan : "FREE") as PlatformPlan;
    const limits = pricing[planKey];
    const apptCount = apptCountByShop.get(shop.id) ?? 0;
    const appointmentsUsedPct = limits.appointmentsLimit ? Math.round((apptCount / limits.appointmentsLimit) * 100) : null;
    const staffUsedPct = limits.staffLimit ? Math.round((shop._count.staff / limits.staffLimit) * 100) : null;
    if ((appointmentsUsedPct ?? 0) >= 80 || (staffUsedPct ?? 0) >= 80) {
      rows.push({ barbershopId: shop.id, barbershopName: shop.name, plan: shop.plan, appointmentsUsedPct, staffUsedPct });
    }
  }

  return rows.sort((a, b) => Math.max(b.appointmentsUsedPct ?? 0, b.staffUsedPct ?? 0) - Math.max(a.appointmentsUsedPct ?? 0, a.staffUsedPct ?? 0));
}

export interface NewIpLoginRow {
  userName: string;
  userEmail: string;
  role: string;
  ipAddress: string | null;
  createdAt: Date;
}

// Simple, no-geolocation security signal: a login from an IP never seen
// before for that specific user. No external service, no fabricated "risk
// level" — just "this is new."
export async function getNewIpLogins(limit = 20): Promise<NewIpLoginRow[]> {
  const events = await prisma.loginEvent.findMany({
    where: { isNewIp: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true, role: true } } },
  });
  return events.map((e: (typeof events)[number]) => ({
    userName: e.user.name,
    userEmail: e.user.email,
    role: e.user.role,
    ipAddress: e.ipAddress,
    createdAt: e.createdAt,
  }));
}
