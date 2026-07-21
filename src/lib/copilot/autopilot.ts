import { prisma } from "@/lib/db";
import { planHasAI } from "@/lib/billing";
import { notifyClient, notifyClientMarketing } from "@/lib/gestorNotifications";
import { churnedClients, emptySlotsThisWeek } from "./insights";
import { addUtcDays } from "@/lib/dateRange";

// The autonomous auto-piloto: it's ON by default on Pro+ and reacts in
// real time (24/7) to events like a cancellation, plus the scheduled
// automations. `autopilotLevel`: "off" | "suggest" | "auto".
export function autopilotActive(plan: string | null | undefined, level: string | null | undefined): boolean {
  return planHasAI(plan) && level !== "off";
}

export async function logAutopilot(barbershopId: string, action: string, detail: string, recoveredValue?: number | null): Promise<void> {
  await prisma.autopilotLog.create({ data: { barbershopId, action, detail, recoveredValue: recoveredValue ?? null } });
}

export interface WeekFillResult {
  sent: number;
  freeSlots: number;
  audience: number;
  reason?: "plan" | "level" | "cooldown" | "no-slots" | "no-audience";
}

/**
 * "Encher a semana" — a campanha proativa que transforma horário vago (dinheiro
 * parado) em agendamento. O Copiloto olha os próximos dias, vê a capacidade
 * ociosa e convida um punhado de clientes ativos a preencher.
 *
 * As TRÊS travas que impedem virar spam (marketing automático precisa de
 * coleira):
 *  1. Nível — sozinho só no "auto" (Agir sozinho). O `manual: true` é quando o
 *     gestor toca "Enviar" no modo Sugerir (decisão consciente dele).
 *  2. Frequência — no automático roda no máximo uma vez a cada 6 dias; e nunca
 *     manda para quem recebeu QUALQUER aviso nos últimos 7 dias.
 *  3. Consentimento — notifyClientMarketing só entrega a quem aceitou (LGPD).
 * Além disso, público limitado (máx 20) e só a clientes ativos.
 */
export async function runWeekFillCampaign(
  barbershopId: string,
  shopName: string,
  plan: string | null | undefined,
  level: string | null | undefined,
  opts: { manual?: boolean } = {},
): Promise<WeekFillResult> {
  const manual = opts.manual === true;
  if (!planHasAI(plan)) return { sent: 0, freeSlots: 0, audience: 0, reason: "plan" };
  if (!manual && level !== "auto") return { sent: 0, freeSlots: 0, audience: 0, reason: "level" };

  // Trava de frequência (só no automático): uma vez a cada 6 dias.
  if (!manual) {
    const recent = await prisma.autopilotLog.findFirst({
      where: { barbershopId, action: "fill_week", createdAt: { gte: addUtcDays(new Date(), -6) } },
      select: { id: true },
    });
    if (recent) return { sent: 0, freeSlots: 0, audience: 0, reason: "cooldown" };
  }

  const week = await emptySlotsThisWeek(barbershopId, 6);
  // Precisa valer a pena: no automático exige capacidade real; no manual basta
  // ter alguma vaga.
  if (week.totalFree < (manual ? 1 : 6)) return { sent: 0, freeSlots: week.totalFree, audience: 0, reason: "no-slots" };

  // Público: consentiu + ativo (veio nos últimos 60 dias) + NÃO recebeu nada
  // nos últimos 7 dias. Máx 20.
  const links = await prisma.barbershopClient.findMany({
    where: { barbershopId, marketingConsent: true, status: { not: "BLOCKED" } },
    select: { userId: true },
  });
  const consentIds = (links as { userId: string }[]).map((l) => l.userId);
  if (consentIds.length === 0) return { sent: 0, freeSlots: week.totalFree, audience: 0, reason: "no-audience" };

  const activeAppts = await prisma.appointment.findMany({
    where: { barbershopId, clientId: { in: consentIds }, date: { gte: addUtcDays(new Date(), -60) } },
    select: { clientId: true },
    distinct: ["clientId"],
  });
  const activeIds = (activeAppts as { clientId: string | null }[]).map((a) => a.clientId).filter((x): x is string => !!x);
  if (activeIds.length === 0) return { sent: 0, freeSlots: week.totalFree, audience: 0, reason: "no-audience" };

  const recentNotified = await prisma.notification.findMany({
    where: { barbershopId, clientId: { in: activeIds }, createdAt: { gte: addUtcDays(new Date(), -7) } },
    select: { clientId: true },
    distinct: ["clientId"],
  });
  const skip = new Set((recentNotified as { clientId: string | null }[]).map((n) => n.clientId));
  const audience = activeIds.filter((id) => !skip.has(id)).slice(0, 20);
  if (audience.length === 0) return { sent: 0, freeSlots: week.totalFree, audience: 0, reason: "no-audience" };

  let sent = 0;
  for (const clientId of audience) {
    const ok = await notifyClientMarketing(
      barbershopId,
      clientId,
      "APPOINTMENT_CONFIRMED",
      "Que tal um corte esta semana?",
      `Abriram horários na ${shopName} nos próximos dias. Bora garantir o seu antes que encham? É só tocar aqui.`,
      "/appointments",
    );
    if (ok) sent++;
  }
  if (sent > 0) {
    await logAutopilot(barbershopId, "fill_week", `Convidei ${sent} cliente(s) pra preencher os ${week.totalFree} horários vagos da semana.`);
  }
  return { sent, freeSlots: week.totalFree, audience: audience.length };
}

/** Fired the instant a slot frees (a cancellation) — the real-time 24/7 fill:
 * ping the waitlist, and if it's empty, offer the opening to a few clients who
 * went quiet. Logs the recovered value (the service price). */
export async function onSlotOpened(barbershopId: string, freed: { startTime?: string; price?: number | null }): Promise<void> {
  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true, autopilotLevel: true, name: true } });
  if (!shop || !autopilotActive(shop.plan, shop.autopilotLevel)) return;

  const shopName = shop.name ?? "sua barbearia";
  const whenTxt = freed.startTime ? ` das ${freed.startTime}` : "";
  let reached = 0;

  const waiting = await prisma.waitlistEntry.findMany({ where: { barbershopId, status: "WAITING", clientId: { not: null } }, select: { id: true, clientId: true } });
  for (const w of waiting as { id: string; clientId: string | null }[]) {
    if (w.clientId) {
      await notifyClient(barbershopId, w.clientId, "APPOINTMENT_CONFIRMED", "Abriu um horário!", `Vagou um horário${whenTxt} na ${shopName}. Corra, é por ordem de chegada!`, "/appointments");
      reached++;
    }
  }
  if (waiting.length) await prisma.waitlistEntry.updateMany({ where: { id: { in: (waiting as { id: string }[]).map((w) => w.id) } }, data: { status: "DONE" } });

  // No one waiting? Offer it to a few clients who've gone quiet.
  if (reached === 0) {
    // Puxar cliente sumido é MARKETING (ele não pediu para ser avisado), ao
    // contrário da fila de espera acima, que é transacional — quem entrou na
    // fila pediu exatamente esse aviso.
    const churned = (await churnedClients(barbershopId, 30, 10)).filter((c) => c.clientId).slice(0, 3);
    for (const c of churned) {
      const ok = await notifyClientMarketing(barbershopId, c.clientId!, "APPOINTMENT_CONFIRMED", "Abriu um horário", `Surgiu um horário${whenTxt} na ${shopName}. Que tal aproveitar pra dar aquele trato?`, "/appointments");
      if (ok) reached++;
    }
  }

  if (reached > 0) {
    await logAutopilot(barbershopId, "slot_filled", `Horário${whenTxt} vagou — avisei ${reached} cliente(s) na hora.`, freed.price ?? null);
  }
}
