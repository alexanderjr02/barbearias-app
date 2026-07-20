import { prisma } from "../db";

/**
 * Lançamento automático no financeiro.
 *
 * O módulo financeiro morre sempre do mesmo jeito: o gestor lança à mão por
 * duas semanas, cansa, e o "lucro" vira um número que mente. Receita de
 * agendamento já entrava sozinha (somada dos COMPLETED), mas mensalidade não —
 * uma barbearia vivendo de assinatura via zero disso no Financeiro.
 *
 * Idempotência é obrigatória aqui, não desejável: provedor de pagamento
 * reenvia webhook em retentativa, e sem trava cada reenvio viraria uma receita
 * nova inventada. O campo `reference` guarda a origem única do lançamento.
 */
export async function recordAutoIncome(params: {
  barbershopId: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod?: string | null;
  /** Chave única da origem, ex.: "subscription:<id>:2026-07". */
  reference: string;
  date?: Date;
}): Promise<{ created: boolean }> {
  const { barbershopId, amount, description, category, paymentMethod, reference, date } = params;

  if (!(amount > 0)) return { created: false };

  const existing = await prisma.financialTransaction.findFirst({
    where: { barbershopId, reference },
    select: { id: true },
  });
  if (existing) return { created: false };

  await prisma.financialTransaction.create({
    data: {
      barbershopId,
      type: "INCOME",
      category,
      description,
      amount,
      paymentMethod: paymentMethod ?? null,
      reference,
      date: date ?? new Date(),
    },
  });

  return { created: true };
}

/**
 * Mensalidade confirmada vira receita. A referência inclui o mês de cobrança
 * para que a renovação do mês seguinte gere um lançamento novo — mas o mesmo
 * mês, reenviado, não.
 */
export async function recordSubscriptionPayment(subscriptionId: string): Promise<{ created: boolean }> {
  const sub = await prisma.clientSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { select: { name: true, price: true, barbershopId: true } } },
  });
  if (!sub?.plan) return { created: false };

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return recordAutoIncome({
    barbershopId: sub.plan.barbershopId,
    amount: sub.plan.price,
    category: "Assinatura",
    description: `${sub.plan.name} — ${sub.clientName}`,
    paymentMethod: sub.paymentMethod,
    reference: `subscription:${sub.id}:${period}`,
    date: now,
  });
}
