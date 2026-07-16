import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fetchMembershipStatus, isPaymentProvider } from "@/lib/payments";

// POST /api/client/subscriptions/check { subscriptionId } — the app polls this
// after showing the Pix/checkout so the payment confirms IN the app, without
// waiting on the provider webhook. Re-fetches the real status from the
// barbershop's provider and flips the subscription to ACTIVE when paid.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.subscriptionId;
  if (!id) {
    return NextResponse.json({ error: "subscriptionId é obrigatório" }, { status: 400 });
  }

  const sub = await prisma.clientSubscription.findFirst({
    where: { id, clientId: session.sub },
    include: { plan: { include: { barbershop: { select: { paymentProvider: true, paymentApiKey: true } } } } },
  });
  if (!sub) {
    return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
  }

  if (sub.status !== "PENDING") {
    return NextResponse.json({ status: sub.status });
  }

  const provider = sub.plan.barbershop.paymentProvider;
  const apiKey = sub.plan.barbershop.paymentApiKey;
  if (!provider || !apiKey || !isPaymentProvider(provider)) {
    return NextResponse.json({ status: sub.status });
  }

  const result = await fetchMembershipStatus(provider, apiKey, {
    method: sub.paymentMethod as "PIX" | "CREDIT_CARD",
    mpPaymentId: sub.mpPaymentId,
    mpPreapprovalId: sub.mpPreapprovalId,
  });

  if (result === "paid") {
    await prisma.clientSubscription.update({ where: { id: sub.id }, data: { status: "ACTIVE" } });
    return NextResponse.json({ status: "ACTIVE" });
  }
  if (result === "failed") {
    await prisma.clientSubscription.update({ where: { id: sub.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    return NextResponse.json({ status: "CANCELLED" });
  }
  return NextResponse.json({ status: "PENDING" });
}
