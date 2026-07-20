// Mercado Pago recurring subscriptions (Assinaturas / "preapproval"), called
// via the REST API with fetch — no SDK dependency.
//
// Configure via env:
//   MERCADOPAGO_ACCESS_TOKEN — your production or test access token (starts
//                              with "APP_USR-" for prod, "TEST-" for sandbox).
//   APP_URL                  — public base URL, used for back_url and the
//                              webhook notification_url. Falls back to the
//                              request origin when unset.
//
// When the token is absent (local dev before credentials), the app doesn't
// break: `subscribe` returns `{ simulated: true }` and the UI activates the
// plan instantly (the old demo behavior), so the whole flow stays testable.

const MP_BASE = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return t;
}

export interface CreateSubscriptionInput {
  reason: string; // e.g. "CORTIX Pro"
  amount: number; // monthly BRL amount
  payerEmail: string;
  externalReference: string; // we use "<barbershopId>:<PLAN>"
  backUrl: string;
  notificationUrl: string;
}

// Creates a monthly BRL subscription and returns the hosted checkout URL the
// gestor is redirected to (card / Pix handled by Mercado Pago, never by us).
export async function createSubscription(input: CreateSubscriptionInput): Promise<{ id: string; initPoint: string }> {
  const res = await fetch(`${MP_BASE}/preapproval`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      notification_url: input.notificationUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "BRL",
      },
      status: "pending",
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new Error(data?.message ?? `Falha ao criar assinatura no Mercado Pago (${res.status})`);
  }
  const initPoint = data.init_point ?? data.sandbox_init_point;
  if (!initPoint) throw new Error("Mercado Pago não retornou o link de checkout");
  return { id: data.id, initPoint };
}

export interface SubscriptionInfo {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  externalReference: string;
}

// Re-fetches a subscription straight from Mercado Pago. The webhook trusts
// THIS (authenticated with our token), never the raw notification payload —
// so a forged webhook can't flip a plan: the id must map to a real
// preapproval in our own account.
export async function getSubscription(id: string): Promise<SubscriptionInfo | null> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data) return null;
  return { id: data.id, status: data.status, externalReference: data.external_reference ?? "" };
}

export async function cancelSubscription(id: string): Promise<void> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? "Falha ao cancelar a assinatura no Mercado Pago");
  }
}

// ---------------------------------------------------------------------------
// Client memberships — charged with the BARBERSHOP's own token (money goes to
// the barbershop, not the platform). These take the token explicitly instead
// of reading the platform env var.
// ---------------------------------------------------------------------------

const MP_V1 = "https://api.mercadopago.com/v1";

export interface PixResult {
  id: string;
  status: string;
  qrCode: string; // "copia e cola"
  qrCodeBase64: string; // PNG image, base64
}

// Instant Pix charge — returns the QR code (image + copia-e-cola) the client
// pays right in the app.
export async function createPixPayment(
  token: string,
  input: { amount: number; description: string; payerEmail: string; payerFirstName?: string; externalReference: string; notificationUrl: string }
): Promise<PixResult> {
  const res = await fetch(`${MP_V1}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${input.externalReference}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      payer: { email: input.payerEmail, first_name: input.payerFirstName },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.message ?? `Falha ao gerar o Pix (${res.status})`);
  const tx = data.point_of_interaction?.transaction_data;
  return { id: String(data.id), status: data.status, qrCode: tx?.qr_code ?? "", qrCodeBase64: tx?.qr_code_base64 ?? "" };
}

export async function getPayment(token: string, id: string): Promise<{ status: string; externalReference: string } | null> {
  const res = await fetch(`${MP_V1}/payments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data) return null;
  return { status: data.status, externalReference: data.external_reference ?? "" };
}

// Recurring monthly card charge (true "gym membership") — returns the hosted
// checkout URL where the client authorizes their card.
export async function createCardSubscription(
  token: string,
  input: { reason: string; amount: number; payerEmail: string; externalReference: string; backUrl: string; notificationUrl: string }
): Promise<{ id: string; initPoint: string }> {
  const res = await fetch(`${MP_BASE}/preapproval`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      notification_url: input.notificationUrl,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: input.amount, currency_id: "BRL" },
      status: "pending",
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.message ?? `Falha ao criar a assinatura (${res.status})`);
  const initPoint = data.init_point ?? data.sandbox_init_point;
  if (!initPoint) throw new Error("Mercado Pago não retornou o link de checkout");
  return { id: String(data.id), initPoint };
}

export async function getPreapproval(token: string, id: string): Promise<{ status: string; externalReference: string } | null> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data) return null;
  return { status: data.status, externalReference: data.external_reference ?? "" };
}

// external_reference carries both the barbershop and the plan it's paying for,
// so the webhook knows what to activate without extra storage.
export function encodeExternalReference(barbershopId: string, plan: string): string {
  return `${barbershopId}:${plan}`;
}

export function decodeExternalReference(ref: string): { barbershopId: string; plan: string } | null {
  const [barbershopId, plan] = ref.split(":");
  if (!barbershopId || !plan) return null;
  return { barbershopId, plan };
}
