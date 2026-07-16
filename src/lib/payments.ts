// Provider-agnostic layer for charging a barbershop's client memberships.
// The gestor picks a provider and connects their OWN account; the money goes
// straight to them. Adding a new gateway = one more branch here, nothing else
// in the app changes (the subscribe route, webhook and apps all speak this
// interface).

import { createPixPayment, createCardSubscription, getPayment, getPreapproval } from "./mercadopago";

export type PaymentProvider = "MERCADOPAGO" | "ASAAS" | "STRIPE" | "PAGBANK";
export const PAYMENT_PROVIDERS: PaymentProvider[] = ["MERCADOPAGO", "ASAAS", "STRIPE", "PAGBANK"];

export function isPaymentProvider(v: unknown): v is PaymentProvider {
  return v === "MERCADOPAGO" || v === "ASAAS" || v === "STRIPE" || v === "PAGBANK";
}

// Providers that need the payer's CPF/CNPJ to create the charge.
export function providerRequiresCpf(provider: PaymentProvider): boolean {
  return provider === "ASAAS";
}

export type ChargeStatus = "paid" | "pending" | "failed";

export interface ChargeInput {
  method: "PIX" | "CREDIT_CARD";
  amount: number;
  description: string;
  payerEmail: string;
  payerName: string;
  payerPhone?: string;
  cpfCnpj?: string;
  externalReference: string;
  backUrl: string;
  notificationUrl: string;
}

// Either the client pays a Pix QR right in the app, or is sent to the
// provider's hosted checkout — both apps already handle these two shapes.
export type ChargeResult =
  | { kind: "pix"; id: string; qrCode: string; qrCodeBase64: string }
  | { kind: "redirect"; id: string; initPoint: string };

export async function createMembershipCharge(
  provider: PaymentProvider,
  apiKey: string,
  input: ChargeInput
): Promise<ChargeResult> {
  if (provider === "MERCADOPAGO") {
    if (input.method === "PIX") {
      const pix = await createPixPayment(apiKey, {
        amount: input.amount,
        description: input.description,
        payerEmail: input.payerEmail,
        payerFirstName: input.payerName.trim().split(/\s+/)[0],
        externalReference: input.externalReference,
        notificationUrl: input.notificationUrl,
      });
      return { kind: "pix", id: pix.id, qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64 };
    }
    const sub = await createCardSubscription(apiKey, {
      reason: input.description,
      amount: input.amount,
      payerEmail: input.payerEmail,
      externalReference: input.externalReference,
      backUrl: input.backUrl,
      notificationUrl: input.notificationUrl,
    });
    return { kind: "redirect", id: sub.id, initPoint: sub.initPoint };
  }

  if (provider === "STRIPE") {
    return createStripeCharge(apiKey, input);
  }

  if (provider === "PAGBANK") {
    return createPagBankCharge(apiKey, input);
  }

  // ASAAS — true recurring (Pix/cartão/boleto) via a monthly subscription; the
  // client pays the first charge on Asaas's hosted invoice page.
  return createAsaasCharge(apiKey, input);
}

// Re-fetches the real payment status from the provider (used by the in-app
// "check payment" poll and the webhook), so a client's Pix confirms in the app
// even before the webhook lands.
export async function fetchMembershipStatus(
  provider: PaymentProvider,
  apiKey: string,
  ids: { method: "PIX" | "CREDIT_CARD"; mpPaymentId: string | null; mpPreapprovalId: string | null }
): Promise<ChargeStatus> {
  try {
    if (provider === "MERCADOPAGO") {
      if (ids.method === "PIX" && ids.mpPaymentId) {
        const info = await getPayment(apiKey, ids.mpPaymentId);
        if (!info) return "pending";
        if (info.status === "approved") return "paid";
        return ["cancelled", "rejected"].includes(info.status) ? "failed" : "pending";
      }
      if (ids.mpPreapprovalId) {
        const info = await getPreapproval(apiKey, ids.mpPreapprovalId);
        if (!info) return "pending";
        if (info.status === "authorized") return "paid";
        return info.status === "cancelled" ? "failed" : "pending";
      }
      return "pending";
    }
    if (provider === "ASAAS" && ids.mpPreapprovalId) {
      return fetchAsaasSubscriptionStatus(apiKey, ids.mpPreapprovalId);
    }
    if (provider === "STRIPE" && ids.mpPreapprovalId) {
      return fetchStripeSessionStatus(apiKey, ids.mpPreapprovalId);
    }
    if (provider === "PAGBANK" && ids.mpPreapprovalId) {
      return fetchPagBankStatus(apiKey, ids.mpPreapprovalId);
    }
    return "pending";
  } catch {
    return "pending";
  }
}

// ---------------------------------------------------------------------------
// Asaas
// ---------------------------------------------------------------------------

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

async function asaas(apiKey: string, path: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: { access_token: apiKey, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !data) {
    const errors = data?.errors as { description?: string }[] | undefined;
    throw new Error(errors?.[0]?.description ?? `Asaas ${res.status}`);
  }
  return data;
}

async function createAsaasCharge(apiKey: string, input: ChargeInput): Promise<ChargeResult> {
  if (!input.cpfCnpj) throw new Error("CPF é obrigatório para pagar com este provedor");

  const customer = await asaas(apiKey, "/customers", "POST", {
    name: input.payerName,
    email: input.payerEmail,
    cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
    mobilePhone: input.payerPhone?.replace(/\D/g, "") || undefined,
  });

  const nextDueDate = new Date().toISOString().slice(0, 10);
  const subscription = await asaas(apiKey, "/subscriptions", "POST", {
    customer: customer.id,
    billingType: input.method === "PIX" ? "PIX" : "CREDIT_CARD",
    value: input.amount,
    nextDueDate,
    cycle: "MONTHLY",
    description: input.description,
    externalReference: input.externalReference,
  });

  // The subscription's first payment carries the invoice URL the client opens.
  const payments = await asaas(apiKey, `/subscriptions/${subscription.id}/payments`, "GET");
  const first = (payments.data as { invoiceUrl?: string }[] | undefined)?.[0];
  if (!first?.invoiceUrl) throw new Error("Asaas não retornou o link de pagamento");
  return { kind: "redirect", id: String(subscription.id), initPoint: first.invoiceUrl };
}

function mapAsaasStatus(status: string): ChargeStatus {
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status)) return "paid";
  if (["OVERDUE", "REFUNDED", "CHARGEBACK_REQUESTED"].includes(status)) return "failed";
  return "pending";
}

// Webhook confirmation (by payment id) — re-fetch instead of trusting the body.
export async function fetchAsaasPaymentStatus(apiKey: string, paymentId: string): Promise<ChargeStatus> {
  try {
    const payment = await asaas(apiKey, `/payments/${paymentId}`, "GET");
    return mapAsaasStatus(String(payment.status ?? ""));
  } catch {
    return "pending";
  }
}

// Poll a subscription's first payment status (used by the in-app confirmation).
async function fetchAsaasSubscriptionStatus(apiKey: string, subscriptionId: string): Promise<ChargeStatus> {
  try {
    const payments = await asaas(apiKey, `/subscriptions/${subscriptionId}/payments`, "GET");
    const first = (payments.data as { status?: string }[] | undefined)?.[0];
    return first?.status ? mapAsaasStatus(String(first.status)) : "pending";
  } catch {
    return "pending";
  }
}

// ---------------------------------------------------------------------------
// Stripe — recurring card subscription via Checkout (hosted). Best for cards /
// international; Pix support in BR is limited, so we always use the card flow.
// ---------------------------------------------------------------------------

const STRIPE_BASE = "https://api.stripe.com/v1";

async function stripe(secretKey: string, path: string, method: string, form?: URLSearchParams): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !data) {
    const err = data?.error as { message?: string } | undefined;
    throw new Error(err?.message ?? `Stripe ${res.status}`);
  }
  return data;
}

async function createStripeCharge(secretKey: string, input: ChargeInput): Promise<ChargeResult> {
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", input.backUrl);
  form.set("cancel_url", input.backUrl);
  form.set("client_reference_id", input.externalReference);
  form.set("customer_email", input.payerEmail);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "brl");
  form.set("line_items[0][price_data][product_data][name]", input.description);
  form.set("line_items[0][price_data][unit_amount]", String(Math.round(input.amount * 100)));
  form.set("line_items[0][price_data][recurring][interval]", "month");

  const session = await stripe(secretKey, "/checkout/sessions", "POST", form);
  const url = session.url as string | undefined;
  if (!url) throw new Error("Stripe não retornou o link de checkout");
  return { kind: "redirect", id: String(session.id), initPoint: url };
}

async function fetchStripeSessionStatus(secretKey: string, sessionId: string): Promise<ChargeStatus> {
  try {
    const session = await stripe(secretKey, `/checkout/sessions/${sessionId}`, "GET");
    if (session.payment_status === "paid" || session.status === "complete") return "paid";
    if (session.status === "expired") return "failed";
    return "pending";
  } catch {
    return "pending";
  }
}

// ---------------------------------------------------------------------------
// PagBank (PagSeguro) — hosted Checkout where the client pays by Pix or card on
// PagBank's page. Money lands in the barbershop's PagBank account.
// ---------------------------------------------------------------------------

const PAGBANK_BASE = process.env.PAGBANK_BASE_URL || "https://api.pagseguro.com";

async function pagbank(token: string, path: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${PAGBANK_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !data) {
    const errors = data?.error_messages as { description?: string }[] | undefined;
    throw new Error(errors?.[0]?.description ?? `PagBank ${res.status}`);
  }
  return data;
}

async function createPagBankCharge(token: string, input: ChargeInput): Promise<ChargeResult> {
  const checkout = await pagbank(token, "/checkouts", "POST", {
    reference_id: input.externalReference,
    customer: {
      name: input.payerName,
      email: input.payerEmail,
      ...(input.cpfCnpj ? { tax_id: input.cpfCnpj.replace(/\D/g, "") } : {}),
    },
    items: [{ reference_id: "plan", name: input.description, quantity: 1, unit_amount: Math.round(input.amount * 100) }],
    payment_methods: [{ type: "PIX" }, { type: "CREDIT_CARD" }],
    redirect_url: input.backUrl,
    notification_urls: [input.notificationUrl],
  });

  const links = (checkout.links as { rel?: string; href?: string }[] | undefined) ?? [];
  const payLink = links.find((l) => l.rel?.toUpperCase() === "PAY")?.href ?? links.find((l) => l.href?.includes("pagseguro") || l.href?.includes("pagbank"))?.href;
  if (!payLink) throw new Error("PagBank não retornou o link de pagamento");
  return { kind: "redirect", id: String(checkout.id), initPoint: payLink };
}

async function fetchPagBankStatus(token: string, checkoutId: string): Promise<ChargeStatus> {
  try {
    const checkout = await pagbank(token, `/checkouts/${checkoutId}`, "GET");
    const status = String(checkout.status ?? "").toUpperCase();
    if (["PAID", "COMPLETED", "ACTIVE"].includes(status)) return "paid";
    if (["CANCELED", "CANCELLED", "EXPIRED"].includes(status)) return "failed";
    return "pending";
  } catch {
    return "pending";
  }
}
