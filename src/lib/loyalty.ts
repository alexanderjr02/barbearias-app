import { prisma } from "./db";
import { tierFor, addStampForAppointment, completeReferralIfFirstVisit } from "./loyalty/engine";

// Matches the tier bands from the product spec (Bronze/Prata/Ouro).
// Discount % is informational for now — there's no automatic pricing engine
// yet to apply it at checkout.
export const TIER_THRESHOLDS = {
  BRONZE: { min: 0, discount: 0 },
  SILVER: { min: 501, discount: 0.05 },
  GOLD: { min: 1501, discount: 0.1 },
} as const;

export type LoyaltyTier = keyof typeof TIER_THRESHOLDS;

export function tierForPoints(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.GOLD.min) return "GOLD";
  if (points >= TIER_THRESHOLDS.SILVER.min) return "SILVER";
  return "BRONZE";
}

// Called when an appointment transitions into COMPLETED. No-op if the
// appointment isn't linked to a User account (guest bookings without login
// have nowhere to accrue points) or if this appointment already earned
// points before (re-marking COMPLETED must not double-award).
export async function awardPointsForAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || !appointment.clientId) return;

  const alreadyAwarded = await prisma.pointsTransaction.findFirst({
    where: { appointmentId, type: "EARNED" },
  });
  if (alreadyAwarded) return;

  const barbershop = await prisma.barbershop.findUnique({ where: { id: appointment.barbershopId } });
  if (!barbershop) return;

  // Programa desligado pela barbearia = não acumula ponto.
  if (!barbershop.loyaltyEnabled) return;

  const earned = Math.round(appointment.totalPrice * barbershop.pointsPerReal);
  if (earned <= 0) return;

  // Faixas vêm da configuração DA BARBEARIA (antes eram constantes no código,
  // então todas eram obrigadas ao mesmo programa).
  const cfg = { silverThreshold: barbershop.silverThreshold, goldThreshold: barbershop.goldThreshold };

  const account = await prisma.loyaltyAccount.upsert({
    where: { userId_barbershopId: { userId: appointment.clientId, barbershopId: appointment.barbershopId } },
    create: { userId: appointment.clientId, barbershopId: appointment.barbershopId, points: earned, tier: tierFor(earned, cfg) },
    update: { points: { increment: earned } },
  });

  const newTier = tierFor(account.points, cfg);
  if (newTier !== account.tier) {
    await prisma.loyaltyAccount.update({ where: { id: account.id }, data: { tier: newTier } });
  }

  await prisma.pointsTransaction.create({
    data: {
      loyaltyAccountId: account.id,
      amount: earned,
      type: "EARNED",
      appointmentId,
      description: `Agendamento concluído (R$ ${appointment.totalPrice.toFixed(2)})`,
    },
  });
}

/**
 * Tudo que acontece quando um atendimento vira COMPLETED: pontos, selo no
 * cartão e fechamento de indicação. Ponto único de entrada para as chamadas
 * não saírem de sincronia entre si.
 */
export async function runLoyaltyOnCompletion(appointmentId: string) {
  await awardPointsForAppointment(appointmentId);
  await addStampForAppointment(appointmentId);
  await completeReferralIfFirstVisit(appointmentId);
}
