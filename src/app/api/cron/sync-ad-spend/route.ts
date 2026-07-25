import { NextRequest, NextResponse } from "next/server";
import { cronSecretFrom } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { metaAdsEnabled, fetchAdSpend } from "@/lib/metaAdsInsights";

// GET /api/cron/sync-ad-spend — puxa o gasto do mês na Meta e grava em
// CampaignSpend, para o custo por cliente novo / ROI do relatório de atribuição
// serem AUTOMÁTICOS (#1) em vez de digitados. A digitação manual continua
// funcionando quando a Meta não está configurada.
//
// Inerte/seguro até: CRON_SECRET + credenciais da Meta Ads (META_ADS_TOKEN,
// META_AD_ACCOUNT_ID) + META_ADS_BARBERSHOP_ID (a barbearia dona da verba).
// Agende num scheduler (ex.: Render Cron Job) apontando para esta URL.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || cronSecretFrom(request) !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!metaAdsEnabled()) {
    return NextResponse.json({ ok: true, skipped: "Meta Ads não configurada" });
  }
  const barbershopId = process.env.META_ADS_BARBERSHOP_ID;
  if (!barbershopId) {
    return NextResponse.json({ ok: true, skipped: "META_ADS_BARBERSHOP_ID ausente" });
  }

  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const amount = await fetchAdSpend(period);
  if (amount == null) {
    return NextResponse.json({ ok: false, error: "Não consegui buscar o gasto na Meta" });
  }

  await prisma.campaignSpend.upsert({
    where: { barbershopId_period: { barbershopId, period } },
    create: { barbershopId, period, amount },
    update: { amount },
  });
  return NextResponse.json({ ok: true, period, amount });
}
