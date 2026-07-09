"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Store, Users, DollarSign, Crown, Zap, Check,
  AlertTriangle, ArrowUpRight, Shield, type LucideIcon,
  XCircle, PauseCircle, Sparkles, LifeBuoy, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet } from "@/lib/apiClient";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

const PLAN_LABELS: Record<string, { label: string; icon: typeof Check; color: string; bg: string }> = {
  FREE: { label: "Starter", icon: Check, color: "text-zinc-400", bg: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  PRO: { label: "Pro", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  ENTERPRISE: { label: "White Label", icon: Crown, color: "text-purple-400", bg: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  PAID: { label: "Pago", color: "text-emerald-400 bg-emerald-500/10" },
  PENDING: { label: "Pendente", color: "text-amber-400 bg-amber-500/10" },
  FAILED: { label: "Falhou", color: "text-red-400 bg-red-500/10" },
};

interface DashboardData {
  total: number;
  active: number;
  inactive: number;
  byPlan: Record<string, number>;
  mrr: number;
  arr: number;
  signupsByMonth: { label: string; count: number }[];
  usersByRole: Record<string, number>;
  recentBarbershops: { id: string; name: string; slug: string; plan: string; primaryColor: string; logo: string | null; createdAt: string; owner: { name: string; email: string } }[];
  recentInvoices: { id: string; barbershopName: string; plan: string; amount: number; status: string; reason: string; createdAt: string }[];
  failedInvoices30d: number;
  alerts: { failedInvoices: number; suspendedBarbershops: number; pendingWhiteLabel: number; openTickets: number };
}

function KpiCard({ title, value, icon: Icon, iconColor = "text-purple-400", sub }: {
  title: string; value: string; icon: LucideIcon; iconColor?: string; sub?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-3">
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-sm text-zinc-500 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

// Everything that needs the owner's attention, in one glance — before this,
// failed invoices, suspended shops, pending White Label requests and open
// support tickets each only surfaced on their own separate page.
function AlertsCenter({ alerts }: { alerts: DashboardData["alerts"] }) {
  const items = [
    { key: "failedInvoices", count: alerts.failedInvoices, icon: XCircle, label: (n: number) => `${n} fatura${n > 1 ? "s" : ""} falhada${n > 1 ? "s" : ""}`, href: "/admin/billing" },
    { key: "suspendedBarbershops", count: alerts.suspendedBarbershops, icon: PauseCircle, label: (n: number) => `${n} barbearia${n > 1 ? "s" : ""} suspensa${n > 1 ? "s" : ""}`, href: "/admin/barbershops?status=inactive" },
    { key: "pendingWhiteLabel", count: alerts.pendingWhiteLabel, icon: Sparkles, label: (n: number) => `${n} solicitação${n > 1 ? "ões" : ""} White Label pendente${n > 1 ? "s" : ""}`, href: "/admin/white-label" },
    { key: "openTickets", count: alerts.openTickets, icon: LifeBuoy, label: (n: number) => `${n} chamado${n > 1 ? "s" : ""} de suporte aberto${n > 1 ? "s" : ""}`, href: "/admin/support" },
  ].filter((i) => i.count > 0);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Tudo em dia — nenhum alerta pendente.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">Central de Alertas</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href} className="flex items-center gap-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors">
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label(item.count)}</span>
              <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiGet<DashboardData>("/api/admin/dashboard"),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={Shield}
        title="Painel Administrativo"
        subtitle="Visão geral de toda a plataforma CORTIX"
        accent="purple"
      />

      {isLoading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-32 animate-pulse" />)}
        </div>
      ) : (
        <>
          <AlertsCenter alerts={data.alerts} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Barbearias ativas" value={String(data.active)} icon={Store} sub={`${data.total} cadastradas no total`} />
            <KpiCard title="MRR" value={formatCurrency(data.mrr)} icon={DollarSign} iconColor="text-emerald-400" sub={`${formatCurrency(data.arr)} ARR`} />
            <KpiCard title="Usuários" value={String(Object.values(data.usersByRole).reduce((a, b) => a + b, 0))} icon={Users} iconColor="text-blue-400" sub={`${data.usersByRole.CLIENT ?? 0} clientes`} />
            <KpiCard title="Suspensas" value={String(data.inactive)} icon={AlertTriangle} iconColor={data.inactive > 0 ? "text-red-400" : "text-zinc-500"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(["FREE", "PRO", "ENTERPRISE"] as const).map((plan) => {
              const info = PLAN_LABELS[plan];
              const Icon = info.icon;
              return (
                <div key={plan} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", info.bg)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={cn("text-xl font-black", info.color)}>{data.byPlan[plan] ?? 0}</p>
                    <p className="text-xs text-zinc-500">{info.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Novas barbearias</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Últimos 6 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.signupsByMonth} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="count" name="Barbearias" stroke="#A855F7" strokeWidth={2} fill="url(#gSignups)" dot={false} activeDot={{ r: 4, fill: "#A855F7" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Últimas barbearias cadastradas</h3>
                <Link href="/admin/barbershops" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  Ver todas <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {data.recentBarbershops.length === 0 && <p className="text-sm text-zinc-500 text-center py-6">Nenhuma barbearia ainda</p>}
                {data.recentBarbershops.map((shop) => (
                  <div key={shop.id} className="flex items-center gap-3">
                    {shop.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.logo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: shop.primaryColor }}>
                        {shop.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{shop.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{shop.owner.email}</p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0", PLAN_LABELS[shop.plan]?.bg)}>
                      {PLAN_LABELS[shop.plan]?.label ?? shop.plan}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Faturas recentes</h3>
                <Link href="/admin/billing" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  Ver todas <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {data.recentInvoices.length === 0 && <p className="text-sm text-zinc-500 text-center py-6">Nenhuma fatura ainda</p>}
                {data.recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{inv.barbershopName}</p>
                      <p className="text-xs text-zinc-500">{formatDateTime(inv.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold text-zinc-300">{formatCurrency(inv.amount)}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", INVOICE_STATUS[inv.status]?.color)}>
                      {INVOICE_STATUS[inv.status]?.label ?? inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
