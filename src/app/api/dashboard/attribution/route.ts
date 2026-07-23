import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { startOfUtcDay, addUtcDays } from "@/lib/dateRange";
import { phoneKey } from "@/lib/phone";

// Relatório de ATRIBUIÇÃO (Onda 1): de onde vieram os contatos e como avançaram
// no funil. Endpoint SEPARADO do /dashboard/reports (operacional) de propósito —
// prestação de contas de marketing é outra pergunta ("de onde veio o resultado")
// e não deve poluir nem arriscar o relatório que já funciona.
//
// Coorte por `capturedAt` dentro do período; o funil conta quantos DESSES
// contatos agendaram/compareceram (via scheduledAt/showedAt, gravados pelo
// advanceLead). Faturamento atribuído fica para a Onda 2.

const CHANNEL_LABELS: Record<string, string> = {
  CTWA: "Anúncio (clique-pro-WhatsApp)",
  GOOGLE: "Google",
  GBP: "Google Meu Negócio",
  REFERRAL: "Indicação",
  ORGANIC: "Orgânico",
  UNKNOWN: "Não identificado",
};

export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const range = request.nextUrl.searchParams.get("range") === "week" ? "week" : "month";
  const barbershopId = session.barbershopId;
  const now = new Date();
  // week = últimos 7 dias; month = últimos 30 dias (janela móvel).
  const rangeStart = range === "week" ? addUtcDays(startOfUtcDay(now), -6) : addUtcDays(startOfUtcDay(now), -29);

  const [leads, completed] = await Promise.all([
    prisma.lead.findMany({
      where: { barbershopId, capturedAt: { gte: rangeStart } },
      select: { channel: true, campaign: true, isNewClient: true, scheduledAt: true, showedAt: true, phoneKey: true },
    }),
    // Faturamento do período para atribuir por canal. Casamos pela chave de
    // últimos-8 (a mesma do lead). Só conta o que foi realmente concluído.
    prisma.appointment.findMany({
      where: { barbershopId, status: "COMPLETED", date: { gte: rangeStart } },
      select: { clientPhone: true, totalPrice: true },
    }),
  ]);

  // Receita concluída no período, somada por chave de telefone.
  const revenueByKey = new Map<string, number>();
  for (const a of completed) {
    const k = phoneKey(a.clientPhone);
    if (!k) continue;
    revenueByKey.set(k, (revenueByKey.get(k) ?? 0) + a.totalPrice);
  }

  const total = leads.length;
  let scheduled = 0;
  let showed = 0;
  let unidentified = 0;
  let novos = 0;
  let attributedRevenue = 0;

  const channelMap = new Map<string, { contacts: number; scheduled: number; showed: number; novos: number; revenue: number }>();
  const campaignMap = new Map<string, { campaign: string; channel: string; contacts: number; showed: number; revenue: number }>();

  for (const l of leads) {
    if (l.scheduledAt) scheduled += 1;
    if (l.showedAt) showed += 1;
    if (l.channel === "UNKNOWN") unidentified += 1;
    if (l.isNewClient) novos += 1;

    const rev = revenueByKey.get(l.phoneKey) ?? 0;
    attributedRevenue += rev;

    const c = channelMap.get(l.channel) ?? { contacts: 0, scheduled: 0, showed: 0, novos: 0, revenue: 0 };
    c.contacts += 1;
    if (l.scheduledAt) c.scheduled += 1;
    if (l.showedAt) c.showed += 1;
    if (l.isNewClient) c.novos += 1;
    c.revenue += rev;
    channelMap.set(l.channel, c);

    if (l.campaign) {
      const key = `${l.channel}|${l.campaign}`;
      const cc = campaignMap.get(key) ?? { campaign: l.campaign, channel: l.channel, contacts: 0, showed: 0, revenue: 0 };
      cc.contacts += 1;
      if (l.showedAt) cc.showed += 1;
      cc.revenue += rev;
      campaignMap.set(key, cc);
    }
  }

  const byChannel = Array.from(channelMap.entries())
    .map(([channel, v]) => ({
      channel,
      label: CHANNEL_LABELS[channel] ?? channel,
      contacts: v.contacts,
      scheduled: v.scheduled,
      showed: v.showed,
      novos: v.novos,
      revenue: Math.round(v.revenue),
      conversionPct: v.contacts > 0 ? Math.round((v.showed / v.contacts) * 100) : 0,
    }))
    .sort((a, b) => b.contacts - a.contacts);

  const byCampaign = Array.from(campaignMap.values())
    .map((c) => ({ ...c, revenue: Math.round(c.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return NextResponse.json({
    range,
    totals: {
      contacts: total,
      identified: total - unidentified,
      unidentified,
      unidentifiedPct: total > 0 ? Math.round((unidentified / total) * 100) : 0,
      novos,
      recorrentes: total - novos,
      attributedRevenue: Math.round(attributedRevenue),
    },
    funnel: {
      contacts: total,
      scheduled,
      showed,
      schedRate: total > 0 ? Math.round((scheduled / total) * 100) : 0,
      showRate: scheduled > 0 ? Math.round((showed / scheduled) * 100) : 0,
    },
    byChannel,
    byCampaign,
  });
}
