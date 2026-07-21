import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { materializeRecurringExpenses } from "@/lib/finance/autoEntry";

// Income = completed appointments (automatic) + manually logged INCOME transactions
// (products sold, etc). Expenses = manually logged EXPENSE transactions.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Materializa as recorrentes ANTES de somar — senão a tela mostraria o mês
  // sem o aluguel que já venceu, e o lucro apareceria maior do que é.
  // Nunca derruba a tela: financeiro incompleto é ruim, financeiro fora do ar
  // é pior.
  try {
    await materializeRecurringExpenses(session.barbershopId);
  } catch (e) {
    console.error("[finance] materializeRecurringExpenses", e);
  }

  const [transactions, completedAppointments] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { barbershopId: session.barbershopId },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.appointment.findMany({
      where: { barbershopId: session.barbershopId, status: "COMPLETED" },
      select: { totalPrice: true },
    }),
  ]);

  type AppointmentRow = (typeof completedAppointments)[number];
  type TransactionRow = (typeof transactions)[number];

  const serviceRevenue = completedAppointments.reduce((acc: number, a: AppointmentRow) => acc + a.totalPrice, 0);
  const manualIncome = transactions.filter((t: TransactionRow) => t.type === "INCOME").reduce((acc: number, t: TransactionRow) => acc + t.amount, 0);
  const expenses = transactions.filter((t: TransactionRow) => t.type === "EXPENSE").reduce((acc: number, t: TransactionRow) => acc + t.amount, 0);
  const income = serviceRevenue + manualIncome;

  return NextResponse.json({
    transactions,
    summary: { income, expenses, profit: income - expenses, serviceRevenue, manualIncome },
  });
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  // Validação de servidor — NUNCA confiar no cliente. O app bloqueia valor <= 0,
  // mas quem chama a API direto (curl/Postman) pula isso. Sem revalidar aqui,
  // dava para injetar -9999, NaN, Infinity ou um número gigante, que corrompia
  // o lucro e quebrava o gráfico (a "faixa vermelha").
  const type = typeof body?.type === "string" ? body.type : "";
  if (type !== "INCOME" && type !== "EXPENSE") {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  const rawAmount = body?.amount;
  // Number.isFinite recusa NaN e Infinity de uma vez (ambos são typeof "number").
  if (typeof rawAmount !== "number" || !Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 10_000_000) {
    return NextResponse.json({ error: "Valor inválido — informe um número positivo (máx. 10.000.000)." }, { status: 400 });
  }
  const amount = Math.round(rawAmount * 100) / 100; // 2 casas, sem lixo de float

  const category = typeof body?.category === "string" ? body.category.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!category || category.length > 60) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }
  if (!description || description.length > 200) {
    return NextResponse.json({ error: "Descrição inválida." }, { status: 400 });
  }

  let date = new Date();
  if (body?.date != null) {
    const parsed = new Date(body.date);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    }
    date = parsed;
  }

  const paymentMethod =
    typeof body?.paymentMethod === "string" && body.paymentMethod.trim() ? body.paymentMethod.trim().slice(0, 40) : null;

  const transaction = await prisma.financialTransaction.create({
    data: {
      type,
      category,
      description,
      amount,
      date,
      paymentMethod,
      // `reference` é só para os lançamentos automáticos (idempotência).
      // Não aceitamos do cliente, senão dava para forjar/colidir com eles.
      reference: null,
      barbershopId: session.barbershopId,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
