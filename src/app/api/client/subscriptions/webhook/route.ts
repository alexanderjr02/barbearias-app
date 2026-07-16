import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayment, getPreapproval } from "@/lib/mercadopago";
import { fetchAsaasPaymentStatus } from "@/lib/payments";

// Payment providers (the BARBERSHOP's own account) ping this when a client's
// membership payment changes. We identify the subscription, then re-fetch the
// real status with that barbershop's own credential — never trusting the raw
// notification body. Handles both Mercado Pago and Asaas payloads.
export async function POST(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const body = await request.json().catch(() => null);

    // --- Asaas: { event, payment: { id, externalReference, subscription } } ---
    if (body?.payment && (body?.event || body?.payment?.externalReference)) {
      const payment = body.payment as { id?: string; externalReference?: string };
      const ref = payment.externalReference;
      if (!ref || !payment.id) return NextResponse.json({ received: true });
      const sub = await findSubscription({ id: ref });
      if (!sub?.apiKey) return NextResponse.json({ received: true });
      const status = await fetchAsaasPaymentStatus(sub.apiKey, String(payment.id));
      await applyStatus(sub.id, sub.status, status);
      return NextResponse.json({ received: true });
    }

    // --- Mercado Pago: type/topic + data.id ---
    const type = body?.type ?? body?.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
    const id = body?.data?.id ?? body?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
    if (!id) return NextResponse.json({ received: true });
    const isPreapproval = typeof type === "string" && type.includes("preapproval");
    const mpId = String(id);

    const sub = await findSubscription(isPreapproval ? { mpPreapprovalId: mpId } : { mpPaymentId: mpId });
    if (!sub?.apiKey) return NextResponse.json({ received: true });

    const info = isPreapproval ? await getPreapproval(sub.apiKey, mpId) : await getPayment(sub.apiKey, mpId);
    if (!info) return NextResponse.json({ received: true });
    const status = isPreapproval
      ? info.status === "authorized" ? "paid" : ["cancelled"].includes(info.status) ? "failed" : "pending"
      : info.status === "approved" ? "paid" : ["cancelled", "rejected"].includes(info.status) ? "failed" : "pending";
    await applyStatus(sub.id, sub.status, status as "paid" | "pending" | "failed");

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[client-subscriptions/webhook]", error);
    return NextResponse.json({ received: true });
  }
}

async function findSubscription(
  where: { id?: string; mpPaymentId?: string; mpPreapprovalId?: string }
): Promise<{ id: string; status: string; apiKey: string | null } | null> {
  const sub = await prisma.clientSubscription.findFirst({
    where,
    include: { plan: { include: { barbershop: { select: { paymentApiKey: true } } } } },
  });
  if (!sub) return null;
  return { id: sub.id, status: sub.status, apiKey: sub.plan.barbershop.paymentApiKey };
}

async function applyStatus(id: string, current: string, status: "paid" | "pending" | "failed") {
  if (status === "paid" && current !== "ACTIVE") {
    await prisma.clientSubscription.update({ where: { id }, data: { status: "ACTIVE" } });
  } else if (status === "failed" && current === "PENDING") {
    await prisma.clientSubscription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  }
}

export function GET() {
  return NextResponse.json({ ok: true });
}
