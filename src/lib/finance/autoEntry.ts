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
 * Cria os lançamentos das despesas recorrentes do mês corrente que já
 * venceram.
 *
 * Roda quando o financeiro é carregado, em vez de depender de cron: o gestor
 * só precisa do número certo quando olha a tela, e uma tarefa agendada que
 * falha em silêncio deixaria o lucro errado sem ninguém saber. Idempotente
 * por `recurring:<id>:<ano-mês>`, então chamar toda vez não duplica nada.
 *
 * Só materializa despesa cujo dia de vencimento já passou — lançar o aluguel
 * do dia 25 logo no dia 1º faria o mês inteiro parecer no prejuízo.
 */
export async function materializeRecurringExpenses(barbershopId: string): Promise<number> {
  const expenses = await prisma.recurringExpense.findMany({
    where: { barbershopId, isActive: true },
    select: { id: true, description: true, category: true, amount: true, dayOfMonth: true },
  });
  if (expenses.length === 0) return 0;

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.getDate();

  type Row = (typeof expenses)[number];
  let created = 0;

  for (const e of expenses as Row[]) {
    if (e.dayOfMonth > today) continue;

    const reference = `recurring:${e.id}:${period}`;
    const exists = await prisma.financialTransaction.findFirst({
      where: { barbershopId, reference },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.financialTransaction.create({
      data: {
        barbershopId,
        type: "EXPENSE",
        category: e.category,
        description: e.description,
        amount: e.amount,
        reference,
        date: new Date(now.getFullYear(), now.getMonth(), e.dayOfMonth),
      },
    });
    created++;
  }

  return created;
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
