import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revenueSummary, churnedClients, barberLeaderboard } from "@/lib/copilot/insights";
import { notifyBarbershop } from "@/lib/gestorNotifications";
import { sendMail } from "@/lib/mailer";

// GET /api/cron/weekly-report — computes each active barbershop's weekly
// summary and drops it in the gestor's notification feed (and e-mails the
// owner). Meant to be hit by a scheduler once a week.
//
// Protect with CRON_SECRET: call as /api/cron/weekly-report?secret=... or send
// header "x-cron-secret". Set up the schedule on your host (e.g. a Render Cron
// Job pointing at this URL). Inert/safe until CRON_SECRET is configured.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const shops = await prisma.barbershop.findMany({ where: { isActive: true }, select: { id: true, name: true, owner: { select: { email: true, name: true } } } });
  const money = (n: number) => `R$ ${n.toFixed(2)}`;
  let processed = 0;

  for (const shop of shops) {
    try {
      const [rev, churned, barbers] = await Promise.all([revenueSummary(shop.id), churnedClients(shop.id), barberLeaderboard(shop.id)]);
      const delta = rev.weekDeltaPercent == null ? "" : ` (${rev.weekDeltaPercent >= 0 ? "+" : ""}${rev.weekDeltaPercent.toFixed(0)}% vs semana anterior)`;
      const topBarber = barbers[0];

      const lines = [
        `Faturamento (7 dias): ${money(rev.thisWeek)}${delta}.`,
        `No mês: ${money(rev.monthRevenue)} em ${rev.monthCount} atendimentos (ticket médio ${money(rev.avgTicket)}).`,
        topBarber ? `Destaque: ${topBarber.name} — ${money(topBarber.revenue)} (${topBarber.count} atendimentos).` : "",
        churned.length > 0 ? `${churned.length} clientes sumidos há +45 dias — vale chamar de volta.` : "Nenhum cliente sumido. 👏",
      ].filter(Boolean);
      const bodyText = lines.join(" ");

      await notifyBarbershop(shop.id, "SUPPORT_REPLY", "📊 Seu resumo da semana", bodyText, "/dashboard");

      if (shop.owner?.email) {
        await sendMail({
          to: shop.owner.email,
          subject: `📊 Resumo da semana — ${shop.name}`,
          text: `Olá${shop.owner.name ? `, ${shop.owner.name.split(" ")[0]}` : ""}!\n\n${lines.join("\n")}\n\nAbra o painel para ver os detalhes e agir com o Copiloto.`,
          html: `<p>Olá${shop.owner.name ? `, ${shop.owner.name.split(" ")[0]}` : ""}!</p><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul><p>Abra o painel para ver os detalhes e agir com o Copiloto.</p>`,
        }).catch(() => {});
      }
      processed++;
    } catch (err) {
      console.error(`[weekly-report] ${shop.id}`, err);
    }
  }

  return NextResponse.json({ ok: true, processed });
}
