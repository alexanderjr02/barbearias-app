import { prisma } from "@/lib/db";
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendPushToBarbershopStaff, sendPushToUser } from "@/lib/push";

export const NOTIFICATION_TYPES = ["NEW_APPOINTMENT", "APPOINTMENT_CANCELLED", "SUPPORT_REPLY"] as const;
export type GestorNotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CLIENT_NOTIFICATION_TYPES = ["APPOINTMENT_CONFIRMED", "APPOINTMENT_CANCELLED_BY_SHOP", "APPOINTMENT_COMPLETED"] as const;
export type ClientNotificationType = (typeof CLIENT_NOTIFICATION_TYPES)[number];

// Ponto único das notificações da equipe (gestor/barbeiro). Grava a linha que
// o sininho do app lê E dispara o push, para o celular apitar mesmo com o app
// fechado. O push só sai para quem ativou notificações naquele aparelho; sem
// VAPID configurado, sendPushToBarbershopStaff é um no-op.
export async function notifyBarbershop(barbershopId: string, type: GestorNotificationType, title: string, body: string, link?: string) {
  await prisma.notification.create({ data: { barbershopId, type, title, body, link } });
  // Push é best-effort: uma falha aqui não pode derrubar a ação que gerou o
  // aviso (criar um agendamento, por exemplo).
  try {
    await sendPushToBarbershopStaff(barbershopId, { title, body, url: link ?? "/", tag: type });
  } catch (err) {
    console.error("[notifyBarbershop] push falhou", err);
  }
}

// Same table, same future push hook — but targeted at one client instead of
// the whole shop (their appointment status changed). Kept as a separate
// function name so call sites read clearly about who ends up seeing it.
//
// Também MANDA NO WHATSAPP. Isto estava faltando: confirmação de agendamento,
// aniversário e win-back só criavam a notificação dentro do app, então o
// cliente que não abrisse o app nunca era avisado — enquanto a landing
// anuncia "lembrete no WhatsApp que derruba as faltas" em sete lugares.
// Sem as chaves da Meta configuradas, sendWhatsAppText apenas registra no log
// (o fluxo continua testável), então isto passa a funcionar de verdade no dia
// em que WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID forem preenchidos.
export async function notifyClient(barbershopId: string, clientId: string, type: ClientNotificationType, title: string, body: string, link?: string) {
  await prisma.notification.create({ data: { barbershopId, clientId, type, title, body, link } });
  await sendClientWhatsApp(clientId, title, body);
  // Push para todos os aparelhos do cliente — mesmo best-effort do WhatsApp.
  try {
    await sendPushToUser(clientId, { title, body, url: link ?? "/", tag: type });
  } catch (err) {
    console.error("[notifyClient] push falhou", err);
  }
}

/**
 * Envio de MARKETING (promoção, win-back, aniversário) — só vai para quem
 * autorizou receber daquela barbearia.
 *
 * A separação entre transacional e marketing é a que a lei faz: avisar que o
 * SEU agendamento foi confirmado é legítimo sem aceite; oferecer promoção não
 * é. Antes disto o disparo em massa ia para todo mundo, o que é exposição de
 * LGPD e — agora que o WhatsApp está ligado — risco de a conta Meta ser
 * derrubada por denúncia de spam.
 *
 * Devolve true se enviou, para o chamador poder dizer quantos receberam de
 * verdade em vez de quantos existiam.
 */
export async function notifyClientMarketing(
  barbershopId: string,
  clientId: string,
  type: ClientNotificationType,
  title: string,
  body: string,
  link?: string,
): Promise<boolean> {
  const link_ = await prisma.barbershopClient.findUnique({
    where: { userId_barbershopId: { userId: clientId, barbershopId } },
    select: { marketingConsent: true, status: true },
  });
  // Sem aceite explícito, não envia. Cliente bloqueado também não recebe.
  if (!link_?.marketingConsent || link_.status === "BLOCKED") return false;

  await prisma.notification.create({ data: { barbershopId, clientId, type, title, body, link } });
  await sendClientWhatsApp(clientId, title, body);
  return true;
}

/** Envio best-effort: falha de WhatsApp nunca pode derrubar a ação que a
 * originou (confirmar um agendamento, concluir um atendimento). */
async function sendClientWhatsApp(clientId: string, title: string, body: string) {
  if (!isWhatsAppConfigured()) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: clientId }, select: { phone: true } });
    if (!user?.phone) return;
    await sendWhatsAppText(user.phone, `*${title}*\n\n${body}`);
  } catch (err) {
    console.warn("[notifyClient] WhatsApp não enviado:", err);
  }
}
