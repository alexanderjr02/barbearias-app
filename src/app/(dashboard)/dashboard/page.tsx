import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { formatCurrency } from "@/lib/utils";

const recentAppointments = [
  {
    id: "1",
    client: "Lucas Mendes",
    service: "Corte + Barba",
    barber: "João Silva",
    time: "09:00",
    status: "COMPLETED",
    value: 55,
  },
  {
    id: "2",
    client: "Pedro Alves",
    service: "Corte Degradê",
    barber: "Carlos Souza",
    time: "10:00",
    status: "IN_PROGRESS",
    value: 45,
  },
  {
    id: "3",
    client: "Marcos Lima",
    service: "Barba",
    barber: "João Silva",
    time: "11:00",
    status: "SCHEDULED",
    value: 25,
  },
  {
    id: "4",
    client: "Felipe Costa",
    service: "Corte Simples",
    barber: "André Santos",
    time: "11:30",
    status: "SCHEDULED",
    value: 35,
  },
  {
    id: "5",
    client: "Gabriel Rocha",
    service: "Corte + Barba",
    barber: "Carlos Souza",
    time: "14:00",
    status: "SCHEDULED",
    value: 55,
  },
];

const topBarbers = [
  { name: "João Silva", appointments: 45, revenue: 2025, avatar: "JS" },
  { name: "Carlos Souza", appointments: 38, revenue: 1710, avatar: "CS" },
  { name: "André Santos", appointments: 31, revenue: 1395, avatar: "AS" },
];

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  COMPLETED: { label: "Concluído", icon: CheckCircle, color: "text-green-400" },
  IN_PROGRESS: { label: "Em andamento", icon: Clock, color: "text-yellow-400" },
  SCHEDULED: { label: "Agendado", icon: Calendar, color: "text-blue-400" },
  CANCELLED: { label: "Cancelado", icon: XCircle, color: "text-red-400" },
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            Bom dia, João! 👋
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Quarta-feira, 02 de Julho de 2025
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            Relatório
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
            + Novo Agendamento
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Receita Hoje"
          value="R$ 1.250"
          change="+12%"
          changeType="positive"
          icon={DollarSign}
          description="vs. ontem: R$ 1.116"
        />
        <StatsCard
          title="Agendamentos Hoje"
          value="18"
          change="+5"
          changeType="positive"
          icon={Calendar}
          description="4 ainda não confirmados"
        />
        <StatsCard
          title="Clientes Ativos"
          value="342"
          change="+7 este mês"
          changeType="positive"
          icon={Users}
          iconColor="text-blue-400"
        />
        <StatsCard
          title="Ticket Médio"
          value="R$ 69"
          change="+8%"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-green-400"
          description="vs. semana passada"
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
            {topBarbers.map((barber, i) => (
              <div key={barber.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                  {barber.avatar}
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
                        style={{ width: `${(barber.appointments / 45) * 100}%` }}
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

          <div className="mt-6 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3 text-center">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">R$ 28.5K</p>
              <p className="text-xs text-zinc-500">Receita mensal</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">75%</p>
              <p className="text-xs text-zinc-500">Meta atingida</p>
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
          {recentAppointments.map((apt) => {
            const status = statusConfig[apt.status];
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
