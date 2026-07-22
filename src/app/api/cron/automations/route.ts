import { NextRequest, NextResponse } from "next/server";
import { cronSecretFrom } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { churnedClients, tomorrowAppointments } from "@/lib/copilot/insights";
import { notifyClient, notifyClientMarketing } from "@/lib/gestorNotifications";
import { autopilotActive, logAutopilot, runWeekFillCampaign } from "@/lib/copilot/autopilot";

// GET /api/cron/automations?secret=CRON_SECRET — the AUTO-PILOTO. Runs the
// automations each Pro+ shop turned on: auto-confirm tomorrow's appointments,
// birthday messages, and win-back of clients who just crossed the "sumido"
// threshold. Idempotent-ish (confirm only flips SCHEDULED once; win-back fires
// on the exact day a client crosses the threshold). Schedule daily.
//
// ESCALA: antes isto carregava TODAS as lojas de uma vez e as percorria uma a
// uma, com ~11 consultas cada. Em 100 mil lojas seriam ~1 milhão de consultas
// em série — horas de trabalho dentro de um limite de segundos, ou seja,
// estouro de tempo com a maioria das lojas nunca rodando. Agora percorre por
// página com cursor, trata um punhado em paralelo e para antes do limite
// devolvendo `nextCursor`, de onde a próxima chamada continua. A lógica POR
// LOJA é exatamente a mesma de antes.
export const maxDuration = 300;

const PAGE = 50; // lojas por página
const CONCURRENCY = 5; // lojas tratadas ao mesmo tempo (sem afogar o banco)
const TIME_BUDGET_MS = 240_000; // para com folga antes do maxDuration

interface Shop {
  id: string;
  name: string;
  plan: string | null;
  autopilotLevel: string | null;
  autoConfirm: boolean;
  autoBirthday: boolean;
  autoWinbackDays: number | null;
}

interface Counts {
  confirmed: number;
  birthdays: number;
  winbacks: number;
  weekFills: number;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = cronSecretFrom(request);
  if (!secret || provided !== secret) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const startedAt = Date.now();
  // Retomada: a chamada anterior devolve até onde conseguiu ir.
  let cursor = request.nextUrl.searchParams.get("cursor");

  const today = new Date();
  const tMonth = today.getUTCMonth() + 1;
  const tDay = today.getUTCDate();
  const counts: Counts = { confirmed: 0, birthdays: 0, winbacks: 0, weekFills: 0 };
  let shopsSeen = 0;
  let exhausted = false;

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const shops: Shop[] = await prisma.barbershop.findMany({
      // Inclui lojas em "Agir sozinho" (auto) mesmo sem os outros flags — é o
      // que liga a campanha "encher a semana".
      where: { isActive: true, OR: [{ autoConfirm: true }, { autoBirthday: true }, { autoWinbackDays: { not: null } }, { autopilotLevel: "auto" }] },
      select: { id: true, name: true, plan: true, autopilotLevel: true, autoConfirm: true, autoBirthday: true, autoWinbackDays: true },
      // Ordem estável por id: é o que garante que o cursor não pule nem repita
      // loja entre uma invocação e a seguinte.
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PAGE,
    });

    if (shops.length === 0) {
      exhausted = true;
      break;
    }

    for (let i = 0; i < shops.length; i += CONCURRENCY) {
      await Promise.all(shops.slice(i, i + CONCURRENCY).map((shop) => runForShop(shop, tMonth, tDay, counts)));
    }

    shopsSeen += shops.length;
    cursor = shops[shops.length - 1].id;
    if (shops.length < PAGE) {
      exhausted = true;
      break;
    }
  }

  return NextResponse.json({
    ok: true,
    ...counts,
    shopsSeen,
    // Quando o tempo acaba antes das lojas, quem agenda reinvoca com
    // ?cursor=<id> até vir null.
    nextCursor: exhausted ? null : cursor,
  });
}

/** As automações de UMA barbearia. Um erro aqui não pode derrubar as outras. */
async function runForShop(shop: Shop, tMonth: number, tDay: number, counts: Counts): Promise<void> {
  if (!autopilotActive(shop.plan, shop.autopilotLevel)) return;
  try {
    // 1) Confirmar agendamentos de amanhã.
    if (shop.autoConfirm) {
      const { list } = await tomorrowAppointments(shop.id);
      let n = 0;
      for (const a of list.filter((x) => x.status === "SCHEDULED")) {
        await prisma.appointment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
        if (a.clientId) await notifyClient(shop.id, a.clientId, "APPOINTMENT_CONFIRMED", "Agendamento confirmado", `Confirmamos seu horário de amanhã às ${a.startTime}. Até lá!`, "/appointments");
        counts.confirmed++;
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
            await notifyClientMarketing(shop.id, u.id, "APPOINTMENT_CONFIRMED", "Feliz aniversário!", `Parabéns, ${u.name.split(" ")[0]}! A ${shop.name} te deseja tudo de bom. Vem comemorar com um corte novo.`, "/appointments");
            counts.birthdays++;
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
          await notifyClientMarketing(shop.id, c.clientId, "APPOINTMENT_CONFIRMED", "Saudades de você!", `Faz um tempo que você não aparece na ${shop.name}. Que tal marcar um horário? A gente separou um cuidado especial pra você.`, "/appointments");
          counts.winbacks++;
          n++;
        }
      }
      if (n > 0) await logAutopilot(shop.id, "winback", `Chamei ${n} cliente(s) que estavam sumindo.`);
    }

    // 4) Encher a semana — proativo, só no "Agir sozinho" (as travas de
    // frequência/consentimento/público estão dentro da função).
    const fill = await runWeekFillCampaign(shop.id, shop.name, shop.plan, shop.autopilotLevel);
    counts.weekFills += fill.sent;
  } catch (err) {
    console.error(`[automations] ${shop.id}`, err);
  }
}
