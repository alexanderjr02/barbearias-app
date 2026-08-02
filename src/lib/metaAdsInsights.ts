// Meta Marketing API (Ads Insights): busca o gasto (spend) da conta de anúncios
// para automatizar a verba do relatório de atribuição, assim o custo por
// cliente novo e o ROI deixam de depender de digitação manual (#1).
//
// INERTE POR PADRÃO: sem META_ADS_TOKEN + META_AD_ACCOUNT_ID, não chama a Meta
// (devolve null). O mesmo padrão da CAPI e do cron semanal.
//
// Credenciais (env):
//   META_ADS_TOKEN       , access token com permissão ads_read na conta.
//   META_AD_ACCOUNT_ID   , id da conta de anúncios (com ou sem o prefixo act_).
//   META_ADS_BARBERSHOP_ID— (usado pelo cron) barbearia dona dessa verba.
//   META_GRAPH_VERSION   , (opcional) versão da Graph API. Default v21.0.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

export function metaAdsEnabled(): boolean {
  return !!(process.env.META_ADS_TOKEN && process.env.META_AD_ACCOUNT_ID);
}

// Gasto total do mês (period = "YYYY-MM") na conta de anúncios. Devolve o valor
// em reais (número) ou null quando inerte / falha. Best-effort: nunca lança.
export async function fetchAdSpend(period: string): Promise<number | null> {
  const token = process.env.META_ADS_TOKEN;
  const accountRaw = process.env.META_AD_ACCOUNT_ID;
  if (!token || !accountRaw) return null;

  const account = accountRaw.startsWith("act_") ? accountRaw : `act_${accountRaw}`;
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return null;

  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // último dia do mês
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const timeRange = JSON.stringify({ since: fmt(start), until: fmt(end) });

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${account}/insights?fields=spend&time_range=${encodeURIComponent(timeRange)}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { data?: { spend?: string }[] } | null;
    const rows = json?.data ?? [];
    return rows.reduce((sum, r) => sum + (Number(r.spend) || 0), 0);
  } catch {
    return null;
  }
}
