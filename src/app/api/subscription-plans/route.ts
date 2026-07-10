import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

const FORBIDDEN = { error: "Assinaturas de clientes é um recurso exclusivo do plano White Label." };

export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  if (shop?.plan !== "ENTERPRISE") {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where: { barbershopId: session.barbershopId },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { client: { select: { avatar: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Usage/ROI is what turns a plain "list of subscribers" into something a
  // gestor can actually act on: how much of what they're paying for has
  // this client actually used, and does the math still make sense for the
  // shop? Matched by phone since a subscriber doesn't need a client login.
  type PlanRow = (typeof plans)[number];
  type SubscriptionRow = PlanRow["subscriptions"][number];

  const phones = [...new Set(plans.flatMap((p: PlanRow) => p.subscriptions.map((s: SubscriptionRow) => s.clientPhone)))];
  const usageAppointments = phones.length
    ? await prisma.appointment.findMany({
        where: { barbershopId: session.barbershopId, clientPhone: { in: phones }, status: "COMPLETED" },
        select: { clientPhone: true, date: true, totalPrice: true, service: { select: { name: true } }, staff: { select: { name: true } } },
        orderBy: { date: "desc" },
      })
    : [];

  type UsageAppointmentRow = (typeof usageAppointments)[number];

  const result = plans.map((plan: PlanRow) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    billingCycle: plan.billingCycle,
    benefits: plan.benefits,
    color: plan.color,
    isActive: plan.isActive,
    subscriptions: plan.subscriptions.map((sub: SubscriptionRow) => {
      const visits = usageAppointments.filter((a: UsageAppointmentRow) => a.clientPhone === sub.clientPhone && a.date >= sub.startedAt);
      const valueConsumed = visits.reduce((acc: number, v: UsageAppointmentRow) => acc + v.totalPrice, 0);
      const monthsActive = Math.max(1, Math.round((Date.now() - sub.startedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const totalPaid = monthsActive * plan.price;
      return {
        id: sub.id,
        clientName: sub.clientName,
        clientPhone: sub.clientPhone,
        clientAvatar: sub.client?.avatar ?? null,
        paymentMethod: sub.paymentMethod,
        status: sub.status,
        startedAt: sub.startedAt,
        nextBillingAt: sub.nextBillingAt,
        visitCount: visits.length,
        valueConsumed,
        totalPaid,
        lastVisitAt: visits[0]?.date ?? null,
        recentVisits: visits.slice(0, 5).map((v: UsageAppointmentRow) => ({ date: v.date, service: v.service.name, staff: v.staff.name, price: v.totalPrice })),
      };
    }),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  if (shop?.plan !== "ENTERPRISE") {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.price !== "number" || body.price <= 0) {
    return NextResponse.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: body.name,
      description: typeof body.description === "string" ? body.description : undefined,
      price: body.price,
      billingCycle: ["MONTHLY", "QUARTERLY", "ANNUAL"].includes(body.billingCycle) ? body.billingCycle : "MONTHLY",
      benefits: typeof body.benefits === "string" ? body.benefits : "",
      color: typeof body.color === "string" ? body.color : "#D4AF37",
      barbershopId: session.barbershopId,
    },
  });

  return NextResponse.json({ ...plan, subscriptions: [] }, { status: 201 });
}
