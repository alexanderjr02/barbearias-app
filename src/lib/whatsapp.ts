// WhatsApp messaging via the official Meta WhatsApp Cloud API (Graph API),
// called with fetch — no SDK.
//
// MULTI-BARBEARIA: as credenciais (token + número) vêm da conexão de CADA
// barbearia (tabela WhatsappConnection), não mais de uma variável única. Toda
// função de envio recebe o barbershopId e resolve o remetente daquela loja.
//
// Fallback: se a barbearia não tiver conexão própria, cai para as variáveis de
// ambiente WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID — o "número único da
// plataforma", útil para testar antes de existir conexão por barbearia. Sem
// nenhum dos dois, a mensagem vira log (não quebra o fluxo).
//
// IMPORTANT (Meta policy): mensagem iniciada pela empresa, fora da janela de
// 24h, PRECISA de um template aprovado (sendWhatsAppTemplate). Texto livre só
// chega a quem mandou mensagem nas últimas 24h.
import { prisma } from "@/lib/db";

const GRAPH_BASE = "https://graph.facebook.com";

export interface WhatsappCredentials {
  token: string;
  phoneNumberId: string;
  templateName?: string | null;
  templateLang: string;
}

// Resolve o remetente daquela barbearia: primeiro a conexão própria (Embedded
// Signup ou cadastro manual), depois o número único da plataforma via env.
export async function resolveWhatsappCredentials(barbershopId: string): Promise<WhatsappCredentials | null> {
  const conn = await prisma.whatsappConnection.findUnique({ where: { barbershopId } }).catch(() => null);
  if (conn?.accessToken && conn.phoneNumberId && conn.status !== "error") {
    return {
      token: conn.accessToken,
      phoneNumberId: conn.phoneNumberId,
      templateName: conn.templateName,
      templateLang: conn.templateLang || "pt_BR",
    };
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (token && phoneNumberId) {
    return {
      token,
      phoneNumberId,
      templateName: process.env.WHATSAPP_TEMPLATE_CONFIRMATION?.trim() || null,
      templateLang: process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR",
    };
  }
  return null;
}

// Aquela barbearia consegue enviar WhatsApp (tem conexão própria OU env)?
export async function isWhatsAppConfigured(barbershopId: string): Promise<boolean> {
  return (await resolveWhatsappCredentials(barbershopId)) !== null;
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

async function send(barbershopId: string, payload: Record<string, unknown>): Promise<void> {
  const creds = await resolveWhatsappCredentials(barbershopId);
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!creds) {
    console.warn(`[whatsapp] barbearia ${barbershopId} sem conexão — mensagem NÃO enviada:\n${JSON.stringify(payload)}`);
    return;
  }

  const res = await fetch(`${GRAPH_BASE}/${version}/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WhatsApp API ${res.status}: ${detail.slice(0, 300)}`);
  }
}

// Free-form text (only delivered inside the 24h session window).
export async function sendWhatsAppText(barbershopId: string, toPhone: string, message: string): Promise<void> {
  const to = toWhatsAppNumber(toPhone);
  if (!to) return;
  await send(barbershopId, { to, type: "text", text: { body: message } });
}

// Pre-approved template message (for business-initiated notifications).
export async function sendWhatsAppTemplate(
  barbershopId: string,
  toPhone: string,
  templateName: string,
  languageCode = "pt_BR",
  components?: unknown[]
): Promise<void> {
  const to = toWhatsAppNumber(toPhone);
  if (!to) return;
  await send(barbershopId, {
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
 * Texto livre não chega a um cliente novo: a Meta só o entrega a quem mandou
 * mensagem para a empresa nas últimas 24h — o que um cliente recém-agendado
 * NÃO fez. Por isso, se a barbearia tem um template aprovado, manda por ele;
 * sem template, cai no texto livre (certo em dev e válido dentro da janela).
 *
 * O template precisa ter EXATAMENTE seis variáveis, nesta ordem (a Meta as
 * identifica por posição): {{1}} cliente {{2}} barbearia {{3}} serviço
 * {{4}} barbeiro {{5}} data {{6}} hora. Categoria: UTILITY.
 */
export async function sendBookingConfirmation(barbershopId: string, toPhone: string, input: BookingConfirmationInput): Promise<void> {
  const creds = await resolveWhatsappCredentials(barbershopId);
  const templateName = creds?.templateName?.trim();

  if (!templateName) {
    await sendWhatsAppText(barbershopId, toPhone, bookingConfirmationText(input));
    return;
  }

  const firstName = input.clientName.trim().split(/\s+/)[0] || input.clientName;
  await sendWhatsAppTemplate(barbershopId, toPhone, templateName, creds?.templateLang || "pt_BR", [
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

// Booking confirmation copy, shared so tone stays consistent. Sem emojis — as
// mensagens automáticas do sistema seguem essa linha.
export function bookingConfirmationText(input: BookingConfirmationInput): string {
  const firstName = input.clientName.trim().split(/\s+/)[0] || "";
  return (
    `Olá, ${firstName}!\n\n` +
    `Seu horário na *${input.barbershopName}* está confirmado:\n` +
    `- ${input.serviceName} com ${input.staffName}\n` +
    `- ${input.dateLabel} às ${input.startTime}\n\n` +
    `Se precisar remarcar ou cancelar, é só responder por aqui. Até breve!`
  );
}
