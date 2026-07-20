// WhatsApp messaging via the official Meta WhatsApp Cloud API (Graph API),
// called with fetch — no SDK.
//
// Configure via env:
//   WHATSAPP_TOKEN            — permanent access token from Meta (System User).
//   WHATSAPP_PHONE_NUMBER_ID  — the "Phone number ID" of your WhatsApp sender.
//   WHATSAPP_API_VERSION      — optional, defaults to "v21.0".
//
// Without a token the app doesn't break: messages are logged to the server
// console (dev fallback) so the booking flow stays testable before Meta is
// wired.
//
// IMPORTANT (Meta policy): business-INITIATED messages outside the 24h customer
// service window must use a pre-approved *template* (see sendWhatsAppTemplate).
// Plain text only reaches a user who messaged you in the last 24h. For booking
// confirmations in production, create and approve a template in the Meta panel
// and switch the confirmation call to sendWhatsAppTemplate.

const GRAPH_BASE = "https://graph.facebook.com";

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// Normalizes a Brazilian phone to WhatsApp's E.164-without-plus format, e.g.
// "(11) 99999-9999" -> "5511999999999". Leaves already-prefixed numbers alone.
export function toWhatsAppNumber(phone: string): string | null {
  let d = phone.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  // Valid BR mobile with country code is 12–13 digits (55 + 10/11).
  if (d.length < 12 || d.length > 13) return null;
  return d;
}

async function send(payload: Record<string, unknown>): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!token || !phoneNumberId) {
    console.warn(`[whatsapp] não configurado — mensagem NÃO enviada:\n${JSON.stringify(payload)}`);
    return;
  }

  const res = await fetch(`${GRAPH_BASE}/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WhatsApp API ${res.status}: ${detail.slice(0, 300)}`);
  }
}

// Free-form text (only delivered inside the 24h session window).
export async function sendWhatsAppText(toPhone: string, message: string): Promise<void> {
  const to = toWhatsAppNumber(toPhone);
  if (!to) return;
  await send({ to, type: "text", text: { body: message } });
}

// Pre-approved template message (for business-initiated notifications).
// `components` follows the Meta template component schema.
export async function sendWhatsAppTemplate(
  toPhone: string,
  templateName: string,
  languageCode = "pt_BR",
  components?: unknown[]
): Promise<void> {
  const to = toWhatsAppNumber(toPhone);
  if (!to) return;
  await send({
    to,
    type: "template",
    template: { name: templateName, language: { code: languageCode }, ...(components ? { components } : {}) },
  });
}

export interface BookingConfirmationInput {
  clientName: string;
  barbershopName: string;
  serviceName: string;
  staffName: string;
  dateLabel: string;
  startTime: string;
}

/**
 * Confirmação de agendamento — o caminho que a Meta EXIGE para mensagem
 * iniciada pela empresa.
 *
 * Isto existe porque texto livre não chega a um cliente novo. A política da
 * Meta só entrega texto livre a quem mandou mensagem para a empresa nas
 * últimas 24h — exatamente o que um cliente que acabou de agendar pelo app
 * NÃO fez. Sem template, a confirmação sairia daqui, a Meta aceitaria a
 * chamada e a mensagem simplesmente não seria entregue: falha silenciosa, a
 * pior categoria.
 *
 * Com WHATSAPP_TEMPLATE_CONFIRMATION definido, manda pelo template aprovado.
 * Sem a variável, cai no texto livre — que é o certo em desenvolvimento (vai
 * pro log) e continua válido para quem está dentro da janela de 24h.
 *
 * O template aprovado na Meta precisa ter EXATAMENTE seis variáveis, nesta
 * ordem — a Meta as identifica por posição, não por nome:
 *   {{1}} nome do cliente   {{2}} barbearia   {{3}} serviço
 *   {{4}} barbeiro          {{5}} data        {{6}} hora
 * Categoria: UTILITY (transacional) — aprova mais fácil e custa menos que
 * MARKETING.
 */
export async function sendBookingConfirmation(toPhone: string, input: BookingConfirmationInput): Promise<void> {
  const templateName = process.env.WHATSAPP_TEMPLATE_CONFIRMATION?.trim();

  if (!templateName) {
    await sendWhatsAppText(toPhone, bookingConfirmationText(input));
    return;
  }

  const firstName = input.clientName.trim().split(/\s+/)[0] || input.clientName;
  await sendWhatsAppTemplate(toPhone, templateName, process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR", [
    {
      type: "body",
      parameters: [
        { type: "text", text: firstName },
        { type: "text", text: input.barbershopName },
        { type: "text", text: input.serviceName },
        { type: "text", text: input.staffName },
        { type: "text", text: input.dateLabel },
        { type: "text", text: input.startTime },
      ],
    },
  ]);
}

// Booking confirmation copy, shared so tone stays consistent.
export function bookingConfirmationText(input: BookingConfirmationInput): string {
  const firstName = input.clientName.trim().split(/\s+/)[0] || "";
  return (
    `Olá, ${firstName}! ✂️\n\n` +
    `Seu horário na *${input.barbershopName}* está confirmado:\n` +
    `• ${input.serviceName} com ${input.staffName}\n` +
    `• ${input.dateLabel} às ${input.startTime}\n\n` +
    `Se precisar remarcar ou cancelar, é só responder por aqui. Até breve!`
  );
}
