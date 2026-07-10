import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// Income = completed appointments (automatic) + manually logged INCOME transactions
// (products sold, etc). Expenses = manually logged EXPENSE transactions.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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
  if (!body?.type || !body?.category || !body?.description || typeof body.amount !== "number") {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const transaction = await prisma.financialTransaction.create({
    data: {
      type: body.type,
      category: body.category,
      description: body.description,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      barbershopId: session.barbershopId,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
