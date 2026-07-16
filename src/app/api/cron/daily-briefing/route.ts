import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { planHasAI } from "@/lib/billing";
import { buildBriefing } from "@/lib/copilot/insights";
import { notifyBarbershop } from "@/lib/gestorNotifications";

// GET /api/cron/daily-briefing?secret=CRON_SECRET — the proactive Copiloto.
// Every morning it checks each Pro+ barbershop and, if there's something worth
// acting on (sumidos, horários vazios, agendamentos a confirmar, estoque
// baixo), drops a notification so the gestor doesn't even need to open the app.
// Schedule it on your host (Render Cron). Inert until CRON_SECRET is set.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const shops = await prisma.barbershop.findMany({ where: { isActive: true }, select: { id: true, plan: true } });
  const money = (n: number) => `R$ ${n.toFixed(2)}`;
  let notified = 0;

  for (const shop of shops) {
    if (!planHasAI(shop.plan)) continue; // proativo é recurso Pro+
    try {
      const b = await buildBriefing(shop.id);
      const problems: string[] = [];
      if (b.churnedCount > 0) problems.push(`${b.churnedCount} clientes sumidos`);
      if (b.emptyToday > 0) problems.push(`${b.emptyToday} horários livres hoje`);
      if (b.tomorrowUnconfirmed > 0) problems.push(`${b.tomorrowUnconfirmed} agendamentos de amanhã sem confirmar`);
      if (b.lowStockCount > 0) problems.push(`${b.lowStockCount} produtos acabando`);
      if (problems.length === 0) continue; // nada pra resolver → não incomoda

      const delta = b.revenue.weekDeltaPercent == null ? "" : ` (${b.revenue.weekDeltaPercent >= 0 ? "+" : ""}${b.revenue.weekDeltaPercent.toFixed(0)}%)`;
      const body = `Faturamento 7 dias: ${money(b.revenue.thisWeek)}${delta}. Precisa da sua atenção: ${problems.join(", ")}. Abra o Copiloto que eu te ajudo a resolver.`;
      await notifyBarbershop(shop.id, "SUPPORT_REPLY", "🤖 Copiloto: seu dia", body, "/dashboard");
      notified++;
    } catch (err) {
      console.error(`[daily-briefing] ${shop.id}`, err);
    }
  }

  return NextResponse.json({ ok: true, notified });
}
