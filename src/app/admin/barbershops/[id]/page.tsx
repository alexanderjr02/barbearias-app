"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Store, Crown, Zap, Check, DollarSign, HeartPulse, Eye, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BarbershopActions } from "@/components/admin/BarbershopActions";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const PLAN_BADGE: Record<string, { label: string; icon: typeof Check; cls: string }> = {
  FREE: { label: "Starter", icon: Check, cls: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  PRO: { label: "Pro", icon: Zap, cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  ENTERPRISE: { label: "White Label", icon: Crown, cls: "bg-white/15 text-white border-white/20" },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  PAID: { label: "Pago", color: "text-emerald-400 bg-emerald-500/10" },
  PENDING: { label: "Pendente", color: "text-amber-400 bg-amber-500/10" },
  FAILED: { label: "Falhou", color: "text-red-400 bg-red-500/10" },
  REFUNDED: { label: "Reembolsado", color: "text-zinc-400 bg-zinc-500/10" },
};

const HEALTH_BAND_INFO: Record<string, { label: string; cls: string; barColor: string }> = {
  HEALTHY: { label: "Saudável", cls: "text-emerald-400", barColor: "bg-emerald-500" },
  AT_RISK: { label: "Atenção", cls: "text-amber-400", barColor: "bg-amber-500" },
  CRITICAL: { label: "Risco alto", cls: "text-red-400", barColor: "bg-red-500" },
};

interface Detail {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  plan: string;
  isActive: boolean;
  primaryColor: string;
  logo: string | null;
  createdAt: string;
  lifetimeRevenue: number;
  owner: { name: string; email: string; phone: string | null; createdAt: string; lastLoginAt: string | null; isActive: boolean };
  _count: { staff: number; services: number; appointments: number; clients: number };
  platformInvoices: { id: string; plan: string; amount: number; status: string; reason: string; createdAt: string }[];
  whiteLabelRequest: { status: string } | null;
  health: { score: number; band: string; reasons: string[] };
}

export default function AdminBarbershopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [changingPlan, setChangingPlan] = useState(false);
  const [refundingInvoiceId, setRefundingInvoiceId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [entering, setEntering] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-barbershop", id],
    queryFn: () => apiGet<Detail>(`/api/admin/barbershops/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-barbershop", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-barbershops"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const changePlan = async (plan: string) => {
    await apiPatch(`/api/admin/barbershops/${id}`, { plan });
    setChangingPlan(false);
    invalidate();
  };

  const toggleActive = async () => {
    if (!data) return;
    await apiPatch(`/api/admin/barbershops/${id}`, { isActive: !data.isActive });
    invalidate();
  };

  // Entra no painel com os olhos do dono. Recarrega de verdade em vez de
  // navegar pelo roteador: a sessão trocou no cookie, e todo dado em cache na
  // página é da conta de admin.
  const impersonate = async () => {
    setEntering(true);
    try {
      const res = await apiPost<{ redirectTo: string }>("/api/admin/impersonate", { barbershopId: id });
      window.location.href = res.redirectTo ?? "/dashboard";
    } catch {
      setEntering(false);
    }
  };

  const submitRefund = async (invoiceId: string) => {
    if (!refundReason.trim()) return;
    await apiPost(`/api/admin/billing/invoices/${invoiceId}/refund`, { reason: refundReason });
    setRefundingInvoiceId(null);
    setRefundReason("");
    invalidate();
  };

  if (isLoading || !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-40 bg-zinc-900 rounded-lg animate-pulse" />
        <div className="h-40 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  const badge = PLAN_BADGE[data.plan] ?? PLAN_BADGE.FREE;
  const BadgeIcon = badge.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/admin/barbershops" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <PageHeader
        icon={Store}
        title={data.name}
        subtitle={`${data.city ?? "—"}${data.state ? `, ${data.state}` : ""}`}
        accent="mono"
        action={
          <div className="flex items-center gap-3">
            <a href={`/booking/${data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
              <ExternalLink className="w-4 h-4" /> Ver página pública
            </a>
            <button
              onClick={impersonate}
              disabled={entering}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-60"
            >
              {entering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Entrar como o gestor
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-2">Plano</p>
          {changingPlan ? (
            <div className="flex gap-1.5">
              {(["FREE", "PRO", "ENTERPRISE"] as const).map((p) => (
                <button key={p} onClick={() => changePlan(p)} className={cn("text-xs px-2 py-1 rounded font-medium border", PLAN_BADGE[p].cls)}>
                  {PLAN_BADGE[p].label}
                </button>
              ))}
              <button onClick={() => setChangingPlan(false)} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", badge.cls)}>
                <BadgeIcon className="w-3 h-3" /> {badge.label}
              </span>
              <button onClick={() => setChangingPlan(true)} className="text-xs text-zinc-500 hover:text-white transition-colors">alterar</button>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-2">Status</p>
          <button
            onClick={toggleActive}
            className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full border transition-all",
              data.isActive ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30" : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30"
            )}
          >
            {data.isActive ? "Ativa" : "Suspensa"}
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Receita total (concluídos)</p>
          <p className="text-xl font-black text-emerald-400">{formatCurrency(data.lifetimeRevenue)}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500 flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5" /> Saúde da barbearia</p>
          <span className={cn("text-sm font-bold", HEALTH_BAND_INFO[data.health.band]?.cls)}>{data.health.score}/100 · {HEALTH_BAND_INFO[data.health.band]?.label}</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div className={cn("h-full rounded-full", HEALTH_BAND_INFO[data.health.band]?.barColor)} style={{ width: `${data.health.score}%` }} />
        </div>
        {data.health.reasons.length > 0 ? (
          <ul className="space-y-1">
            {data.health.reasons.map((r) => (
              <li key={r} className="text-xs text-zinc-500">• {r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum sinal de risco identificado.</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Barbeiros", value: data._count.staff },
          { label: "Serviços", value: data._count.services },
          { label: "Agendamentos", value: data._count.appointments },
          { label: "Clientes", value: data._count.clients },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-lg font-black text-white">{s.value}</p>
            <p className="text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Dono da barbearia</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">{data.owner.name}</p>
            <p className="text-xs text-zinc-500">{data.owner.email} {data.owner.phone && `· ${data.owner.phone}`}</p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>Cadastrado {formatDate(data.owner.createdAt)}</p>
            <p>Último login: {data.owner.lastLoginAt ? formatDateTime(data.owner.lastLoginAt) : "nunca"}</p>
          </div>
        </div>
      </div>

      {data.whiteLabelRequest && (
        <div className="bg-zinc-900 border border-white/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Solicitação White Label</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Status atual: {data.whiteLabelRequest.status}</p>
          </div>
          <Link href="/admin/white-label" className="text-xs text-white hover:text-zinc-200">Gerenciar →</Link>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white">Histórico de faturas</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {data.platformInvoices.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">Nenhuma fatura ainda</p>}
          {data.platformInvoices.map((inv) => (
            <div key={inv.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-300">{inv.reason === "PLAN_CHANGE" ? "Mudança de plano" : "Renovação"} · {PLAN_BADGE[inv.plan]?.label ?? inv.plan}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(inv.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-300">{formatCurrency(inv.amount)}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", INVOICE_STATUS[inv.status]?.color)}>{INVOICE_STATUS[inv.status]?.label ?? inv.status}</span>
                  {inv.status === "PAID" && (
                    <button onClick={() => setRefundingInvoiceId(refundingInvoiceId === inv.id ? null : inv.id)} className="text-xs text-red-400 hover:text-red-300">
                      Reembolsar
                    </button>
                  )}
                </div>
              </div>
              {refundingInvoiceId === inv.id && (
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
      </div>

      <BarbershopActions
        id={data.id}
        slug={data.slug}
        name={data.name}
        ownerEmail={data.owner.email}
        isActive={data.isActive}
      />
    </div>
  );
}
