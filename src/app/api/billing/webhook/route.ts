import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordPlanChangeInvoice, PLANS, type PlatformPlan } from "@/lib/billing";
import { getSubscription, decodeExternalReference } from "@/lib/mercadopago";

// Mercado Pago pings this URL on subscription events. We NEVER trust the
// payload's contents beyond the resource id — we re-fetch the subscription
// straight from MP (authenticated with our token) to learn its real status
// and which barbershop/plan it belongs to. So a forged request can't flip a
// plan: the id has to map to a genuine preapproval in our own account.
export async function POST(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const body = await request.json().catch(() => null);

    const type = body?.type ?? body?.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
    const id =
      body?.data?.id ?? body?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");

    // We only act on subscription (preapproval) events; acknowledge the rest.
    const isPreapproval = typeof type === "string" && type.includes("preapproval");
    if (!isPreapproval || !id) {
      return NextResponse.json({ received: true });
    }

    const sub = await getSubscription(String(id));
    if (!sub) return NextResponse.json({ received: true });

    const decoded = decodeExternalReference(sub.externalReference);
    if (!decoded) return NextResponse.json({ received: true });

    const plan = (PLANS as readonly string[]).includes(decoded.plan) ? (decoded.plan as PlatformPlan) : null;
    const shop = await prisma.barbershop.findUnique({
      where: { id: decoded.barbershopId },
      select: { id: true, plan: true, mpPreapprovalId: true },
    });
    if (!shop || !plan) return NextResponse.json({ received: true });

    if (sub.status === "authorized") {
      if (shop.plan !== plan) {
        await recordPlanChangeInvoice(shop.id, plan, shop.plan);
      }
      await prisma.barbershop.update({
        where: { id: shop.id },
        data: { plan, mpPreapprovalId: sub.id, mpSubscriptionStatus: "authorized" },
      });
    } else if (sub.status === "cancelled" || sub.status === "paused") {
      // Only downgrade if this is the barbershop's CURRENT subscription — an
      // old, superseded preapproval being cancelled must not knock down a
      // newer active plan.
      if (shop.mpPreapprovalId === sub.id) {
        await prisma.barbershop.update({
          where: { id: shop.id },
          data: { plan: "FREE", mpSubscriptionStatus: sub.status },
        });
      }
    } else {
      await prisma.barbershop.update({
        where: { id: shop.id },
        data: { mpSubscriptionStatus: sub.status },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[billing/webhook]", error);
    // Still 200 so Mercado Pago doesn't hammer retries on a transient error.
    return NextResponse.json({ received: true });
  }
}

// Mercado Pago (and manual checks) may hit the URL with GET to verify it's live.
export function GET() {
  return NextResponse.json({ ok: true });
}
