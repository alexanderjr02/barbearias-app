import { prisma } from "./db";

export const NOTIFICATION_TYPES = [
  "INVOICE_FAILED",
  "BARBERSHOP_SUSPENDED",
  "NEW_IP_LOGIN",
  "HEALTH_SCORE_DROPPED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Records what WOULD go out over email — no real provider (Resend, SendGrid,
// etc) is configured anywhere in this app, so delivery is intentionally a
// stub. The rule/content/audience logic below is real; only the very last
// step (actually sending) is not. Wiring a real provider later means adding
// one call here — nothing else in the app needs to change.
export async function notify(type: NotificationType, subject: string, body: string, metadata?: Record<string, unknown>) {
  const setting = await prisma.notificationSetting.findUnique({ where: { type } });
  if (setting && !setting.enabled) return;

  await prisma.notificationLog.create({
    data: {
      type,
      subject,
      body,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: "PENDING_INTEGRATION",
    },
  });

  // TODO: once a real email provider is configured (env var with an API
  // key), send here — e.g. `await resend.emails.send({ to: OWNER_EMAIL,
  // subject, html: body })` — and update the NotificationLog row's status
  // to "SENT" or "FAILED" accordingly.
}
