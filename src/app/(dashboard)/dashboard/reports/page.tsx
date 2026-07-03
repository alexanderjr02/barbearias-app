"use client";

import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, Users,
  Scissors, Download, ArrowUpRight, ArrowDownRight,
  BarChart3, RefreshCw, Percent,
} from "lucide-react";
import { usePlan } from "@/context/PlanContext";
import { PlanGate } from "@/components/billing/PlanGate";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PERIODS = ["Esta semana", "Este mês", "Últimos 3 meses", "Este ano"];

const weekData = [
  { name: "Seg", receita: 420, despesas: 120, agendamentos: 8 },
  { name: "Ter", receita: 580, despesas: 140, agendamentos: 11 },
  { name: "Qua", receita: 390, despesas: 95, agendamentos: 7 },
  { name: "Qui", receita: 720, despesas: 155, agendamentos: 14 },
  { name: "Sex", receita: 950, despesas: 200, agendamentos: 18 },
  { name: "Sáb", receita: 1200, despesas: 180, agendamentos: 22 },
  { name: "Dom", receita: 280, despesas: 60, agendamentos: 5 },
];

const monthData = [
  { name: "Jan", receita: 18500, despesas: 6200, agendamentos: 278 },
  { name: "Fev", receita: 21000, despesas: 6800, agendamentos: 315 },
  { name: "Mar", receita: 19800, despesas: 7100, agendamentos: 297 },
  { name: "Abr", receita: 24500, despesas: 7300, agendamentos: 368 },
  { name: "Mai", receita: 22100, despesas: 6900, agendamentos: 332 },
  { name: "Jun", receita: 26800, despesas: 7500, agendamentos: 402 },
  { name: "Jul", receita: 28530, despesas: 7800, agendamentos: 412 },
];

const servicesData = [
  { name: "Corte + Barba", value: 35, color: "#F59E0B", count: 145 },
  { name: "Corte Degradê", value: 22, color: "#3B82F6", count: 91 },
  { name: "Barba", value: 18, color: "#10B981", count: 74 },
  { name: "Corte Simples", value: 15, color: "#8B5CF6", count: 62 },
  { name: "Outros", value: 10, color: "#6B7280", count: 40 },
];

const staffData = [
  { name: "João Silva", appointments: 145, revenue: 8700, commission: 3480, rating: 4.9, pct: 100 },
  { name: "Carlos Souza", appointments: 118, revenue: 7080, commission: 2832, rating: 4.8, pct: 81 },
  { name: "André Santos", appointments: 93, revenue: 5580, commission: 1953, rating: 4.7, pct: 64 },
  { name: "Marcos Ferreira", appointments: 56, revenue: 2800, commission: 840, rating: 4.5, pct: 38 },
];

const retentionData = [
  { name: "Jan", novos: 24, retornantes: 254 },
  { name: "Fev", novos: 31, retornantes: 284 },
  { name: "Mar", novos: 19, retornantes: 278 },
  { name: "Abr", novos: 38, retornantes: 330 },
  { name: "Mai", novos: 27, retornantes: 305 },
  { name: "Jun", novos: 33, retornantes: 369 },
  { name: "Jul", novos: 28, retornantes: 384 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((entry: any) => (
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

function KpiCard({ title, value, change, positive, icon: Icon, iconColor = "text-amber-400", sub }: {
  title: string; value: string; change: string; positive: boolean;
  icon: any; iconColor?: string; sub?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
          positive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
        )}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-sm text-zinc-500 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { can } = usePlan();
  const [period, setPeriod] = useState("Este mês");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isMonthly = period === "Este mês" || period === "Últimos 3 meses" || period === "Este ano";
  const data = isMonthly ? monthData : weekData;
  const totalRevenue = data.reduce((a, d) => a + d.receita, 0);
  const totalExpenses = data.reduce((a, d) => a + d.despesas, 0);
  const totalAppointments = data.reduce((a, d) => a + d.agendamentos, 0);
  const profit = totalRevenue - totalExpenses;
  const avgTicket = totalRevenue / totalAppointments;

  if (!can("advanced_reports")) {
    return (
      <>
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-white">Relatórios</h1>
            <p className="text-zinc-500 text-sm mt-1">Análise completa do seu negócio</p>
          </div>

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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/25">
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
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all">
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Relatórios</h1>
          <p className="text-zinc-500 text-sm mt-1">Análise completa do seu negócio</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  period === p ? "bg-zinc-700 text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                )}>
                {p}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Receita total" value={formatCurrency(totalRevenue)} change="+12%" positive icon={DollarSign} />
        <KpiCard title="Agendamentos" value={String(totalAppointments)} change="+5%" positive icon={Calendar} iconColor="text-blue-400" />
        <KpiCard title="Ticket médio" value={formatCurrency(avgTicket)} change="+8%" positive icon={TrendingUp} iconColor="text-green-400" />
        <KpiCard title="Margem líquida" value={`${Math.round((profit / totalRevenue) * 100)}%`} change="+3%" positive icon={Percent} iconColor="text-purple-400" sub={`Lucro: ${formatCurrency(profit)}`} />
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Receita vs Despesas</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{period}</p>
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
                <Tooltip formatter={(v: any) => [`${v}%`, "Participação"]} contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }} />
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
            <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">91.8% retenção</span>
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

      {/* Staff Performance Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-base font-bold text-white">Performance da Equipe</h3>
          <span className="text-xs text-zinc-500">{period}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Barbeiro", "Agendamentos", "Receita", "Comissão", "Avaliação", "Share"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {staffData.map((s, i) => (
                <tr key={s.name} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black",
                        i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-zinc-700 text-zinc-300"
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
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                      ⭐ {s.rating}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                          style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">{Math.round((s.revenue / staffData[0].revenue) * 100)}%</span>
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
            label: "Margem equipe", value: `${Math.round((1 - staffData.reduce((a, s) => a + s.commission, 0) / staffData.reduce((a, s) => a + s.revenue, 0)) * 100)}%`,
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
