"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  LayoutDashboard,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { apiGet } from "@/lib/apiClient";

interface MeResponse {
  name: string;
}

interface SummaryResponse {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayCount: number;
  unconfirmedToday: number;
  activeClients: number;
  monthRevenue: number;
  avgTicket: number;
  topBarbers: { name: string; appointments: number; revenue: number; share: number }[];
  recentAppointments: { id: string; client: string; service: string; barber: string; time: string; status: string; value: number }[];
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  COMPLETED: { label: "Concluído", icon: CheckCircle, color: "text-green-400" },
  IN_PROGRESS: { label: "Em andamento", icon: Clock, color: "text-yellow-400" },
  SCHEDULED: { label: "Agendado", icon: Calendar, color: "text-blue-400" },
  CANCELLED: { label: "Cancelado", icon: XCircle, color: "text-red-400" },
};

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export default function DashboardPage() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => apiGet<MeResponse>("/api/auth/me") });
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet<SummaryResponse>("/api/dashboard/summary"),
  });

  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title={`Olá${me?.name ? `, ${me.name.split(" ")[0]}` : ""}!`}
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Receita Hoje"
          value={formatCurrency(summary?.todayRevenue ?? 0)}
          change={summary ? pctChange(summary.todayRevenue, summary.yesterdayRevenue) : undefined}
          changeType={summary && summary.todayRevenue >= summary.yesterdayRevenue ? "positive" : "negative"}
          icon={DollarSign}
          description={summary ? `vs. ontem: ${formatCurrency(summary.yesterdayRevenue)}` : undefined}
        />
        <StatsCard
          title="Agendamentos Hoje"
          value={String(summary?.todayCount ?? 0)}
          icon={Calendar}
          description={summary ? `${summary.unconfirmedToday} ainda não confirmados` : undefined}
        />
        <StatsCard
          title="Clientes Ativos"
          value={String(summary?.activeClients ?? 0)}
          icon={Users}
          iconColor="text-blue-400"
          description="últimos 90 dias"
        />
        <StatsCard
          title="Ticket Médio"
          value={formatCurrency(summary?.avgTicket ?? 0)}
          icon={TrendingUp}
          iconColor="text-green-400"
          description="este mês"
        />
      </div>

      {/* Chart + Top Barbers */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-5">Top Barbeiros</h3>
          <div className="space-y-4">
            {(summary?.topBarbers ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum atendimento concluído este mês ainda.</p>
            )}
            {summary?.topBarbers.map((barber) => (
              <div key={barber.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                  {barber.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white truncate">
                      {barber.name}
                    </p>
                    <span className="text-xs text-zinc-500">
                      {barber.appointments} cortes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                        style={{ width: `${barber.share * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-amber-400 font-medium w-16 text-right">
                      {formatCurrency(barber.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 grid grid-cols-1 gap-3 text-center">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">{formatCurrency(summary?.monthRevenue ?? 0)}</p>
              <p className="text-xs text-zinc-500">Receita mensal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white">Agendamentos de Hoje</h3>
          <a
            href="/dashboard/appointments"
            className="text-sm text-amber-400 hover:underline"
          >
            Ver todos →
          </a>
        </div>
        <div className="divide-y divide-zinc-800">
          {!isLoading && (summary?.recentAppointments ?? []).length === 0 && (
            <p className="text-sm text-zinc-500 px-6 py-8 text-center">Nenhum agendamento para hoje.</p>
          )}
          {summary?.recentAppointments.map((apt) => {
            const status = statusConfig[apt.status] ?? statusConfig.SCHEDULED;
            const StatusIcon = status.icon;
            return (
              <div
                key={apt.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {apt.client.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{apt.client}</p>
                  <p className="text-xs text-zinc-500">
                    {apt.service} · {apt.barber}
                  </p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="text-sm font-medium text-white">{apt.time}</p>
                  <p className="text-xs text-zinc-500">hoje</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color} hidden md:flex`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </div>
                <div className="text-sm font-bold text-amber-400">
                  {formatCurrency(apt.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
