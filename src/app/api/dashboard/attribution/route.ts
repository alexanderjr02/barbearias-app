import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { startOfUtcMonth, addUtcMonths } from "@/lib/dateRange";
import { phoneKey } from "@/lib/phone";

// Relatório de ATRIBUIÇÃO: de onde vieram os contatos, como avançaram no funil,
// quanto geraram e — informando a verba — quanto custou cada cliente novo.
// Endpoint SEPARADO do /dashboard/reports (operacional) de propósito.
//
// Coorte por MÊS de competência (capturedAt no mês); o funil conta quantos
// DESSES contatos agendaram/compareceram. Faturamento casado pela chave de
// telefone (últimos-8), a mesma do resto do app.

const CHANNEL_LABELS: Record<string, string> = {
  CTWA: "Anúncio (clique-pro-WhatsApp)",
  GOOGLE: "Google",
  GBP: "Google Meu Negócio",
  INSTAGRAM: "Instagram",
  REFERRAL: "Indicação",
  ORGANIC: "Orgânico",
  UNKNOWN: "Não identificado",
};

const MONTH_RE = /^\d{4}-\d{2}$/;

function monthBounds(param: string | null): { period: string; start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  if (param && MONTH_RE.test(param)) {
    const [y, m] = param.split("-").map(Number);
    start = new Date(Date.UTC(y, m - 1, 1));
  } else {
    start = startOfUtcMonth(now);
  }
  const end = addUtcMonths(start, 1);
  const period = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { period, start, end };
}

export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const barbershopId = session.barbershopId;
  const { period, start, end } = monthBounds(request.nextUrl.searchParams.get("month"));

  const [leads, completed, spendRow, shop] = await Promise.all([
    prisma.lead.findMany({
      where: { barbershopId, capturedAt: { gte: start, lt: end } },
      select: { channel: true, campaign: true, isNewClient: true, scheduledAt: true, showedAt: true, phoneKey: true },
    }),
    prisma.appointment.findMany({
      where: { barbershopId, status: "COMPLETED", date: { gte: start, lt: end } },
      select: { clientPhone: true, totalPrice: true },
    }),
    prisma.campaignSpend.findUnique({
      where: { barbershopId_period: { barbershopId, period } },
      select: { amount: true },
    }),
    // Marca da barbearia — reaproveitada no PDF do relatório mensal.
    prisma.barbershop.findUnique({
      where: { id: barbershopId },
      select: { name: true, logo: true, primaryColor: true },
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
  const campaignMap = new Map<string, { campaign: string; channel: string; contacts: number; novos: number; showed: number; revenue: number }>();

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
      const cc = campaignMap.get(key) ?? { campaign: l.campaign, channel: l.channel, contacts: 0, novos: 0, showed: 0, revenue: 0 };
      cc.contacts += 1;
      if (l.isNewClient) cc.novos += 1;
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
    .map((c) => ({
      ...c,
      label: CHANNEL_LABELS[c.channel] ?? c.channel,
      revenue: Math.round(c.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  // Custo por resultado — só faz sentido com a verba informada.
  const spend = spendRow?.amount ?? 0;
  const cost = {
    spend,
    perContact: total > 0 && spend > 0 ? Math.round((spend / total) * 100) / 100 : 0,
    perScheduled: scheduled > 0 && spend > 0 ? Math.round((spend / scheduled) * 100) / 100 : 0,
    perNewClient: novos > 0 && spend > 0 ? Math.round((spend / novos) * 100) / 100 : 0,
    // ROAS: quantos reais de faturamento atribuído para cada real investido.
    roas: spend > 0 ? Math.round((attributedRevenue / spend) * 100) / 100 : 0,
  };

  return NextResponse.json({
    period,
    shop: { name: shop?.name ?? "", logo: shop?.logo ?? null, primaryColor: shop?.primaryColor ?? "#F59E0B" },
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
    cost,
    byChannel,
    byCampaign,
  });
}

// Informar/atualizar a verba investida num mês. É a agência quem preenche (a
// verba é recarregada por ela na Meta e não passa pelo sistema).
export async function PATCH(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const period = typeof body?.period === "string" && MONTH_RE.test(body.period) ? body.period : null;
  const amount = Number(body?.amount);
  if (!period || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Informe o mês (YYYY-MM) e um valor válido." }, { status: 400 });
  }
  await prisma.campaignSpend.upsert({
    where: { barbershopId_period: { barbershopId: session.barbershopId, period } },
    create: { barbershopId: session.barbershopId, period, amount },
    update: { amount },
  });
  return NextResponse.json({ ok: true });
}
