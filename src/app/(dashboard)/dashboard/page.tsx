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
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Skeleton } from "@/components/ui/Skeleton";
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
  /** Marcado para hoje e ainda não concluído, o que ainda entra no caixa. */
  todayExpected: number;
  /** % da capacidade de hoje (horário × barbeiros) já vendida. */
  todayOccupancy: number;
  /** Dia sem expediente: capacidade zero não é agenda lotada. */
  closedToday: boolean;
  freeMinutesToday: number;
  monthlyGoal: number | null;
  /** O ritmo de hoje mantido até o fim do mês. */
  projection: number;
  /** Mesmo intervalo do mês passado, até o mesmo dia. */
  lastMonthRevenue: number;
  noShowsToday: number;
  lowStock: { name: string; quantity: number }[];
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  COMPLETED: { label: "Concluído", icon: CheckCircle, color: "text-emerald-400" },
  IN_PROGRESS: { label: "Em andamento", icon: Clock, color: "text-yellow-400" },
  SCHEDULED: { label: "Agendado", icon: Calendar, color: "text-zinc-400" },
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

      <OnboardingChecklist />

      {isLoading || !summary ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[168px] rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* HOJE, a primeira pergunta de todo dono: como está o dia?
              Já entrou, ainda entra, e quanto da casa está vendido. */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs text-zinc-500">Já entrou hoje</p>
              <p className="mt-1.5 text-3xl font-black tracking-tight text-white">{formatCurrency(summary.todayRevenue)}</p>
              <p className="mt-1.5 text-xs text-zinc-500">
                {summary.todayRevenue === 0 && summary.yesterdayRevenue === 0 ? (
                  "sem movimento ainda"
                ) : (
                  <>
                    {summary.todayRevenue >= summary.yesterdayRevenue ? (
                      <span className="text-emerald-400">acima de ontem</span>
                    ) : (
                      <span className="text-zinc-400">abaixo de ontem</span>
                    )}
                    {" · ontem "}{formatCurrency(summary.yesterdayRevenue)}
                  </>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs text-zinc-500">Ainda entra hoje</p>
              <p className="mt-1.5 text-3xl font-black tracking-tight text-amber-400">{formatCurrency(summary.todayExpected)}</p>
              <p className="mt-1.5 text-xs text-zinc-500">
                {summary.todayCount} agendamento{summary.todayCount === 1 ? "" : "s"} no dia
                {summary.unconfirmedToday > 0 && ` · ${summary.unconfirmedToday} sem confirmar`}
              </p>
            </div>

            {/* Cadeira vazia é dinheiro que não volta, por isso ocupação
                aparece ao lado do caixa, não escondida num relatório. */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-zinc-500">Agenda de hoje</p>
                <p className="text-sm font-bold text-white">{summary.closedToday ? "—" : `${summary.todayOccupancy}%`}</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${summary.todayOccupancy}%` }} />
              </div>
              <p className="mt-2.5 text-xs text-zinc-500">
                {summary.closedToday
                  ? "barbearia fechada hoje"
                  : summary.freeMinutesToday > 0
                    ? `${Math.floor(summary.freeMinutesToday / 60)}h${summary.freeMinutesToday % 60 > 0 ? `${summary.freeMinutesToday % 60}min` : ""} de cadeira livre`
                    : "agenda cheia"}
              </p>
            </div>
          </div>

          {/* MÊS, estou no caminho? Projeção pelo ritmo atual, e comparação
              com o mesmo ponto do mês passado (não com o mês fechado, que
              diria "caiu 60%" todo dia 5). */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500">Faturamento do mês</p>
                <p className="mt-1.5 text-3xl font-black tracking-tight text-white">{formatCurrency(summary.monthRevenue)}</p>
                <p className="mt-1.5 text-xs text-zinc-500">
                  {summary.lastMonthRevenue > 0 ? (
                    <>
                      <span className={summary.monthRevenue >= summary.lastMonthRevenue ? "text-emerald-400" : "text-red-400"}>
                        {summary.monthRevenue >= summary.lastMonthRevenue ? "+" : ""}
                        {Math.round(((summary.monthRevenue - summary.lastMonthRevenue) / summary.lastMonthRevenue) * 100)}%
                      </span>
                      {" vs. mesmo dia do mês passado"}
                    </>
                  ) : (
                    "primeiro mês com movimento"
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Projeção de fechamento</p>
                <p className="mt-1.5 text-xl font-black text-amber-400">{formatCurrency(summary.projection)}</p>
                <p className="mt-1 text-[11px] text-zinc-600">mantendo o ritmo de hoje</p>
              </div>
            </div>

            {summary.monthlyGoal && summary.monthlyGoal > 0 ? (
              <div className="mt-5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-500">Meta de {formatCurrency(summary.monthlyGoal)}</span>
                  <span className="font-bold text-white">{Math.round((summary.monthRevenue / summary.monthlyGoal) * 100)}%</span>
                </div>
                <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${summary.monthRevenue >= summary.monthlyGoal ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, (summary.monthRevenue / summary.monthlyGoal) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {summary.monthRevenue >= summary.monthlyGoal
                    ? "Meta batida."
                    : summary.projection >= summary.monthlyGoal
                      ? `No ritmo de bater. Faltam ${formatCurrency(summary.monthlyGoal - summary.monthRevenue)}.`
                      : `Fora do ritmo. Precisa de ${formatCurrency(summary.monthlyGoal - summary.projection)} acima da projeção.`}
                </p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-500">
                Sem meta definida. Com uma meta, esta faixa mostra o quanto falta e se o ritmo atual chega lá. Defina em Financeiro.
              </p>
            )}
          </div>

          {/* PRECISA DE VOCÊ, o dashboard só é útil se transformar número em
              decisão. Some inteiro quando não há nada pendente. */}
          {(summary.noShowsToday > 0 || summary.unconfirmedToday > 0 || summary.lowStock.length > 0) && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm font-bold text-white">Precisa de você</p>
              <div className="mt-3 space-y-2">
                {summary.unconfirmedToday > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    <p className="flex-1 text-sm text-zinc-300">
                      <span className="font-bold text-white">{summary.unconfirmedToday}</span> agendamento
                      {summary.unconfirmedToday === 1 ? "" : "s"} de hoje sem confirmação
                    </p>
                  </div>
                )}
                {summary.noShowsToday > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                    <p className="flex-1 text-sm text-zinc-300">
                      <span className="font-bold text-white">{summary.noShowsToday}</span> cliente
                      {summary.noShowsToday === 1 ? "" : "s"} não compareceu hoje
                    </p>
                  </div>
                )}
                {summary.lowStock.length > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    <p className="flex-1 text-sm text-zinc-300">
                      Estoque baixo: <span className="font-bold text-white">{summary.lowStock.map((p) => p.name).join(", ")}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contexto de fundo: ticket e base de clientes mudam devagar, então
              vêm menores, depois do que exige ação. */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
              <p className="text-xs text-zinc-500">Ticket médio</p>
              <p className="mt-1 text-xl font-black text-white">{formatCurrency(summary.avgTicket)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
              <p className="text-xs text-zinc-500">Clientes ativos</p>
              <p className="mt-1 text-xl font-black text-white">{summary.activeClients}</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">vieram nos últimos 90 dias</p>
            </div>
          </div>
        </>
      )}

      {/* Gráfico e ranking lado a lado: o histórico contextualiza os números
          de cima, e o ranking diz de quem veio o mês. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-5">Top Barbeiros</h3>
          <div className="space-y-4">
            {(summary?.topBarbers ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum atendimento concluído este mês ainda.</p>
            )}
            {summary?.topBarbers.map((barber) => (
              <div key={barber.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
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
                        className="h-full bg-amber-500 rounded-full"
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
          {isLoading && (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          )}
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
