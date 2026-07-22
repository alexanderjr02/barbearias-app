import { prisma } from "./db";

// Resgate de cupom no cadastro.
//
// Fica aqui, e não dentro da rota, porque a mesma regra precisa valer se um
// dia o resgate acontecer por outra porta (app, importação em lote). Regra de
// negócio que mora na rota é regra que se duplica errado na segunda porta.

export interface CouponGrant {
  plan: string;
  planExpiresAt: Date | null;
  compReason: string;
  couponId: string;
}

export type CouponError = "nao-encontrado" | "revogado" | "expirado" | "esgotado";

const MOTIVOS: Record<CouponError, string> = {
  "nao-encontrado": "Código não encontrado.",
  revogado: "Esse código foi desativado.",
  expirado: "Esse código expirou.",
  esgotado: "Esse código já atingiu o limite de usos.",
};

export function mensagemDoErro(e: CouponError): string {
  return MOTIVOS[e];
}

/**
 * Confere o cupom sem consumi-lo. Serve para a tela de cadastro dizer "código
 * válido: 12 meses de Pro" ANTES da pessoa preencher o resto — descobrir que
 * o código não presta depois de digitar o formulário inteiro é o tipo de
 * atrito que faz desistir.
 */
export async function checarCupom(code: string): Promise<{ ok: true; grant: CouponGrant } | { ok: false; error: CouponError }> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) return { ok: false, error: "nao-encontrado" };
  if (!coupon.isActive) return { ok: false, error: "revogado" };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { ok: false, error: "expirado" };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { ok: false, error: "esgotado" };

  return {
    ok: true,
    grant: {
      plan: coupon.plan,
      planExpiresAt: coupon.durationDays ? new Date(Date.now() + coupon.durationDays * 86400000) : null,
      compReason: `cupom ${coupon.code}`,
      couponId: coupon.id,
    },
  };
}

/**
 * Consome o cupom para uma barbearia recém-criada.
 *
 * O incremento é condicional (`usedCount < maxUses` no próprio where): dois
 * cadastros simultâneos com o último uso disponível não podem os dois passar.
 * Conferir antes e gravar depois deixaria essa fresta aberta.
 */
export async function consumirCupom(couponId: string, barbershopId: string): Promise<boolean> {
  try {
    const atualizados = await prisma.coupon.updateMany({
      where: {
        id: couponId,
        isActive: true,
        OR: [{ maxUses: null }, { usedCount: { lt: prisma.coupon.fields.maxUses } }],
      },
      data: { usedCount: { increment: 1 } },
    });
    if (atualizados.count === 0) return false;
    await prisma.couponRedemption.create({ data: { couponId, barbershopId } });
    return true;
  } catch {
    // Resgate duplicado (o @@unique de couponId+barbershopId) ou corrida
    // perdida: o cadastro não pode cair por causa disto.
    return false;
  }
}
