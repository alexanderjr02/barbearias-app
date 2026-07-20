import { NextRequest, NextResponse } from "next/server";
import { GET as automations } from "../automations/route";
import { GET as dailyBriefing } from "../daily-briefing/route";
import { GET as weeklyReport } from "../weekly-report/route";
import { cronSecretFrom } from "@/lib/cronAuth";

// GET /api/cron/all?secret=CRON_SECRET
//
// Roda as três rotinas numa chamada só.
//
// Existe por causa do limite de cron da Vercel no plano Hobby: cabem poucos
// agendamentos e apenas um disparo diário. Os três jobs continuam existindo
// separados (é assim que o Render os chama, um por horário); esta rota só os
// agrupa para caber num único gatilho.
//
// O relatório semanal só roda de fato às segundas — chamá-lo todo dia mandaria
// o resumo da semana sete vezes.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = cronSecretFrom(request);
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const isMonday = new Date().getDay() === 1;

  const jobs: { name: string; run: () => Promise<Response> }[] = [
    { name: "automations", run: () => automations(request) },
    { name: "daily-briefing", run: () => dailyBriefing(request) },
    ...(isMonday ? [{ name: "weekly-report", run: () => weeklyReport(request) }] : []),
  ];

  const results: Record<string, string> = {};
  for (const job of jobs) {
    // Cada job é isolado: se o briefing falhar, as automações do dia ainda
    // rodam. Um erro engolido aqui vale mais que três rotinas puladas.
    try {
      const res = await job.run();
      results[job.name] = res.ok ? "ok" : `http ${res.status}`;
    } catch (e) {
      results[job.name] = `erro: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[cron/all] ${job.name}`, e);
    }
  }

  return NextResponse.json({ ran: results, weeklyReportSkipped: !isMonday });
}
