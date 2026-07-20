import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { getPlanPricing, type PlatformPlan } from "@/lib/billing";
import { PLAN_LABELS } from "@/lib/planLabels";
import {
  isMercadoPagoConfigured,
  createSubscription,
  encodeExternalReference,
} from "@/lib/mercadopago";

const PAID_PLANS: PlatformPlan[] = ["PRO", "ENTERPRISE"];

// POST /api/billing/subscribe { plan: "PRO" | "ENTERPRISE" }
// Starts a Mercado Pago recurring subscription for the gestor's barbershop and
// returns the checkout URL to redirect to. The plan is NOT activated here — it
// flips only when Mercado Pago confirms payment via /api/billing/webhook.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Apenas o dono da barbearia pode assinar" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const plan = body?.plan as PlatformPlan | undefined;
  if (!plan || !PAID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const pricing = await getPlanPricing();
  const amount = pricing[plan].price;

  // Dev / not-configured fallback: no real charge, let the UI activate instantly
  // so the flow stays testable before Mercado Pago credentials are wired.
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ simulated: true });
  }

  try {
    const baseUrl = process.env.APP_URL || request.nextUrl.origin;
    const { id, initPoint } = await createSubscription({
      reason: `CORTIX ${PLAN_LABELS[plan]}`,
      amount,
      payerEmail: session.email,
      externalReference: encodeExternalReference(session.barbershopId, plan),
      backUrl: `${baseUrl}/dashboard/subscriptions?mp=return`,
      notificationUrl: `${baseUrl}/api/billing/webhook`,
    });

    // Track the pending subscription; the plan itself flips on webhook confirm.
    await prisma.barbershop.update({
      where: { id: session.barbershopId },
      data: { mpPreapprovalId: id, mpSubscriptionStatus: "pending" },
    });

    return NextResponse.json({ initPoint });
  } catch (error) {
    console.error("[billing/subscribe]", error);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente novamente." }, { status: 502 });
  }
}
