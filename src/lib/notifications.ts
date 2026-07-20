import { prisma } from "./db";
import { sendMail, isMailerConfigured, platformAlertEmail } from "./mailer";

export const NOTIFICATION_TYPES = [
  "INVOICE_FAILED",
  "BARBERSHOP_SUSPENDED",
  "NEW_IP_LOGIN",
  "HEALTH_SCORE_DROPPED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Alertas operacionais da PLATAFORMA para o dono do sistema — cobrança que
// falhou, barbearia suspensa, login de IP novo, health score despencando.
//
// O destinatário é você, não a barbearia. Sem PLATFORM_ALERT_EMAIL definido,
// cai no e-mail do primeiro SUPER_ADMIN cadastrado — assim o alerta tem para
// onde ir mesmo sem configuração extra.
async function alertRecipient(): Promise<string | null> {
  const fromEnv = process.env.PLATFORM_ALERT_EMAIL?.trim();
  if (fromEnv) return fromEnv;

  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  return admin?.email ?? null;
}

export async function notify(type: NotificationType, subject: string, body: string, metadata?: Record<string, unknown>) {
  const setting = await prisma.notificationSetting.findUnique({ where: { type } });
  if (setting && !setting.enabled) return;

  const log = await prisma.notificationLog.create({
    data: {
      type,
      subject,
      body,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: "PENDING_INTEGRATION",
    },
  });

  // Sem provedor de e-mail ligado, o registro fica em PENDING_INTEGRATION —
  // é o estado honesto: "não falhou, simplesmente ainda não há para onde
  // enviar". Basta preencher RESEND_API_KEY para passar a sair de verdade,
  // sem mexer em código.
  if (!isMailerConfigured()) return;

  // Um alerta que não sai NUNCA pode derrubar a ação que o gerou. notify()
  // roda dentro do login (NEW_IP_LOGIN): se a Resend estiver fora do ar, o
  // certo é registrar FAILED e deixar a pessoa entrar — não recusar o login
  // por causa de um e-mail de aviso.
  try {
    const to = await alertRecipient();
    if (!to) {
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: "FAILED" },
      });
      console.error("[notifications] nenhum destinatário: defina PLATFORM_ALERT_EMAIL ou crie um SUPER_ADMIN");
      return;
    }

    const mail = platformAlertEmail(subject, body, metadata);
    await sendMail({ to, ...mail });
    await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "SENT" } });
  } catch (err) {
    await prisma.notificationLog
      .update({ where: { id: log.id }, data: { status: "FAILED" } })
      .catch(() => { /* banco fora também: só resta o console */ });
    console.error("[notifications] falha ao enviar alerta", err);
  }
}
