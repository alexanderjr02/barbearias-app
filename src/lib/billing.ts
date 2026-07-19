import { prisma } from "./db";
import { DEFAULT_PLAN_PRICING } from "./planPricingDefaults";

export const PLANS = ["FREE", "PRO", "ENTERPRISE"] as const;
export type PlatformPlan = (typeof PLANS)[number];

export type PlanPricing = {
  price: number;
  appointmentsLimit: number | null; // null = unlimited
  staffLimit: number | null;
};

// Falls back to these if a PlatformSetting row hasn't been seeded yet — keeps
// the app from crashing on a fresh DB before `npm run db:seed` has run.
// Compartilhado com prisma/seed.ts para os dois nunca divergirem.
const DEFAULT_PRICING: Record<PlatformPlan, PlanPricing> = DEFAULT_PLAN_PRICING;

// Tiers that unlock the AI Copiloto (business assistant) + AI-powered client
// chatbot. Gating this to the paid-up tiers protects margin, since every AI
// turn costs an Anthropic API call.
export function planHasAI(plan: string | null | undefined): boolean {
  return plan === "PRO" || plan === "ENTERPRISE";
}

// Preços da REDE. A unidade primária (a mais antiga de cada dono) paga o plano
// cheio; as demais entram como unidade adicional. Sem isto, cada unidade nova
// seria faturada pelo preço do plano inteiro — uma rede de 3 lojas pagaria
// 3x R$897 em vez de R$897 + 2x R$149.
export const EXTRA_UNIT_PRICE = Number(process.env.EXTRA_UNIT_PRICE) || 149;
// Taxa de implantação do White Label. ZERADA de propósito: ela existia para
// pagar a publicação nas lojas (contas Apple/Google + o trabalho de submeter e
// encarar a revisão), e o produto decidiu ficar no PWA — o cliente instala
// pelo link, no mesmo dia, sem loja. Sem esse custo, "sem taxa de implantação"
// virou argumento de venda contra quem cobra setup.
//
// A mecânica de cobrança continua aqui e volta a funcionar sozinha se um dia
// isso mudar: basta definir WHITE_LABEL_SETUP_FEE. Em 0, nenhuma fatura de
// implantação é gerada (ver recordPlanChangeInvoice).
export const WHITE_LABEL_SETUP_FEE = Number(process.env.WHITE_LABEL_SETUP_FEE) || 0;

/**
 * Marca, para cada barbearia, se ela é a primária do seu dono (a mais antiga).
 * Feito em lote justamente porque as rotinas de faturamento percorrem todas as
 * barbearias — uma consulta por loja viraria N+1.
 */
export function markPrimaries<T extends { id: string; ownerId: string; createdAt: Date }>(shops: T[]): Map<string, boolean> {
  const oldestByOwner = new Map<string, T>();
  for (const s of shops) {
    const cur = oldestByOwner.get(s.ownerId);
    if (!cur || s.createdAt < cur.createdAt) oldestByOwner.set(s.ownerId, s);
  }
  const isPrimary = new Map<string, boolean>();
  for (const s of shops) isPrimary.set(s.id, oldestByOwner.get(s.ownerId)?.id === s.id);
  return isPrimary;
}

/** Quanto esta barbearia custa por mês, considerando se é matriz ou unidade extra. */
export function monthlyPriceFor(pricing: Record<PlatformPlan, PlanPricing>, plan: string, isPrimary: boolean): number {
  const p = PLANS.includes(plan as PlatformPlan) ? (plan as PlatformPlan) : "FREE";
  return isPrimary ? pricing[p].price : EXTRA_UNIT_PRICE;
}

const RENEWAL_PERIOD_DAYS = 30;
// Bounds how many overdue renewal cycles get backfilled in a single call —
// self-heals across repeat calls instead of flooding history in one shot.
const MAX_CATCHUP_CYCLES = 6;

// Plan pricing/limits live in the DB (PlatformSetting) instead of hardcoded
// in PlanContext.tsx, so editing them in /admin/settings actually changes
// what the gestor-facing app charges/gates.
export async function getPlanPricing(): Promise<Record<PlatformPlan, PlanPricing>> {
  const rows = await prisma.platformSetting.findMany({
    where: { key: { in: PLANS.map((p) => `plan_pricing:${p}`) } },
  });
  const result = { ...DEFAULT_PRICING };
  for (const row of rows) {
    const plan = row.key.replace("plan_pricing:", "") as PlatformPlan;
    if (!PLANS.includes(plan)) continue;
    try {
      result[plan] = JSON.parse(row.value) as PlanPricing;
    } catch {
      // keep default for this plan if the stored JSON is somehow malformed
    }
  }
  return result;
}

// Called whenever a gestor or the platform admin changes a barbershop's
// plan. Records a real, already-settled invoice (mirrors the instant-success
// simulation UpgradeModal already shows the gestor) and, for a first-time
// move into ENTERPRISE, opens a White Label request so the admin has a real
// queue to work from instead of a silent plan-field flip.
export async function recordPlanChangeInvoice(
  barbershopId: string,
  newPlan: PlatformPlan,
  previousPlan: string
) {
  if (newPlan === previousPlan) return;

  const pricing = await getPlanPricing();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + RENEWAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Se esta barbearia não é a matriz do dono, ela é unidade adicional e paga a
  // tarifa por unidade, não o plano cheio.
  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { ownerId: true } });
  const siblings = shop
    ? ((await prisma.barbershop.findMany({ where: { ownerId: shop.ownerId }, select: { id: true, ownerId: true, createdAt: true } })) as { id: string; ownerId: string; createdAt: Date }[])
    : [];
  const isPrimary = siblings.length ? (markPrimaries(siblings).get(barbershopId) ?? true) : true;

  await prisma.platformInvoice.create({
    data: {
      barbershopId,
      plan: newPlan,
      previousPlan,
      amount: monthlyPriceFor(pricing, newPlan, isPrimary),
      status: "PAID",
      reason: "PLAN_CHANGE",
      periodStart: now,
      periodEnd,
      paidAt: now,
    },
  });

  if (newPlan === "ENTERPRISE") {
    await prisma.whiteLabelRequest.upsert({
      where: { barbershopId },
      create: { barbershopId, status: "REQUESTED" },
      update: {},
    });

    // Taxa de implantação: uma única vez por barbearia, na PRIMEIRA entrada no
    // White Label. Quem sai e volta não paga de novo — por isso a checagem por
    // fatura existente em vez de simplesmente cobrar toda vez.
    const alreadyCharged = await prisma.platformInvoice.findFirst({
      where: { barbershopId, reason: "SETUP" },
      select: { id: true },
    });
    if (!alreadyCharged && isPrimary && WHITE_LABEL_SETUP_FEE > 0) {
      await prisma.platformInvoice.create({
        data: {
          barbershopId,
          plan: newPlan,
          amount: WHITE_LABEL_SETUP_FEE,
          status: "PENDING",
          reason: "SETUP",
          periodStart: now,
          periodEnd: now,
        },
      });
    }
  }
}

// No cron/background-job infrastructure exists anywhere in this app, so
// renewals are generated lazily and idempotently whenever an admin dashboard
// or billing route is loaded — each barbershop only ever gets one invoice
// per period (guarded by periodEnd/periodStart continuity), and renewal
// status is tied to the shop's real isActive flag instead of randomness.
export async function ensureMonthlyRenewals(): Promise<number> {
  const [barbershops, pricing] = await Promise.all([
    prisma.barbershop.findMany({
      select: { id: true, plan: true, isActive: true, createdAt: true, ownerId: true },
    }),
    getPlanPricing(),
  ]);

  const isPrimary = markPrimaries(barbershops as { id: string; ownerId: string; createdAt: Date }[]);
  const now = new Date();
  let created = 0;

  for (const shop of barbershops) {
    const lastInvoice = await prisma.platformInvoice.findFirst({
      where: { barbershopId: shop.id },
      orderBy: { periodEnd: "desc" },
    });

    let cursor = lastInvoice ? lastInvoice.periodEnd : shop.createdAt;
    let cycles = 0;

    while (cursor.getTime() <= now.getTime() && cycles < MAX_CATCHUP_CYCLES) {
      const periodStart = cursor;
      const periodEnd = new Date(periodStart.getTime() + RENEWAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      const plan = (PLANS.includes(shop.plan as PlatformPlan) ? shop.plan : "FREE") as PlatformPlan;
      const status = shop.isActive ? "PAID" : "FAILED";

      await prisma.platformInvoice.create({
        data: {
          barbershopId: shop.id,
          plan,
          amount: monthlyPriceFor(pricing, plan, isPrimary.get(shop.id) ?? true),
          status,
          reason: "RENEWAL",
          periodStart,
          periodEnd,
          paidAt: status === "PAID" ? now : null,
        },
      });

      created += 1;
      cycles += 1;
      cursor = periodEnd;
    }
  }

  return created;
}

function planPriceOf(pricing: Record<PlatformPlan, PlanPricing>, plan: string): number {
  return pricing[PLANS.includes(plan as PlatformPlan) ? (plan as PlatformPlan) : "FREE"].price;
}

// Single source of truth for "current MRR" — sum of the active plan price
// across every active barbershop. Reused by the dashboard, billing summary,
// and the forecast/churn functions below so they can never silently drift
// from each other.
export async function getCurrentMrr(): Promise<number> {
  const [shops, pricing] = await Promise.all([
    prisma.barbershop.findMany({ where: { isActive: true }, select: { id: true, plan: true, ownerId: true, createdAt: true } }),
    getPlanPricing(),
  ]);
  // Conta unidade extra pelo preço de unidade extra — senão o MRR ficaria
  // inflado e toda a previsão/churn em cima dele viria errada.
  type S = { id: string; plan: string; ownerId: string; createdAt: Date };
  const list = shops as S[];
  const isPrimary = markPrimaries(list);
  return list.reduce((sum: number, s: S) => sum + monthlyPriceFor(pricing, s.plan, isPrimary.get(s.id) ?? true), 0);
}

export interface MrrMovementPoint {
  label: string;
  newMrr: number;
  expansion: number;
  contraction: number;
  churn: number;
  net: number;
}

// The single most-checked SaaS finance report: where MRR gained/lost ground
// each month. New comes from real signups, Expansion/Contraction from real
// PLAN_CHANGE invoices (now that they record previousPlan), Churn from the
// real "barbershop.suspended" audit trail already written by the admin
// barbershop-suspend action — no synthetic history, no invented numbers.
export async function getMrrMovement(months = 6): Promise<MrrMovementPoint[]> {
  const pricing = await getPlanPricing();
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [barbershops, planChangeInvoices, churnEvents] = await Promise.all([
    prisma.barbershop.findMany({ select: { id: true, plan: true, createdAt: true } }),
    prisma.platformInvoice.findMany({
      where: { reason: "PLAN_CHANGE", previousPlan: { not: null }, createdAt: { gte: rangeStart } },
      select: { plan: true, previousPlan: true, amount: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { action: "barbershop.suspended", createdAt: { gte: rangeStart } },
      select: { targetId: true, createdAt: true },
    }),
  ]);

  type BarbershopRow = (typeof barbershops)[number];
  const barbershopById = new Map<string, BarbershopRow>(barbershops.map((b: BarbershopRow) => [b.id, b]));
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const buckets = new Map<string, MrrMovementPoint>();
  const order: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    order.push(key);
    buckets.set(key, { label: d.toLocaleDateString("pt-BR", { month: "short" }), newMrr: 0, expansion: 0, contraction: 0, churn: 0, net: 0 });
  }

  for (const shop of barbershops) {
    const bucket = buckets.get(monthKey(shop.createdAt));
    if (bucket) bucket.newMrr += planPriceOf(pricing, shop.plan);
  }

  for (const inv of planChangeInvoices) {
    const bucket = buckets.get(monthKey(inv.createdAt));
    if (!bucket || !inv.previousPlan) continue;
    const delta = inv.amount - planPriceOf(pricing, inv.previousPlan);
    if (delta > 0) bucket.expansion += delta;
    else if (delta < 0) bucket.contraction += Math.abs(delta);
  }

  for (const ev of churnEvents) {
    const bucket = buckets.get(monthKey(ev.createdAt));
    const shop = barbershopById.get(ev.targetId);
    if (bucket && shop) bucket.churn += planPriceOf(pricing, shop.plan);
  }

  for (const bucket of buckets.values()) {
    bucket.net = bucket.newMrr + bucket.expansion - bucket.contraction - bucket.churn;
  }

  return order.map((key) => buckets.get(key)!);
}

// Customer churn (% of the customer base lost this month) and revenue churn
// (% of MRR lost this month) — reconstructed from the real
// "barbershop.suspended" audit trail, not a stored historical snapshot.
export async function getChurnMetrics() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const pricing = await getPlanPricing();

  const churnEvents = await prisma.auditLog.findMany({
    where: { action: "barbershop.suspended", createdAt: { gte: monthStart } },
    select: { targetId: true },
    distinct: ["targetId"],
  });
  const churnedIds = churnEvents.map((e: { targetId: string }) => e.targetId);

  const activeAtStart = await prisma.barbershop.count({
    where: {
      createdAt: { lt: monthStart },
      OR: [{ isActive: true }, { id: { in: churnedIds.length ? churnedIds : ["__none__"] } }],
    },
  });

  const churnedShops: { plan: string }[] = churnedIds.length
    ? await prisma.barbershop.findMany({ where: { id: { in: churnedIds } }, select: { plan: true } })
    : [];
  const churnedMrr = churnedShops.reduce((sum: number, s: { plan: string }) => sum + planPriceOf(pricing, s.plan), 0);

  const currentMrr = await getCurrentMrr();
  const mrrAtStart = currentMrr + churnedMrr; // reverses only this month's churn — a simple, explainable approximation

  return {
    customerChurnRate: activeAtStart > 0 ? churnedIds.length / activeAtStart : 0,
    revenueChurnRate: mrrAtStart > 0 ? churnedMrr / mrrAtStart : 0,
    churnedCount: churnedIds.length,
    churnedMrr,
  };
}

// Money currently stuck on unpaid/failed invoices — a number every SaaS
// operator watches, since it's revenue already earned but not yet collected.
export async function getRevenueAtRisk() {
  const result = await prisma.platformInvoice.aggregate({
    where: { status: { in: ["FAILED", "PENDING"] } },
    _sum: { amount: true },
    _count: true,
  });
  return { amount: result._sum.amount ?? 0, count: result._count };
}

export interface MrrForecastPoint {
  label: string;
  projectedMrr: number;
}

// A transparent, explainable projection — average Net MRR movement of the
// last 3 real months, applied forward — not a statistical model. Always
// rendered as a clearly separate "projection" series, never blended with
// real historical data.
export async function getMrrForecast(months = 3): Promise<MrrForecastPoint[]> {
  const recent = await getMrrMovement(3);
  const avgNet = recent.reduce((sum, m) => sum + m.net, 0) / recent.length;
  const currentMrr = await getCurrentMrr();

  const now = new Date();
  const points: MrrForecastPoint[] = [];
  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    points.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }), projectedMrr: Math.max(0, Math.round(currentMrr + avgNet * i)) });
  }
  return points;
}
