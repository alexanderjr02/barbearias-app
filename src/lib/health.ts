import { prisma } from "./db";

export type HealthBand = "HEALTHY" | "AT_RISK" | "CRITICAL";

export interface BarbershopHealth {
  score: number;
  band: HealthBand;
  reasons: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function bandFor(score: number): HealthBand {
  if (score >= 70) return "HEALTHY";
  if (score >= 40) return "AT_RISK";
  return "CRITICAL";
}

// A transparent, explainable score (not ML) — starts at 100 and loses points
// for real warning signs: an owner who hasn't logged in, a shop with zero
// recent bookings, a failed payment, or an urgent support ticket left open.
function computeScore(params: {
  lastLoginAt: Date | null;
  recentAppointments: number;
  hasRecentFailedInvoice: boolean;
  hasOpenHighPriorityTicket: boolean;
}): BarbershopHealth {
  let score = 100;
  const reasons: string[] = [];

  if (!params.lastLoginAt) {
    score -= 40;
    reasons.push("Dono nunca fez login");
  } else {
    const daysSinceLogin = (Date.now() - params.lastLoginAt.getTime()) / DAY_MS;
    if (daysSinceLogin > 30) {
      score -= 40;
      reasons.push("Sem login há mais de 30 dias");
    } else if (daysSinceLogin > 14) {
      score -= 15;
      reasons.push("Sem login há mais de 14 dias");
    }
  }

  if (params.recentAppointments === 0) {
    score -= 30;
    reasons.push("Nenhum agendamento nos últimos 30 dias");
  }

  if (params.hasRecentFailedInvoice) {
    score -= 20;
    reasons.push("Fatura falhada nos últimos 60 dias");
  }

  if (params.hasOpenHighPriorityTicket) {
    score -= 10;
    reasons.push("Chamado de suporte urgente em aberto");
  }

  score = Math.max(0, score);
  return { score, band: bandFor(score), reasons };
}

export async function getBarbershopHealth(barbershopId: string): Promise<BarbershopHealth> {
  const all = await getHealthScores([barbershopId]);
  return all.get(barbershopId) ?? { score: 100, band: "HEALTHY", reasons: [] };
}

// Batched version — one round trip per signal instead of N+1 — used by the
// Barbearias list where every row needs a score.
export async function getHealthScores(barbershopIds?: string[]): Promise<Map<string, BarbershopHealth>> {
  const shops = await prisma.barbershop.findMany({
    where: barbershopIds ? { id: { in: barbershopIds } } : undefined,
    select: { id: true, ownerId: true },
  });
  type ShopRow = (typeof shops)[number];
  const shopIds = shops.map((s: ShopRow) => s.id);
  const ownerIds = shops.map((s: ShopRow) => s.ownerId);

  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);
  const sixtyDaysAgo = new Date(Date.now() - 60 * DAY_MS);

  const [lastLogins, appointmentCounts, failedInvoiceShops, urgentTicketShops] = await Promise.all([
    prisma.loginEvent.groupBy({ by: ["userId"], where: { userId: { in: ownerIds } }, _max: { createdAt: true } }),
    prisma.appointment.groupBy({ by: ["barbershopId"], where: { barbershopId: { in: shopIds }, date: { gte: thirtyDaysAgo } }, _count: { _all: true } }),
    prisma.platformInvoice.findMany({ where: { barbershopId: { in: shopIds }, status: "FAILED", createdAt: { gte: sixtyDaysAgo } }, select: { barbershopId: true }, distinct: ["barbershopId"] }),
    prisma.supportTicket.findMany({ where: { barbershopId: { in: shopIds }, priority: "HIGH", status: { in: ["OPEN", "IN_PROGRESS"] } }, select: { barbershopId: true }, distinct: ["barbershopId"] }),
  ]);

  const lastLoginByOwner = new Map<string, Date | null>(lastLogins.map((l: { userId: string; _max: { createdAt: Date | null } }) => [l.userId, l._max.createdAt]));
  const appointmentsByShop = new Map<string, number>(appointmentCounts.map((a: { barbershopId: string; _count: { _all: number } }) => [a.barbershopId, a._count._all]));
  const failedShopIds = new Set(failedInvoiceShops.map((f: { barbershopId: string }) => f.barbershopId));
  const urgentShopIds = new Set(urgentTicketShops.map((t: { barbershopId: string }) => t.barbershopId));

  const result = new Map<string, BarbershopHealth>();
  for (const shop of shops) {
    result.set(
      shop.id,
      computeScore({
        lastLoginAt: lastLoginByOwner.get(shop.ownerId) ?? null,
        recentAppointments: appointmentsByShop.get(shop.id) ?? 0,
        hasRecentFailedInvoice: failedShopIds.has(shop.id),
        hasOpenHighPriorityTicket: urgentShopIds.has(shop.id),
      })
    );
  }
  return result;
}
