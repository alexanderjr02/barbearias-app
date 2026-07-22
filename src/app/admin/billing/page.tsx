"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  CreditCard, DollarSign, TrendingDown, AlertTriangle, RefreshCw,
  ChevronLeft, ChevronRight, Users, Download,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { DatePicker } from "@/components/ui/DatePicker";

const PLAN_LABEL: Record<string, string> = { FREE: "Starter", PRO: "Pro", ENTERPRISE: "White Label" };
const STATUS_INFO: Record<string, { label: string; color: string }> = {
  PAID: { label: "Pago", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  PENDING: { label: "Pendente", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  FAILED: { label: "Falhou", color: "text-red-400 bg-red-500/10 border-red-500/30" },
  REFUNDED: { label: "Reembolsado", color: "text-zinc-400 bg-zinc-500/10 border-zinc-600" },
};

interface MrrMovementPoint { label: string; newMrr: number; expansion: number; contraction: number; churn: number; net: number }
interface ForecastPoint { label: string; projectedMrr: number }

interface Summary {
  mrr: number;
  arr: number;
  arpu: number;
  revenueByPlan: Record<string, number>;
  revenueByMonth: { label: string; total: number }[];
  mrrMovement: MrrMovementPoint[];
  churn: { customerChurnRate: number; revenueChurnRate: number; churnedCount: number; churnedMrr: number };
  revenueAtRisk: { amount: number; count: number };
  forecast: ForecastPoint[];
  failedInvoices: { id: string; barbershopName: string; amount: number; plan: string; createdAt: string }[];
}

interface Invoice {
  id: string;
  barbershopId: string;
  barbershopName: string;
  plan: string;
  amount: number;
  status: string;
  reason: string;
  createdAt: string;
}

interface InvoiceList {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

const MOVEMENT_LEGEND_LABELS: Record<string, string> = { newMrr: "Novo", expansion: "Expansão", contraction: "Contração", churn: "Churn" };

export default function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [running, setRunning] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const pageSize = 20;

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["admin-billing-summary"],
    queryFn: () => apiGet<Summary>("/api/admin/billing/summary"),
  });

  const invoiceQueryString = useMemo(() => {
    const params = new URLSearchParams({ status: statusFilter, page: String(page), pageSize: String(pageSize) });
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    return params.toString();
  }, [statusFilter, dateFrom, dateTo, page]);

  const { data: invoiceList, isLoading: loadingInvoices } = useQuery({
    queryKey: ["admin-billing-invoices", invoiceQueryString],
    queryFn: () => apiGet<InvoiceList>(`/api/admin/billing/invoices?${invoiceQueryString}`),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-billing-summary"] });
    queryClient.invalidateQueries({ queryKey: ["admin-billing-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const reconcile = async (id: string, status: "PAID" | "FAILED") => {
    await apiPatch(`/api/admin/billing/invoices/${id}`, { status });
    invalidate();
    toast.success(status === "PAID" ? "Fatura marcada como paga" : "Fatura marcada como falhada");
  };

  const submitRefund = async (id: string) => {
    if (!refundReason.trim()) return;
    await apiPost(`/api/admin/billing/invoices/${id}/refund`, { reason: refundReason });
    setRefundingId(null);
    setRefundReason("");
    invalidate();
    toast.success("Reembolso registrado");
  };

  const runRenewals = async () => {
    setRunning(true);
    try {
      await apiPost("/api/admin/billing/run-renewals", {});
      invalidate();
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams({ status: statusFilter });
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    window.open(`/api/admin/billing/invoices/export?${params.toString()}`, "_blank");
  };

  const invoices = invoiceList?.invoices ?? [];
  const total = invoiceList?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Real months keep `total`; forecast months only have `projected` — the
  // last real month carries both so the dashed projection line visually
  // continues from the solid revenue line instead of leaving a gap.
  const revenueWithForecast = useMemo(() => {
    if (!summary) return [];
    const real = summary.revenueByMonth.map((m) => ({ label: m.label, total: m.total, projected: undefined as number | undefined }));
    if (real.length > 0) real[real.length - 1] = { ...real[real.length - 1], projected: real[real.length - 1].total };
    const projected = summary.forecast.map((f) => ({ label: f.label, total: undefined as number | undefined, projected: f.projectedMrr }));
    return [...real, ...projected];
  }, [summary]);

  const movementData = useMemo(
    () => (summary?.mrrMovement ?? []).map((m) => ({ label: m.label, newMrr: m.newMrr, expansion: m.expansion, contraction: -m.contraction, churn: -m.churn, net: m.net })),
    [summary]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Faturamento"
        subtitle="Saúde financeira da plataforma — MRR, churn, projeção e faturas"
        accent="mono"
        action={
          <button onClick={runRenewals} disabled={running} className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50">
            <RefreshCw className={cn("w-3.5 h-3.5", running && "animate-spin")} />
            Processar renovações agora
          </button>
        }
      />

      {loadingSummary || !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {summary.failedInvoices.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-red-400 font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" /> Faturas com falha de pagamento
              </div>
              <div className="space-y-1.5">
                {summary.failedInvoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{inv.barbershopName} · {PLAN_LABEL[inv.plan] ?? inv.plan}</span>
                    <span>{formatCurrency(inv.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-emerald-400" /></div>
              <p className="text-2xl font-black text-white">{formatCurrency(summary.mrr)}</p>
              <p className="text-sm text-zinc-500">MRR</p>
              <p className="text-xs text-zinc-600 mt-1">{formatCurrency(summary.arr)} ARR</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3"><Users className="w-5 h-5 text-blue-400" /></div>
              <p className="text-2xl font-black text-white">{formatCurrency(summary.arpu)}</p>
              <p className="text-sm text-zinc-500">ARPU</p>
              <p className="text-xs text-zinc-600 mt-1">Receita média por barbearia</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3"><TrendingDown className="w-5 h-5 text-red-400" /></div>
              <p className="text-2xl font-black text-white">{pct(summary.churn.revenueChurnRate)}</p>
              <p className="text-sm text-zinc-500">Churn de receita (mês)</p>
              <p className="text-xs text-zinc-600 mt-1">{summary.churn.churnedCount} barbearia{summary.churn.churnedCount === 1 ? "" : "s"} · {pct(summary.churn.customerChurnRate)} de clientes</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3"><AlertTriangle className="w-5 h-5 text-amber-400" /></div>
              <p className="text-2xl font-black text-white">{formatCurrency(summary.revenueAtRisk.amount)}</p>
              <p className="text-sm text-zinc-500">Receita em risco</p>
              <p className="text-xs text-zinc-600 mt-1">{summary.revenueAtRisk.count} fatura{summary.revenueAtRisk.count === 1 ? "" : "s"} pendente/falhada</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-xs text-zinc-500 mb-3">Receita por plano</p>
            <div className="grid grid-cols-3 gap-4">
              {(["FREE", "PRO", "ENTERPRISE"] as const).map((p) => (
                <div key={p}>
                  <p className="text-xs text-zinc-500">{PLAN_LABEL[p]}</p>
                  <p className="text-base font-bold text-zinc-200">{formatCurrency(summary.revenueByPlan[p] ?? 0)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* MRR Movement */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white">Movimentação de MRR</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-5">Novo, expansão, contração e churn por mês — de onde vem o crescimento e onde está a perda</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={movementData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${Math.abs(v) >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
                  formatter={((v: number, name: string) => [formatCurrency(Math.abs(v)), name]) as never}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={((v: string) => (MOVEMENT_LEGEND_LABELS[v] ?? v)) as never}
                />
                <ReferenceLine y={0} stroke="#3f3f46" />
                <Bar dataKey="newMrr" name="Novo" stackId="a" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expansion" name="Expansão" stackId="a" fill="#34D399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="contraction" name="Contração" stackId="a" fill="#F59E0B" radius={[0, 0, 3, 3]} />
                <Bar dataKey="churn" name="Churn" stackId="a" fill="#EF4444" radius={[0, 0, 3, 3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue + forecast */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white">Receita recebida + projeção</h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-zinc-400"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> Real</span>
                <span className="flex items-center gap-1.5 text-zinc-400"><span className="w-2.5 h-0.5 bg-white inline-block" style={{ borderTop: "1px dashed" }} /> Projeção</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mb-5">Últimos 12 meses reais + 3 meses projetados pela tendência recente — não é uma garantia, é uma estimativa simples.</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueWithForecast} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBilling" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
                  formatter={((v: number, name: string) => [formatCurrency(v), name === "total" ? "Receita real" : "Projeção"]) as never}
                />
                <Area type="monotone" dataKey="total" name="total" stroke="#10B981" strokeWidth={2} fill="url(#gBilling)" dot={false} activeDot={{ r: 4, fill: "#10B981" }} connectNulls={false} />
                <Area type="monotone" dataKey="projected" name="projected" stroke="#A855F7" strokeWidth={2} strokeDasharray="5 4" fill="none" dot={false} activeDot={{ r: 4, fill: "#A855F7" }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Faturas</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[150px]">
              <DatePicker accent="mono" clearable placeholder="De" value={dateFrom}
                onChange={(v) => { setDateFrom(v); setPage(1); }} className="h-9 text-xs" />
            </div>
            <span className="text-xs text-zinc-600">até</span>
            <div className="w-[150px]">
              <DatePicker accent="mono" clearable placeholder="Até" value={dateTo} min={dateFrom || undefined}
                onChange={(v) => { setDateTo(v); setPage(1); }} className="h-9 text-xs" />
            </div>
            {["ALL", "PAID", "PENDING", "FAILED", "REFUNDED"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn("px-2.5 py-1 text-xs font-medium rounded-lg transition-all", statusFilter === s ? "bg-white/15 border border-white/20 text-white" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300")}
              >
                {s === "ALL" ? "Todas" : STATUS_INFO[s]?.label}
              </button>
            ))}
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>
        </div>
        <div className="divide-y divide-zinc-800">
          {!loadingInvoices && invoices.length === 0 && <p className="text-sm text-zinc-500 text-center py-10">Nenhuma fatura encontrada</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">{inv.barbershopName}</p>
                  <p className="text-xs text-zinc-500">{inv.reason === "PLAN_CHANGE" ? "Mudança de plano" : "Renovação"} · {PLAN_LABEL[inv.plan] ?? inv.plan} · {formatDateTime(inv.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-300">{formatCurrency(inv.amount)}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_INFO[inv.status]?.color)}>{STATUS_INFO[inv.status]?.label ?? inv.status}</span>
                  {inv.status !== "PAID" && inv.status !== "REFUNDED" && (
                    <button onClick={() => reconcile(inv.id, "PAID")} className="text-xs text-emerald-400 hover:text-emerald-300">Marcar pago</button>
                  )}
                  {inv.status !== "FAILED" && inv.status !== "REFUNDED" && (
                    <button onClick={() => reconcile(inv.id, "FAILED")} className="text-xs text-red-400 hover:text-red-300">Marcar falha</button>
                  )}
                  {inv.status === "PAID" && (
                    <button onClick={() => setRefundingId(refundingId === inv.id ? null : inv.id)} className="text-xs text-zinc-400 hover:text-zinc-300">Reembolsar</button>
                  )}
                </div>
              </div>
              {refundingId === inv.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Motivo do reembolso..."
                    className="flex-1 h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                  <button onClick={() => submitRefund(inv.id)} disabled={!refundReason.trim()} className="px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50">
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{invoices.length} de {total} faturas</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
