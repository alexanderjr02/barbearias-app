import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const CYCLE_DAYS: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 };

// GET /api/client/subscription-plans?barbershopId=X — the plans a barbershop
// offers, plus the logged-in client's own subscription there (if any), so
// the app can show either "assinar" or "sua assinatura" for that shop.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const barbershopId = request.nextUrl.searchParams.get("barbershopId");
  if (!barbershopId) {
    return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where: { barbershopId, isActive: true },
    orderBy: { price: "asc" },
  });

  const mine = await prisma.clientSubscription.findMany({
    where: { clientId: session.sub, plan: { barbershopId } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  const mySubscription =
    mine.find((s) => s.status === "ACTIVE" || s.status === "PAST_DUE") ?? mine[0] ?? null;

  // The same "what did I actually get for my money" math the gestor sees,
  // mirrored back to the client — most subscription products only ever show
  // billing status; showing the client their own value earned is the part
  // that doesn't exist anywhere else.
  let usage: { visitCount: number; valueConsumed: number; totalPaid: number } | null = null;
  if (mySubscription) {
    const visits = await prisma.appointment.findMany({
      where: { clientId: session.sub, barbershopId, status: "COMPLETED", date: { gte: mySubscription.startedAt } },
      select: { totalPrice: true },
    });
    const monthsActive = Math.max(1, Math.round((Date.now() - mySubscription.startedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    usage = {
      visitCount: visits.length,
      valueConsumed: visits.reduce((acc, v) => acc + v.totalPrice, 0),
      totalPaid: monthsActive * mySubscription.plan.price,
    };
  }

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      billingCycle: p.billingCycle,
      benefits: p.benefits,
      color: p.color,
    })),
    mySubscription: mySubscription && {
      id: mySubscription.id,
      planId: mySubscription.planId,
      planName: mySubscription.plan.name,
      price: mySubscription.plan.price,
      billingCycle: mySubscription.plan.billingCycle,
      color: mySubscription.plan.color,
      paymentMethod: mySubscription.paymentMethod,
      status: mySubscription.status,
      startedAt: mySubscription.startedAt,
      nextBillingAt: mySubscription.nextBillingAt,
      visitCount: usage?.visitCount ?? 0,
      valueConsumed: usage?.valueConsumed ?? 0,
      totalPaid: usage?.totalPaid ?? 0,
    },
  });
}

// POST /api/client/subscription-plans — the logged-in client subscribes to
// one of the barbershop's plans. One active (or past-due) membership per
// barbershop at a time — subscribing again while already subscribed doesn't
// make sense until the existing one is cancelled.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.planId || !["PIX", "CREDIT_CARD"].includes(body.paymentMethod)) {
    return NextResponse.json({ error: "Plano e forma de pagamento são obrigatórios" }, { status: 400 });
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  }

  const existing = await prisma.clientSubscription.findFirst({
    where: { clientId: session.sub, plan: { barbershopId: plan.barbershopId }, status: { in: ["ACTIVE", "PAST_DUE"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "Você já tem uma assinatura ativa nesta barbearia" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const cycleDays = CYCLE_DAYS[plan.billingCycle] ?? 30;
  const subscription = await prisma.clientSubscription.create({
    data: {
      planId: plan.id,
      clientId: user.id,
      clientName: user.name,
      clientPhone: user.phone ?? "",
      paymentMethod: body.paymentMethod,
      status: "ACTIVE",
      startedAt: new Date(),
      nextBillingAt: new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json(subscription, { status: 201 });
}
