import { prisma } from "@/lib/db";
import { planHasAI } from "@/lib/billing";
import { notifyClient, notifyClientMarketing } from "@/lib/gestorNotifications";
import { churnedClients } from "./insights";

// The autonomous auto-piloto: it's ON by default on Pro+ and reacts in
// real time (24/7) to events like a cancellation, plus the scheduled
// automations. `autopilotLevel`: "off" | "suggest" | "auto".
export function autopilotActive(plan: string | null | undefined, level: string | null | undefined): boolean {
  return planHasAI(plan) && level !== "off";
}

export async function logAutopilot(barbershopId: string, action: string, detail: string, recoveredValue?: number | null): Promise<void> {
  await prisma.autopilotLog.create({ data: { barbershopId, action, detail, recoveredValue: recoveredValue ?? null } });
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
