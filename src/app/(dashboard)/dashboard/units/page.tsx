"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Store, Plus, TrendingUp, TrendingDown, Users, Ticket, CalendarClock,
  Sparkles, ArrowRight, Loader2, Crown, Check, Building2,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { formatCurrency, cn } from "@/lib/utils";

interface Unit {
  id: string;
  name: string;
  city: string | null;
  slug: string;
  isPrimary: boolean;
  isCurrent: boolean;
  monthRevenue: number;
  appointments: number;
  avgTicket: number;
  weekRevenue: number;
  weekDeltaPercent: number | null;
  staffCount: number;
  emptySlotsToday: number;
  churnedClients: number;
  revenuePerBarber: number;
}
interface Overview {
  totals: { unitCount: number; totalRevenue: number; totalAppointments: number; avgTicket: number };
  best: string | null;
  worst: string | null;
  mostEfficient: string | null;
  leastEfficient: string | null;
  units: Unit[];
}

// Painel da rede. A referência de layout são os dashboards multi-loja do
// Square/Shopify (consolidado no topo, lojas comparadas embaixo), com uma
// diferença que nenhum deles tem: a leitura do Copiloto sobre a rede, gerada
// dos mesmos números da tela.
export default function UnitsPage() {
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["units-overview"],
    queryFn: () => apiGet<Overview>("/api/units/overview"),
  });

  const enterUnit = async (u: Unit) => {
    if (u.isCurrent) return;
    setSwitching(u.id);
    try {
      await apiPost("/api/units/switch", { barbershopId: u.id });
      window.location.reload();
    } catch {
      toast.error("Não consegui entrar nesta unidade");
      setSwitching(null);
    }
  };

  const createUnit = async () => {
    const name = newName.trim();
    if (name.length < 2) return toast.error("Dê um nome para a unidade");
    setCreating(true);
    try {
      await apiPost("/api/units", { name, city: newCity.trim() || undefined });
      toast.success(`Unidade "${name}" criada`);
      setNewName("");
      setNewCity("");
      setFormOpen(false);
      refetch();
    } catch {
      toast.error("Não consegui criar a unidade. Multi-unidade faz parte do White Label.");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando sua rede…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">Não consegui carregar suas unidades.</p>
        <button onClick={() => refetch()} className="mt-3 text-sm text-amber-400 hover:underline">Tentar de novo</button>
      </div>
    );
  }

  const { totals, units } = data;
  const isNetwork = units.length > 1;

  // Leitura do Copiloto — derivada dos números da própria tela (sem chamar a
  // IA no carregamento, que custaria em toda visita).
  const insight = buildInsight(data);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-400" /> Unidades
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isNetwork ? `Sua rede tem ${units.length} unidades.` : "Abra outra unidade para comparar o desempenho lado a lado."}
          </p>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-900 text-sm font-semibold rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" /> Nova unidade
        </button>
      </div>

      {formOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-zinc-400">Nome da unidade</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Cortezz Zona Sul"
              className="mt-1 w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-zinc-400">Cidade (opcional)</label>
            <input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createUnit()}
              placeholder="Ex.: São Paulo"
              className="mt-1 w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={createUnit}
            disabled={creating}
            className="h-10 px-5 bg-amber-500 text-zinc-900 text-sm font-bold rounded-xl hover:bg-amber-400 transition disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar
          </button>
        </div>
      )}

      {/* Consolidado da rede */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={TrendingUp} label="Faturamento da rede" value={formatCurrency(totals.totalRevenue)} hint="no mês" />
        <Kpi icon={CalendarClock} label="Atendimentos" value={String(totals.totalAppointments)} hint="no mês" />
        <Kpi icon={Ticket} label="Ticket médio" value={formatCurrency(totals.avgTicket)} hint="da rede" />
        <Kpi icon={Store} label="Unidades" value={String(totals.unitCount)} hint={isNetwork ? "ativas" : "abra a próxima"} />
      </div>

      {/* Leitura do Copiloto */}
      {insight && (
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Leitura do Copiloto</p>
            <p className="text-sm text-zinc-200 mt-1 leading-relaxed">{insight}</p>
            <p className="text-xs text-zinc-500 mt-2">
              Pergunte no Copiloto: <span className="text-zinc-400">&ldquo;compara minhas unidades&rdquo;</span> ou{" "}
              <span className="text-zinc-400">&ldquo;meu melhor barbeiro está na loja certa?&rdquo;</span>
            </p>
          </div>
        </div>
      )}

      {/* Unidades lado a lado */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {units.map((u) => {
          const isBest = isNetwork && u.name === data.best;
          const isTopEfficiency = isNetwork && u.name === data.mostEfficient;
          return (
            <div
              key={u.id}
              className={cn(
                "rounded-2xl border bg-zinc-900 p-4 transition-all",
                u.isCurrent ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white truncate">{u.name}</h3>
                    {u.isPrimary && <Badge className="bg-zinc-800 text-zinc-400">Matriz</Badge>}
                    {u.isCurrent && <Badge className="bg-amber-500/20 text-amber-400">Você está aqui</Badge>}
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">{u.city || "Sem cidade definida"}</p>
                </div>
                {isBest && <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" aria-label="Maior faturamento" />}
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">{formatCurrency(u.monthRevenue)}</span>
                {u.weekDeltaPercent !== null && (
                  <span className={cn("text-xs font-semibold flex items-center gap-0.5", u.weekDeltaPercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {u.weekDeltaPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(u.weekDeltaPercent)}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-600">no mês · {u.appointments} atendimentos</p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric label="Ticket médio" value={formatCurrency(u.avgTicket)} />
                <Metric
                  label="Por barbeiro"
                  value={formatCurrency(u.revenuePerBarber)}
                  highlight={isTopEfficiency}
                  hint={isTopEfficiency ? "mais eficiente" : undefined}
                />
                <Metric label="Equipe" value={`${u.staffCount}`} icon={Users} />
                <Metric label="Vagas hoje" value={`${u.emptySlotsToday}`} icon={CalendarClock} />
              </div>

              <button
                onClick={() => enterUnit(u)}
                disabled={u.isCurrent || !!switching}
                className={cn(
                  "mt-4 w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
                  u.isCurrent
                    ? "bg-zinc-800 text-zinc-500 cursor-default"
                    : "bg-zinc-800 text-zinc-200 hover:bg-amber-500 hover:text-zinc-900 disabled:opacity-50"
                )}
              >
                {switching === u.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : u.isCurrent ? (
                  <><Check className="w-3.5 h-3.5" /> Unidade atual</>
                ) : (
                  <>Entrar nesta unidade <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Insight determinístico dos números da tela — sem custo de IA por visita. */
function buildInsight(d: Overview): string | null {
  const { units } = d;
  if (units.length < 2) {
    return "Com mais de uma unidade, o Copiloto passa a comparar suas lojas: quem fatura mais por barbeiro, onde a agenda está vazia e em qual unidade agir primeiro.";
  }
  const best = units.find((u) => u.name === d.best);
  const efficient = units.find((u) => u.name === d.mostEfficient);
  const worst = units.find((u) => u.name === d.leastEfficient);

  if (efficient && worst && efficient.name !== worst.name && worst.revenuePerBarber > 0) {
    const ratio = Math.round((efficient.revenuePerBarber / worst.revenuePerBarber - 1) * 100);
    if (ratio >= 15) {
      return `${efficient.name} rende ${formatCurrency(efficient.revenuePerBarber)} por barbeiro — ${ratio}% a mais que ${worst.name} (${formatCurrency(worst.revenuePerBarber)}). Faturamento bruto engana: a loja com mais gente pode ser a menos eficiente.`;
    }
  }
  if (best) {
    return `${best.name} lidera o faturamento do mês com ${formatCurrency(best.monthRevenue)}. As unidades estão com eficiência parecida por barbeiro.`;
  }
  return null;
}

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Store; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-white mt-2">{value}</p>
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  );
}

function Metric({ label, value, icon: Icon, highlight, hint }: { label: string; value: string; icon?: typeof Users; highlight?: boolean; hint?: string }) {
  return (
    <div className={cn("rounded-xl px-2.5 py-2", highlight ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-zinc-800/50")}>
      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className={cn("text-sm font-bold mt-0.5", highlight ? "text-emerald-400" : "text-zinc-200")}>{value}</p>
      {hint && <p className="text-[9px] text-emerald-400/80">{hint}</p>}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md", className)}>{children}</span>;
}
