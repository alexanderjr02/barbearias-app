import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { churnedClients, tomorrowAppointments } from "@/lib/copilot/insights";
import { notifyClient, notifyClientMarketing } from "@/lib/gestorNotifications";
import { autopilotActive, logAutopilot } from "@/lib/copilot/autopilot";

// GET /api/cron/automations?secret=CRON_SECRET — the AUTO-PILOTO. Runs the
// automations each Pro+ shop turned on: auto-confirm tomorrow's appointments,
// birthday messages, and win-back of clients who just crossed the "sumido"
// threshold. Idempotent-ish (confirm only flips SCHEDULED once; win-back fires
// on the exact day a client crosses the threshold). Schedule daily.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  if (!secret || provided !== secret) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const shops = await prisma.barbershop.findMany({
    where: { isActive: true, OR: [{ autoConfirm: true }, { autoBirthday: true }, { autoWinbackDays: { not: null } }] },
    select: { id: true, name: true, plan: true, autopilotLevel: true, autoConfirm: true, autoBirthday: true, autoWinbackDays: true },
  });

  const today = new Date();
  const tMonth = today.getUTCMonth() + 1;
  const tDay = today.getUTCDate();
  let confirmed = 0;
  let birthdays = 0;
  let winbacks = 0;

  for (const shop of shops) {
    if (!autopilotActive(shop.plan, shop.autopilotLevel)) continue;
    try {
      // 1) Confirmar agendamentos de amanhã.
      if (shop.autoConfirm) {
        const { list } = await tomorrowAppointments(shop.id);
        let n = 0;
        for (const a of list.filter((x) => x.status === "SCHEDULED")) {
          await prisma.appointment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
          if (a.clientId) await notifyClient(shop.id, a.clientId, "APPOINTMENT_CONFIRMED", "Agendamento confirmado ✅", `Confirmamos seu horário de amanhã às ${a.startTime}. Até lá! 💈`, "/appointments");
          confirmed++;
          n++;
        }
        if (n > 0) await logAutopilot(shop.id, "confirmed", `Confirmei ${n} agendamento(s) de amanhã pra reduzir falta.`);
      }

      // 2) Aniversariantes de hoje.
      if (shop.autoBirthday) {
        const [links, apptClients] = await Promise.all([
          prisma.barbershopClient.findMany({ where: { barbershopId: shop.id }, select: { userId: true } }),
          prisma.appointment.findMany({ where: { barbershopId: shop.id, clientId: { not: null } }, select: { clientId: true }, distinct: ["clientId"] }),
        ]);
        const ids = new Set<string>();
        for (const l of links as { userId: string }[]) ids.add(l.userId);
        for (const a of apptClients as { clientId: string | null }[]) if (a.clientId) ids.add(a.clientId);
        if (ids.size) {
          const users = await prisma.user.findMany({ where: { id: { in: [...ids] }, dateOfBirth: { not: null } }, select: { id: true, name: true, dateOfBirth: true } });
          let n = 0;
          for (const u of users as { id: string; name: string; dateOfBirth: Date | null }[]) {
            const d = u.dateOfBirth!;
            if (d.getUTCMonth() + 1 === tMonth && d.getUTCDate() === tDay) {
              await notifyClientMarketing(shop.id, u.id, "APPOINTMENT_CONFIRMED", "Feliz aniversário! 🎉", `Parabéns, ${u.name.split(" ")[0]}! A ${shop.name} te deseja tudo de bom. Vem comemorar com um corte novo. 💈`, "/appointments");
              birthdays++;
              n++;
            }
          }
          if (n > 0) await logAutopilot(shop.id, "birthday", `Parabenizei ${n} aniversariante(s) de hoje.`);
        }
      }

      // 3) Win-back de quem cruzou o limite hoje.
      if (shop.autoWinbackDays) {
        const churned = await churnedClients(shop.id, shop.autoWinbackDays, 500);
        let n = 0;
        for (const c of churned) {
          if (c.clientId && c.daysSince === shop.autoWinbackDays) {
            await notifyClientMarketing(shop.id, c.clientId, "APPOINTMENT_CONFIRMED", "Saudades de você! 💈", `Faz um tempo que você não aparece na ${shop.name}. Que tal marcar um horário? A gente separou um cuidado especial pra você.`, "/appointments");
            winbacks++;
            n++;
          }
        }
        if (n > 0) await logAutopilot(shop.id, "winback", `Chamei ${n} cliente(s) que estavam sumindo.`);
      }
    } catch (err) {
      console.error(`[automations] ${shop.id}`, err);
    }
  }

  return NextResponse.json({ ok: true, confirmed, birthdays, winbacks });
}
