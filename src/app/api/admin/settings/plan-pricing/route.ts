import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { getPlanPricing, PLANS, type PlanPricing, type PlatformPlan } from "@/lib/billing";

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }
  return NextResponse.json(await getPlanPricing());
}

// PATCH body: { plan: "FREE"|"PRO"|"ENTERPRISE", price, appointmentsLimit, staffLimit }
export async function PATCH(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !PLANS.includes(body.plan)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }
  if (typeof body.price !== "number" || body.price < 0) {
    return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  }

  const pricing: PlanPricing = {
    price: body.price,
    appointmentsLimit: body.appointmentsLimit === null ? null : Number(body.appointmentsLimit),
    staffLimit: body.staffLimit === null ? null : Number(body.staffLimit),
  };

  const plan = body.plan as PlatformPlan;
  await prisma.platformSetting.upsert({
    where: { key: `plan_pricing:${plan}` },
    update: { value: JSON.stringify(pricing), updatedBy: session.sub },
    create: { key: `plan_pricing:${plan}`, value: JSON.stringify(pricing), updatedBy: session.sub },
  });

  await logAdminAction({
    actorId: session.sub,
    action: "settings.plan_pricing_updated",
    targetType: "PlatformSetting",
    targetId: `plan_pricing:${plan}`,
    metadata: pricing,
  });

  return NextResponse.json(await getPlanPricing());
}
