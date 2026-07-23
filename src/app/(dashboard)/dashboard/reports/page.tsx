"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, Calendar,
  BarChart3, Percent, AlertCircle, Printer, Wallet,
  type LucideIcon,
} from "lucide-react";
import { usePlan } from "@/context/PlanContext";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { toast } from "@/lib/toast";

const PERIODS: { label: string; range: "week" | "month" }[] = [
  { label: "Esta semana", range: "week" },
  { label: "Este mês", range: "month" },
];

interface ReportsResponse {
  series: { label: string; receita: number; despesas: number; agendamentos: number }[];
  kpis: { totalRevenue: number; totalExpenses: number; totalAppointments: number; profit: number; avgTicket: number };
  servicesDistribution: { name: string; count: number; value: number; color: string }[];
  staffPerformance: { name: string; appointments: number; revenue: number; commission: number; pct: number }[];
  retention: { name: string; novos: number; retornantes: number }[];
}

interface AttributionResponse {
  period: string;
  shop: { name: string; logo: string | null; primaryColor: string };
  totals: { contacts: number; identified: number; unidentified: number; unidentifiedPct: number; novos: number; recorrentes: number; attributedRevenue: number };
  funnel: { contacts: number; scheduled: number; showed: number; schedRate: number; showRate: number };
  cost: { spend: number; perContact: number; perScheduled: number; perNewClient: number; roas: number };
  byChannel: { channel: string; label: string; contacts: number; scheduled: number; showed: number; novos: number; revenue: number; conversionPct: number }[];
  byCampaign: { campaign: string; channel: string; label: string; contacts: number; novos: number; showed: number; revenue: number }[];
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function recentMonths(n = 12): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      value: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    });
  }
  return out;
}
function monthLabelOf(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${MONTH_NAMES[m - 1] ?? ""} ${y}`;
}

// Cor por canal — verde do WhatsApp para o anúncio (canal principal), cinza
// neutro para "não identificado" (não competimos por atenção com o desconhecido).
const CHANNEL_COLORS: Record<string, string> = {
  CTWA: "#25D366",
  GOOGLE: "#3B82F6",
  GBP: "#8B5CF6",
  INSTAGRAM: "#E1306C",
  REFERRAL: "#F59E0B",
  ORGANIC: "#10B981",
  UNKNOWN: "#71717a",
};

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-400 capitalize">{entry.name}:</span>
          <span className="text-white font-semibold">
            {entry.name === "agendamentos" ? entry.value : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

function KpiCard({ title, value, icon: Icon, iconColor = "text-amber-400", sub }: {
  title: string; value: string;
  icon: LucideIcon; iconColor?: string; sub?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-sm text-zinc-500 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { can } = usePlan();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<"week" | "month">("month");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // O relatório de atribuição é por MÊS de competência (é o que a agência
  // entrega ao cliente), independente do toggle operacional acima.
  const months = recentMonths(12);
  const [month, setMonth] = useState(months[0].value);
  const [spendInput, setSpendInput] = useState("");

  const canSeeReports = can("advanced_reports");
  const { data: reports } = useQuery({
    queryKey: ["dashboard-reports-full", range],
    queryFn: () => apiGet<ReportsResponse>(`/api/dashboard/reports?range=${range}`),
    enabled: canSeeReports,
  });
  const { data: attribution } = useQuery({
    queryKey: ["dashboard-attribution", month],
    queryFn: () => apiGet<AttributionResponse>(`/api/dashboard/attribution?month=${month}`),
    enabled: canSeeReports,
  });
  const funnel = attribution?.funnel;
  const cost = attribution?.cost;
  const byChannel = attribution?.byChannel ?? [];
  const byCampaign = attribution?.byCampaign ?? [];
  const maxContacts = byChannel.reduce((m, c) => Math.max(m, c.contacts), 0);

  const saveSpend = useMutation({
    mutationFn: (amount: number) => apiPatch(`/api/dashboard/attribution`, { period: month, amount }),
    onSuccess: () => {
      toast.success("Investimento salvo");
      queryClient.invalidateQueries({ queryKey: ["dashboard-attribution", month] });
    },
    onError: () => toast.error("Não consegui salvar o investimento"),
  });

  const data = reports?.series ?? [];
  const servicesData = reports?.servicesDistribution ?? [];
  const staffData = reports?.staffPerformance ?? [];
  const retentionData = reports?.retention ?? [];
  const totalRevenue = reports?.kpis.totalRevenue ?? 0;
  const totalAppointments = reports?.kpis.totalAppointments ?? 0;
  const profit = reports?.kpis.profit ?? 0;
  const avgTicket = reports?.kpis.avgTicket ?? 0;
  const totalRetention = retentionData.reduce((a, d) => a + d.novos + d.retornantes, 0);
  const returningShare = totalRetention > 0
    ? Math.round((retentionData.reduce((a, d) => a + d.retornantes, 0) / totalRetention) * 1000) / 10
    : 0;

  if (!canSeeReports) {
    return (
      <>
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        <div className="space-y-6">
          <PageHeader icon={BarChart3} title="Relatórios" subtitle="Análise completa do seu negócio" />

          <div className="relative">
            {/* Blurred preview */}
            <div className="select-none pointer-events-none opacity-20 saturate-0 blur-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-28" />
                ))}
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-64" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-48" />
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-48" />
              </div>
            </div>

            {/* Upgrade overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center max-w-md shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/25">
                  <BarChart3 className="w-8 h-8 text-black" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Relatórios Avançados</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Acesse análises completas de receita, performance dos barbeiros,
                  retenção de clientes e muito mais. Disponível no plano Pro.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                  {["Receita vs Despesas", "Distribuição de serviços", "Performance por barbeiro", "Retenção de clientes", "Ticket médio", "Exportar relatórios"].map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button onClick={() => setUpgradeOpen(true)}
                  className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:opacity-90 transition-all">
                  Desbloquear relatórios →
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Relatórios"
        subtitle="Análise completa do seu negócio"
        action={
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
            {PERIODS.map(p => (
              <button key={p.range} onClick={() => setRange(p.range)}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
                  range === p.range ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-300"
                )}>
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Receita total" value={formatCurrency(totalRevenue)} icon={DollarSign} />
        <KpiCard title="Agendamentos" value={String(totalAppointments)} icon={Calendar} iconColor="text-blue-400" />
        <KpiCard title="Ticket médio" value={formatCurrency(avgTicket)} icon={TrendingUp} iconColor="text-green-400" />
        <KpiCard title="Margem líquida" value={totalRevenue > 0 ? `${Math.round((profit / totalRevenue) * 100)}%` : "0%"} icon={Percent} iconColor="text-purple-400" sub={`Lucro: ${formatCurrency(profit)}`} />
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Receita vs Despesas</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{range === "week" ? "Esta semana" : "Últimos 6 meses"}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-400/80" /><span className="text-zinc-400">Receita</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400/80" /><span className="text-zinc-400">Despesas</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gRecRep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gDesRep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `R$${v >= 1000 ? `${v / 1000}k` : v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3f3f46" }} />
            <Area type="monotone" dataKey="receita" stroke="#F59E0B" strokeWidth={2} fill="url(#gRecRep)" dot={false} activeDot={{ r: 4, fill: "#F59E0B" }} />
            <Area type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={1.5} fill="url(#gDesRep)" dot={false} activeDot={{ r: 3, fill: "#EF4444" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Service Distribution + Client Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Pie */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-base font-bold text-white mb-5">Distribuição de Serviços</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={servicesData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {servicesData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, "Participação"]} contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {servicesData.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-zinc-400 flex-1 truncate">{s.name}</span>
                  <span className="text-xs text-zinc-300 font-medium">{s.value}%</span>
                  <span className="text-xs text-zinc-600">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Client Retention */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white">Novos vs Retornantes</h3>
            <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">{returningShare}% retenção</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={retentionData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="retornantes" name="Retornantes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="novos" name="Novos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Origem dos clientes (Atribuição) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Origem dos clientes</h3>
            <p className="text-xs text-zinc-500 mt-0.5">De onde veio cada contato e quanto cada campanha gerou</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => { setMonth(e.target.value); setSpendInput(""); }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 px-2.5 py-1.5 outline-none focus:border-amber-500/50">
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-colors">
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Funil: chegou → agendou → compareceu */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Chegaram", value: funnel?.contacts ?? 0, pct: null as number | null },
            { label: "Agendaram", value: funnel?.scheduled ?? 0, pct: funnel?.schedRate ?? 0 },
            { label: "Compareceram", value: funnel?.showed ?? 0, pct: funnel?.showRate ?? 0 },
          ].map((step) => (
            <div key={step.label} className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-white">{step.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{step.label}</p>
              {step.pct !== null && <p className="text-[11px] text-amber-400 mt-1">{step.pct}% do passo anterior</p>}
            </div>
          ))}
        </div>

        {/* Novos + faturamento + custo por cliente novo + retorno */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3">
            <p className="text-[11px] text-zinc-500">Clientes novos</p>
            <p className="text-lg font-black text-white">{attribution?.totals.novos ?? 0}</p>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3">
            <p className="text-[11px] text-zinc-500">Faturamento atribuído</p>
            <p className="text-lg font-black text-amber-400">{formatCurrency(attribution?.totals.attributedRevenue ?? 0)}</p>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3">
            <p className="text-[11px] text-zinc-500">Custo por cliente novo</p>
            <p className="text-lg font-black text-white">{cost && cost.perNewClient > 0 ? formatCurrency(cost.perNewClient) : "—"}</p>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3">
            <p className="text-[11px] text-zinc-500">Retorno (ROAS)</p>
            <p className="text-lg font-black text-white">{cost && cost.roas > 0 ? `${cost.roas}x` : "—"}</p>
          </div>
        </div>

        {/* Verba investida — a agência informa (não vem do sistema) */}
        <div className="flex flex-wrap items-end gap-2 mb-6 bg-zinc-800/30 border border-zinc-800 rounded-xl p-3">
          <Wallet className="w-4 h-4 text-amber-400 mb-1.5" />
          <div>
            <label className="text-[11px] text-zinc-500 block">Quanto foi investido em {monthLabelOf(month)}?</label>
            <input type="number" inputMode="decimal" value={spendInput} onChange={(e) => setSpendInput(e.target.value)}
              placeholder={cost && cost.spend > 0 ? String(cost.spend) : "0,00"}
              className="mt-1 block w-40 bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/50" />
          </div>
          <button
            onClick={() => { const v = Number(spendInput.replace(",", ".")); if (Number.isFinite(v) && v >= 0) saveSpend.mutate(v); }}
            disabled={saveSpend.isPending || spendInput.trim() === ""}
            className="rounded-lg bg-amber-500/15 text-amber-300 px-3 py-1.5 text-xs font-bold hover:bg-amber-500/25 disabled:opacity-40 transition-colors">
            {saveSpend.isPending ? "Salvando…" : "Salvar"}
          </button>
          {cost && cost.spend > 0 && <span className="text-[11px] text-zinc-500 mb-2">Atual: {formatCurrency(cost.spend)}</span>}
        </div>

        {/* Contatos por canal */}
        <div className="space-y-3">
          {byChannel.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">
              Ainda sem contatos rastreados em {monthLabelOf(month)}. Assim que chegar mensagem de anúncio (clique-pro-WhatsApp) ou link rastreado, a origem aparece aqui.
            </p>
          ) : byChannel.map((c) => (
            <div key={c.channel}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-zinc-300 font-medium">{c.label}</span>
                <span className="text-zinc-500">{c.contacts} contatos · {c.showed} compareceram · <span className="text-zinc-300">{c.conversionPct}%</span> · <span className="text-amber-400">{formatCurrency(c.revenue)}</span></span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${maxContacts > 0 ? (c.contacts / maxContacts) * 100 : 0}%`, backgroundColor: CHANNEL_COLORS[c.channel] ?? "#71717a" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Por campanha */}
        {byCampaign.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Por campanha</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-zinc-600">
                    <th className="py-1.5 pr-3 font-medium">Campanha</th>
                    <th className="py-1.5 px-3 font-medium">Canal</th>
                    <th className="py-1.5 px-3 font-medium text-right">Contatos</th>
                    <th className="py-1.5 px-3 font-medium text-right">Novos</th>
                    <th className="py-1.5 px-3 font-medium text-right">Compareceram</th>
                    <th className="py-1.5 pl-3 font-medium text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {byCampaign.map((c) => (
                    <tr key={`${c.channel}-${c.campaign}`} className="text-zinc-300">
                      <td className="py-2 pr-3 font-medium">{c.campaign}</td>
                      <td className="py-2 px-3 text-zinc-500">{c.label}</td>
                      <td className="py-2 px-3 text-right">{c.contacts}</td>
                      <td className="py-2 px-3 text-right">{c.novos}</td>
                      <td className="py-2 px-3 text-right">{c.showed}</td>
                      <td className="py-2 pl-3 text-right text-amber-400">{formatCurrency(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rodapé de honestidade — sempre visível */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-amber-300 font-semibold">{attribution?.totals.unidentifiedPct ?? 0}%</span> dos contatos estão com <span className="text-zinc-300">origem não identificada</span> — e nunca os distribuímos entre as campanhas por estimativa. Um número honesto vale mais do que um número inflado.
          </p>
        </div>
      </div>

      {/* Relatório imprimível com a marca da barbearia (botão PDF acima) */}
      <div className="attribution-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: `3px solid ${attribution?.shop.primaryColor ?? "#F59E0B"}`, paddingBottom: 12, marginBottom: 16 }}>
          {attribution?.shop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attribution.shop.logo} alt="" style={{ height: 48, width: 48, objectFit: "contain" }} />
          ) : null}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{attribution?.shop.name || "Barbearia"}</h1>
            <p style={{ fontSize: 13, color: "#555", margin: 0 }}>Relatório de Marketing — {monthLabelOf(month)}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {([
            ["Chegaram", String(funnel?.contacts ?? 0)],
            ["Agendaram", String(funnel?.scheduled ?? 0)],
            ["Compareceram", String(funnel?.showed ?? 0)],
            ["Clientes novos", String(attribution?.totals.novos ?? 0)],
            ["Faturamento atribuído", formatCurrency(attribution?.totals.attributedRevenue ?? 0)],
            ["Investimento", cost && cost.spend > 0 ? formatCurrency(cost.spend) : "—"],
            ["Custo por cliente novo", cost && cost.perNewClient > 0 ? formatCurrency(cost.perNewClient) : "—"],
            ["Retorno (ROAS)", cost && cost.roas > 0 ? `${cost.roas}x` : "—"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: "#666" }}>{k}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{v}</div>
            </div>
          ))}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
              <th style={{ padding: "6px 8px" }}>Campanha</th>
              <th style={{ padding: "6px 8px" }}>Canal</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Contatos</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Novos</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Compareceram</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {byCampaign.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 8, color: "#888" }}>Sem campanhas rastreadas no mês.</td></tr>
            ) : byCampaign.map((c) => (
              <tr key={`p-${c.channel}-${c.campaign}`} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "6px 8px" }}>{c.campaign}</td>
                <td style={{ padding: "6px 8px" }}>{c.label}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{c.contacts}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{c.novos}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{c.showed}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatCurrency(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 11, color: "#666", borderTop: "1px solid #ccc", paddingTop: 8 }}>
          {attribution?.totals.unidentifiedPct ?? 0}% dos contatos estão com origem não identificada — e não foram distribuídos entre as campanhas por estimativa.
        </p>
      </div>

      <style jsx global>{`
        .attribution-print { display: none; }
        @media print {
          body * { visibility: hidden; }
          .attribution-print, .attribution-print * { visibility: visible; }
          .attribution-print { display: block; position: absolute; left: 0; top: 0; width: 100%; padding: 24px; color: #111; background: #fff; }
        }
      `}</style>

      {/* Staff Performance Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-base font-bold text-white">Performance da Equipe</h3>
          <span className="text-xs text-zinc-500">{range === "week" ? "Esta semana" : "Últimos 6 meses"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Barbeiro", "Agendamentos", "Receita", "Comissão", "Share"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {staffData.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-500 text-sm">Nenhum atendimento concluído no período</td></tr>
              )}
              {staffData.map((s, i) => (
                <tr key={s.name} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black",
                        i === 0 ? "bg-amber-500" : "bg-zinc-700 text-zinc-300"
                      )}>
                        {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-sm text-white font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">{s.appointments}</td>
                  <td className="px-6 py-4 text-sm font-medium text-amber-400">{formatCurrency(s.revenue)}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{formatCurrency(s.commission)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">{s.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          {[{
            label: "Total receita", value: formatCurrency(staffData.reduce((a, s) => a + s.revenue, 0)),
          }, {
            label: "Total comissões", value: formatCurrency(staffData.reduce((a, s) => a + s.commission, 0)),
          }, {
            label: "Total agend.", value: String(staffData.reduce((a, s) => a + s.appointments, 0)),
          }, {
            label: "Margem equipe",
            value: (() => {
              const teamRevenue = staffData.reduce((a, s) => a + s.revenue, 0);
              const teamCommission = staffData.reduce((a, s) => a + s.commission, 0);
              return teamRevenue > 0 ? `${Math.round((1 - teamCommission / teamRevenue) * 100)}%` : "0%";
            })(),
          }].map(item => (
            <div key={item.label} className="py-2">
              <p className="text-base font-bold text-white">{item.value}</p>
              <p className="text-xs text-zinc-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
