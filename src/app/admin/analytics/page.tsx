"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Users, MessageCircle, TrendingUp, Gauge, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

interface CohortRow { cohort: string; size: number; retention: (number | null)[] }
interface ActivationStep { step: string; count: number }
interface PlanLimitUsageRow { barbershopId: string; barbershopName: string; plan: string; appointmentsUsedPct: number | null; staffUsedPct: number | null }
interface NewIpLoginRow { userName: string; userEmail: string; role: string; ipAddress: string | null; createdAt: string }

interface AnalyticsData {
  activeUsers: { dau: number; wau: number; mau: number };
  dailyTrend: { label: string; activeUsers: number }[];
  chatbot: {
    totalMessages30d: number;
    trend: { label: string; count: number }[];
    topBarbershops: { barbershopName: string; count: number }[];
  };
  retentionCohorts: CohortRow[];
  activationFunnel: ActivationStep[];
  planLimitUsage: PlanLimitUsageRow[];
  newIpLogins: NewIpLoginRow[];
}

const PLAN_LABEL: Record<string, string> = { FREE: "Starter", PRO: "Pro", ENTERPRISE: "White Label" };

function KpiCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
        <Users className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-sm text-zinc-500 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => apiGet<AnalyticsData>("/api/admin/analytics"),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Activity}
        title="Analytics"
        subtitle="Usuários ativos e uso do chatbot — dado real desde que essa tela entrou no ar"
        accent="mono"
      />

      {isLoading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard title="Usuários ativos hoje (DAU)" value={String(data.activeUsers.dau)} />
            <KpiCard title="Usuários ativos na semana (WAU)" value={String(data.activeUsers.wau)} />
            <KpiCard title="Usuários ativos no mês (MAU)" value={String(data.activeUsers.mau)} />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Usuários ativos por dia</h3>
            <p className="text-xs text-zinc-500 mb-5">Últimos 14 dias — cresce a partir de agora, sem histórico inventado.</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.dailyTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="activeUsers" name="Ativos" stroke="#A855F7" strokeWidth={2} fill="url(#gDau)" dot={false} activeDot={{ r: 4, fill: "#A855F7" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Uso do chatbot</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-5">{data.chatbot.totalMessages30d} mensagens nos últimos 30 dias</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.chatbot.trend} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="count" name="Mensagens" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-base font-bold text-white mb-5">Barbearias que mais usam o chatbot</h3>
              {data.chatbot.topBarbershops.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhuma mensagem nos últimos 30 dias</p>
              ) : (
                <div className="space-y-3">
                  {data.chatbot.topBarbershops.map((s, i) => (
                    <div key={s.barbershopName} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-600 w-4">{i + 1}</span>
                      <span className="text-sm text-zinc-300 flex-1 truncate">{s.barbershopName}</span>
                      <span className="text-sm font-semibold text-amber-400">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Retention cohorts */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-white" />
              <h3 className="text-base font-bold text-white">Retenção por cohort</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-5">% de barbearias de cada mês de cadastro que fizeram login em cada mês seguinte — só é significativo a partir de agora.</p>
            {data.retentionCohorts.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">Nenhum cadastro ainda</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500">
                      <th className="pb-2 pr-4">Cohort</th>
                      <th className="pb-2 pr-4">Barbearias</th>
                      {data.retentionCohorts[0]?.retention.map((_, i) => (
                        <th key={i} className="pb-2 pr-4">Mês {i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {data.retentionCohorts.map((row) => (
                      <tr key={row.cohort}>
                        <td className="py-2 pr-4 text-zinc-300">{row.cohort}</td>
                        <td className="py-2 pr-4 text-zinc-500">{row.size}</td>
                        {row.retention.map((pct, i) => (
                          <td key={i} className="py-2 pr-4">
                            {pct === null ? <span className="text-zinc-700">—</span> : (
                              <span className={cn("font-semibold", pct >= 50 ? "text-emerald-400" : pct >= 20 ? "text-amber-400" : "text-red-400")}>{pct}%</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activation funnel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-base font-bold text-white mb-5">Funil de ativação</h3>
              <div className="space-y-3">
                {data.activationFunnel.map((step, i) => {
                  const total = data.activationFunnel[0]?.count || 1;
                  const pct = Math.round((step.count / total) * 100);
                  return (
                    <div key={step.step}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400">{i + 1}. {step.step}</span>
                        <span className="text-zinc-300 font-semibold">{step.count} · {pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan limit usage */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Perto do limite do plano</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">80%+ de uso — oportunidade de upgrade</p>
              {data.planLimitUsage.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhuma barbearia perto do limite</p>
              ) : (
                <div className="space-y-3">
                  {data.planLimitUsage.slice(0, 8).map((row) => (
                    <div key={row.barbershopId} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="text-sm text-zinc-300">{row.barbershopName}</p>
                        <p className="text-zinc-600">{PLAN_LABEL[row.plan] ?? row.plan}</p>
                      </div>
                      <div className="text-right">
                        {row.appointmentsUsedPct !== null && <p className={cn("font-semibold", row.appointmentsUsedPct >= 100 ? "text-red-400" : "text-amber-400")}>{row.appointmentsUsedPct}% agend.</p>}
                        {row.staffUsedPct !== null && <p className={cn("font-semibold", row.staffUsedPct >= 100 ? "text-red-400" : "text-amber-400")}>{row.staffUsedPct}% equipe</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* New IP logins */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="text-base font-bold text-white">Logins de IP novo</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">Sem geolocalização — só sinaliza um IP nunca visto antes para aquele usuário.</p>
            {data.newIpLogins.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">Nenhum login de IP novo registrado</p>
            ) : (
              <div className="space-y-2">
                {data.newIpLogins.map((login, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-zinc-800 last:border-0 pb-2 last:pb-0">
                    <div>
                      <span className="text-zinc-300 font-medium">{login.userName}</span>
                      <span className="text-zinc-600"> · {login.userEmail}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500">
                      <span className="font-mono">{login.ipAddress ?? "—"}</span>
                      <span>{formatDateTime(login.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
