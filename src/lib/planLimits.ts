import { prisma } from "./db";
import { getPlanPricing, PLANS, type PlatformPlan } from "./billing";

function resolvePlan(plan: string | null | undefined): PlatformPlan {
  return (plan && (PLANS as readonly string[]).includes(plan) ? plan : "FREE") as PlatformPlan;
}

// User-facing error message when the barbershop's plan wouldn't allow one more
// active barber — or null when it's within the limit. Limits come from
// PlatformSetting (editable in /admin/settings), null meaning "unlimited".
export async function staffLimitError(barbershopId: string): Promise<string | null> {
  const [shop, pricing] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true } }),
    getPlanPricing(),
  ]);
  const limit = pricing[resolvePlan(shop?.plan)].staffLimit;
  if (limit === null) return null;
  const count = await prisma.staff.count({ where: { barbershopId, isActive: true } });
  if (count >= limit) {
    return `Seu plano permite até ${limit} barbeiro${limit === 1 ? "" : "s"}. Faça upgrade para adicionar mais.`;
  }
  return null;
}

// Same, for appointments counted per calendar month (the advertised
// "X agendamentos/mês"). Cancelled ones don't count against the quota.
export async function appointmentLimitError(barbershopId: string): Promise<string | null> {
  const [shop, pricing] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true } }),
    getPlanPricing(),
  ]);
  const limit = pricing[resolvePlan(shop?.plan)].appointmentsLimit;
  if (limit === null) return null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await prisma.appointment.count({
    where: { barbershopId, createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
  });
  if (count >= limit) {
    return `Esta barbearia atingiu o limite de ${limit} agendamentos no mês. Fale com a barbearia.`;
  }
  return null;
}
