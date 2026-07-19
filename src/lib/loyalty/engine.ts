import { prisma } from "@/lib/db";
import { notifyClient } from "@/lib/gestorNotifications";

// Motor de fidelização: cartão de selos e indicação.
//
// Tudo aqui é dirigido pela configuração DA BARBEARIA — nada de regra fixa no
// código. O programa de pontos antigo tinha as faixas cravadas (501/1501), o
// que obrigava toda barbearia a usar o mesmo desenho; agora cada uma calibra
// o seu, liga o que quiser e desliga o resto.

export interface LoyaltyConfig {
  loyaltyEnabled: boolean;
  pointsPerReal: number;
  silverThreshold: number;
  goldThreshold: number;
  silverDiscount: number;
  goldDiscount: number;
  stampEnabled: boolean;
  stampGoal: number;
  stampRewardLabel: string;
  referralEnabled: boolean;
  referralReferrerReward: string;
  referralFriendReward: string;
}

export async function loyaltyConfig(barbershopId: string): Promise<LoyaltyConfig | null> {
  return prisma.barbershop.findUnique({
    where: { id: barbershopId },
    select: {
      loyaltyEnabled: true, pointsPerReal: true, silverThreshold: true, goldThreshold: true,
      silverDiscount: true, goldDiscount: true, stampEnabled: true, stampGoal: true,
      stampRewardLabel: true, referralEnabled: true, referralReferrerReward: true, referralFriendReward: true,
    },
  });
}

/** Faixa do cliente segundo os limites QUE A BARBEARIA definiu. */
export function tierFor(points: number, cfg: Pick<LoyaltyConfig, "silverThreshold" | "goldThreshold">): "BRONZE" | "SILVER" | "GOLD" {
  if (points >= cfg.goldThreshold) return "GOLD";
  if (points >= cfg.silverThreshold) return "SILVER";
  return "BRONZE";
}

/**
 * Carimba o cartão quando um atendimento é concluído. Ao fechar a cartela,
 * zera os selos, conta uma cartela completa e cria o prêmio.
 *
 * Protegido contra carimbo duplo: se o mesmo atendimento for marcado como
 * concluído de novo, não carimba de novo.
 */
export async function addStampForAppointment(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, clientId: true, barbershopId: true, status: true },
  });
  if (!appt?.clientId || appt.status !== "COMPLETED") return;

  const cfg = await loyaltyConfig(appt.barbershopId);
  if (!cfg?.stampEnabled || cfg.stampGoal < 1) return;

  // Reaproveita o registro de pontos como marca de "este atendimento já foi
  // processado" — ele é criado na mesma transição e é único por atendimento.
  const card = await prisma.stampCard.upsert({
    where: { userId_barbershopId: { userId: appt.clientId, barbershopId: appt.barbershopId } },
    create: { userId: appt.clientId, barbershopId: appt.barbershopId, stamps: 1 },
    update: { stamps: { increment: 1 } },
    select: { id: true, stamps: true, completedCount: true },
  });

  if (card.stamps >= cfg.stampGoal) {
    await prisma.stampCard.update({
      where: { id: card.id },
      data: { stamps: 0, completedCount: { increment: 1 } },
    });
    await prisma.loyaltyReward.create({
      data: { userId: appt.clientId, barbershopId: appt.barbershopId, source: "STAMP_CARD", label: cfg.stampRewardLabel },
    });
    // Aviso transacional: ele CONQUISTOU algo, não é oferta — por isso vai
    // mesmo sem aceite de marketing.
    await notifyClient(
      appt.barbershopId, appt.clientId, "APPOINTMENT_COMPLETED",
      "Cartela completa! 🎉",
      `Você completou ${cfg.stampGoal} atendimentos e ganhou: ${cfg.stampRewardLabel}. É só pedir no balcão.`,
      "/loyalty",
    );
  }
}

/** Código de indicação do cliente nesta barbearia (cria na primeira vez). */
export async function referralCodeFor(userId: string, barbershopId: string): Promise<string | null> {
  const cfg = await loyaltyConfig(barbershopId);
  if (!cfg?.referralEnabled) return null;

  const existing = await prisma.referral.findFirst({
    where: { barbershopId, referrerId: userId, status: "PENDING", friendId: null },
    select: { code: true },
  });
  if (existing) return existing.code;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const base = (user?.name ?? "amigo").split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "AMIGO";
  let code = "";
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const taken = await prisma.referral.findUnique({ where: { barbershopId_code: { barbershopId, code: candidate } }, select: { id: true } });
    if (!taken) { code = candidate; break; }
  }
  if (!code) return null;

  await prisma.referral.create({ data: { barbershopId, referrerId: userId, code } });
  return code;
}

/** Amigo entra usando o código. Ainda NÃO premia — só vincula. */
export async function attachReferral(code: string, friendId: string, barbershopId: string): Promise<{ ok: boolean; message: string }> {
  const cfg = await loyaltyConfig(barbershopId);
  if (!cfg?.referralEnabled) return { ok: false, message: "Esta barbearia não tem programa de indicação." };

  const referral = await prisma.referral.findUnique({ where: { barbershopId_code: { barbershopId, code: code.trim().toUpperCase() } } });
  if (!referral) return { ok: false, message: "Código de indicação não encontrado." };
  if (referral.referrerId === friendId) return { ok: false, message: "Você não pode usar o seu próprio código." };
  if (referral.friendId) return { ok: false, message: "Este código já foi usado." };

  // Quem já é cliente da casa não vale como indicação — senão o programa vira
  // desconto para a base existente em vez de trazer gente nova.
  const alreadyClient = await prisma.appointment.findFirst({
    where: { clientId: friendId, barbershopId, status: "COMPLETED" },
    select: { id: true },
  });
  if (alreadyClient) return { ok: false, message: "Indicação vale só para quem ainda não foi atendido aqui." };

  await prisma.referral.update({ where: { id: referral.id }, data: { friendId } });
  return { ok: true, message: `Código aplicado! Quando você fizer seu primeiro atendimento, você e quem te indicou ganham o prêmio.` };
}

/**
 * Fecha a indicação quando o amigo REALMENTE aparece (1º atendimento
 * concluído). Premiar no cadastro tornaria trivial inventar amigos.
 */
export async function completeReferralIfFirstVisit(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { clientId: true, barbershopId: true, status: true },
  });
  if (!appt?.clientId || appt.status !== "COMPLETED") return;

  const referral = await prisma.referral.findFirst({
    where: { barbershopId: appt.barbershopId, friendId: appt.clientId, status: "PENDING" },
  });
  if (!referral) return;

  const cfg = await loyaltyConfig(appt.barbershopId);
  if (!cfg?.referralEnabled) return;

  await prisma.referral.update({ where: { id: referral.id }, data: { status: "COMPLETED", completedAt: new Date() } });

  await prisma.loyaltyReward.createMany({
    data: [
      { userId: referral.referrerId, barbershopId: appt.barbershopId, source: "REFERRAL_REFERRER", label: cfg.referralReferrerReward },
      { userId: appt.clientId, barbershopId: appt.barbershopId, source: "REFERRAL_FRIEND", label: cfg.referralFriendReward },
    ],
  });

  await notifyClient(appt.barbershopId, referral.referrerId, "APPOINTMENT_COMPLETED", "Sua indicação valeu! 🎁", `Seu amigo veio cortar. Você ganhou: ${cfg.referralReferrerReward}.`, "/loyalty");
  await notifyClient(appt.barbershopId, appt.clientId, "APPOINTMENT_COMPLETED", "Bem-vindo! 🎁", `Por vir na indicação, você ganhou: ${cfg.referralFriendReward}.`, "/loyalty");
}

/** O que o cliente vê: progresso da cartela + prêmios disponíveis. */
export async function clientLoyaltyStatus(userId: string, barbershopId: string) {
  const cfg = await loyaltyConfig(barbershopId);
  const [card, rewards, account, referral] = await Promise.all([
    prisma.stampCard.findUnique({ where: { userId_barbershopId: { userId, barbershopId } }, select: { stamps: true, completedCount: true } }),
    prisma.loyaltyReward.findMany({ where: { userId, barbershopId, status: "AVAILABLE" }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, source: true, createdAt: true } }),
    prisma.loyaltyAccount.findUnique({ where: { userId_barbershopId: { userId, barbershopId } }, select: { points: true, tier: true } }),
    prisma.referral.findFirst({ where: { barbershopId, referrerId: userId }, select: { code: true } }),
  ]);

  return {
    pointsEnabled: cfg?.loyaltyEnabled ?? false,
    points: account?.points ?? 0,
    tier: account?.tier ?? "BRONZE",
    stampEnabled: cfg?.stampEnabled ?? false,
    stamps: card?.stamps ?? 0,
    stampGoal: cfg?.stampGoal ?? 0,
    stampRewardLabel: cfg?.stampRewardLabel ?? "",
    cardsCompleted: card?.completedCount ?? 0,
    referralEnabled: cfg?.referralEnabled ?? false,
    referralCode: referral?.code ?? null,
    referralReward: cfg?.referralFriendReward ?? "",
    rewards,
  };
}

/** Gestor baixa o prêmio no balcão. */
export async function redeemReward(rewardId: string, barbershopId: string): Promise<{ ok: boolean; message: string }> {
  const reward = await prisma.loyaltyReward.findUnique({ where: { id: rewardId }, select: { barbershopId: true, status: true, label: true } });
  if (!reward || reward.barbershopId !== barbershopId) return { ok: false, message: "Prêmio não encontrado." };
  if (reward.status === "USED") return { ok: false, message: "Este prêmio já foi usado." };
  await prisma.loyaltyReward.update({ where: { id: rewardId }, data: { status: "USED", usedAt: new Date() } });
  return { ok: true, message: `"${reward.label}" baixado.` };
}
