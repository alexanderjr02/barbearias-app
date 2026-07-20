import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createMembershipCharge, isPaymentProvider, providerRequiresCpf } from "@/lib/payments";

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
  type SubscriptionRow = (typeof mine)[number];
  const mySubscription =
    mine.find((s: SubscriptionRow) => s.status === "ACTIVE" || s.status === "PAST_DUE") ?? mine[0] ?? null;

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
      valueConsumed: visits.reduce((acc: number, v: (typeof visits)[number]) => acc + v.totalPrice, 0),
      totalPaid: monthsActive * mySubscription.plan.price,
    };
  }

  return NextResponse.json({
    plans: plans.map((p: (typeof plans)[number]) => ({
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

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: body.planId },
    include: { barbershop: { select: { id: true, name: true, paymentProvider: true, paymentApiKey: true } } },
  });
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
  const nextBillingAt = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000);
  const provider = plan.barbershop.paymentProvider;
  const apiKey = plan.barbershop.paymentApiKey;

  // No payment provider connected → simulated activation (keeps the flow usable
  // in demo/dev; the barbershop connects a provider to charge for real).
  if (!provider || !apiKey || !isPaymentProvider(provider)) {
    const subscription = await prisma.clientSubscription.create({
      data: {
        planId: plan.id,
        clientId: user.id,
        clientName: user.name,
        clientPhone: user.phone ?? "",
        paymentMethod: body.paymentMethod,
        status: "ACTIVE",
        startedAt: new Date(),
        nextBillingAt,
      },
    });
    return NextResponse.json({ simulated: true, subscription }, { status: 201 });
  }

  const cpfCnpj = typeof body.cpfCnpj === "string" ? body.cpfCnpj : undefined;
  if (providerRequiresCpf(provider) && !cpfCnpj) {
    return NextResponse.json({ error: "CPF é obrigatório para este pagamento", needsCpf: true }, { status: 400 });
  }

  // Real charge → create the subscription as PENDING; the webhook flips it to
  // ACTIVE once the provider confirms the payment.
  const subscription = await prisma.clientSubscription.create({
    data: {
      planId: plan.id,
      clientId: user.id,
      clientName: user.name,
      clientPhone: user.phone ?? "",
      paymentMethod: body.paymentMethod,
      status: "PENDING",
      startedAt: new Date(),
      nextBillingAt,
    },
  });

  const baseUrl = process.env.APP_URL || request.nextUrl.origin;
  const notificationUrl = `${baseUrl}/api/client/subscriptions/webhook`;

  try {
    const charge = await createMembershipCharge(provider, apiKey, {
      method: body.paymentMethod,
      amount: plan.price,
      description: `${plan.name} · ${plan.barbershop.name}`,
      payerEmail: user.email,
      payerName: user.name,
      payerPhone: user.phone ?? undefined,
      cpfCnpj,
      externalReference: subscription.id,
      backUrl: `${baseUrl}/`,
      notificationUrl,
    });

    if (charge.kind === "pix") {
      await prisma.clientSubscription.update({ where: { id: subscription.id }, data: { mpPaymentId: charge.id } });
      return NextResponse.json(
        { subscriptionId: subscription.id, provider, pix: { qrCode: charge.qrCode, qrCodeBase64: charge.qrCodeBase64 } },
        { status: 201 }
      );
    }
    await prisma.clientSubscription.update({ where: { id: subscription.id }, data: { mpPreapprovalId: charge.id } });
    return NextResponse.json({ subscriptionId: subscription.id, provider, initPoint: charge.initPoint }, { status: 201 });
  } catch (error) {
    console.error("[client-subscribe]", error);
    await prisma.clientSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
    const message = error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
