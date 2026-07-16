"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Target, TrendingUp, Flag, Sparkles, Pencil, Trophy, Flame } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { formatCurrency, cn } from "@/lib/utils";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";

interface Overview {
  goal: number | null;
  monthLabel: string;
  daysInMonth: number;
  dayOfMonth: number;
  monthExpenses: number;
  monthRevenue: number;
  dailyRevenue: number[];
}

export function FinancialCockpit() {
  const queryClient = useQueryClient();
  const [goalModal, setGoalModal] = useState(false);

  const { data } = useQuery({ queryKey: ["finance-overview"], queryFn: () => apiGet<Overview>("/api/finance/overview") });

  const saveGoal = useMutation({
    mutationFn: (goal: number | null) => apiPatch("/api/finance/overview", { goal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      setGoalModal(false);
    },
  });

  const d = data;
  const derived = useMemo(() => {
    if (!d) return null;
    const { goal, monthExpenses, monthRevenue, dailyRevenue, daysInMonth, dayOfMonth } = d;

    // Cumulative revenue through today.
    const cumulative: { day: number; value: number }[] = [];
    let running = 0;
    for (let i = 0; i < Math.max(dayOfMonth, 1); i++) {
      running += dailyRevenue[i] ?? 0;
      cumulative.push({ day: i + 1, value: running });
    }

    const pace = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
    const projection = pace * daysInMonth;

    // Break-even = the day cumulative revenue first covers this month's expenses.
    let breakEvenDay: number | null = null;
    for (const p of cumulative) {
      if (p.value >= monthExpenses && monthExpenses > 0) {
        breakEvenDay = p.day;
        break;
      }
    }
    const covered = breakEvenDay !== null || (monthExpenses === 0 && monthRevenue > 0);
    // If not covered yet, project when it will be.
    let projectedBreakEvenDay: number | null = null;
    if (!covered && monthExpenses > 0 && pace > 0) {
      projectedBreakEvenDay = Math.ceil(monthExpenses / pace);
    }

    const profit = monthRevenue - monthExpenses;
    const goalPct = goal && goal > 0 ? (monthRevenue / goal) * 100 : 0;
    const projectionPct = goal && goal > 0 ? (projection / goal) * 100 : 0;
    const breakEvenPct = goal && goal > 0 ? Math.min((monthExpenses / goal) * 100, 100) : 0;

    return {
      goal,
      monthExpenses,
      monthRevenue,
      cumulative,
      pace,
      projection,
      breakEvenDay,
      covered,
      projectedBreakEvenDay,
      profit,
      goalPct,
      projectionPct,
      breakEvenPct,
      daysInMonth,
      dayOfMonth,
    };
  }, [d]);

  if (!d || !derived) {
    return <div className="h-64 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />;
  }

  const monthName = d.monthLabel.split(" de ")[0] ?? d.monthLabel;
  const fillPct = Math.min(derived.goalPct, 100);
  const overGoal = derived.goalPct >= 100;

  // No goal yet → invite the owner to set one.
  if (!derived.goal) {
    return (
      <>
        <GoalModal open={goalModal} onClose={() => setGoalModal(false)} onSave={(g) => saveGoal.mutate(g)} pending={saveGoal.isPending} suggested={Math.round(derived.projection || derived.monthRevenue || 5000)} />
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent p-6 sm:p-8">
          <div className="absolute -top-10 -right-10 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Defina sua meta de {monthName}</h3>
                <p className="text-sm text-zinc-400 mt-1 max-w-md">
                  Com uma meta, você acompanha ao vivo o quanto falta, quando cobre seus custos e a projeção de fechamento do mês.
                </p>
              </div>
            </div>
            <button
              onClick={() => setGoalModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all whitespace-nowrap"
            >
              <Target className="w-4 h-4" /> Definir meta
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GoalModal open={goalModal} onClose={() => setGoalModal(false)} onSave={(g) => saveGoal.mutate(g)} pending={saveGoal.isPending} current={derived.goal} suggested={Math.round(derived.projection)} />

      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight capitalize">Meta de {monthName}</h3>
              <p className="text-xs text-zinc-500">Dia {derived.dayOfMonth} de {derived.daysInMonth} · atualiza sozinho</p>
            </div>
          </div>
          <button
            onClick={() => setGoalModal(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        </div>

        {/* THERMOMETER — meta + ponto de equilíbrio numa só imagem */}
        <div className="relative mb-2">
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-white">{formatCurrency(derived.monthRevenue)}</span>
              <span className="text-sm text-zinc-500 ml-2">de {formatCurrency(derived.goal)}</span>
            </div>
            <span className={cn("text-sm font-black", overGoal ? "text-emerald-400" : "text-amber-400")}>
              {Math.round(derived.goalPct)}%
            </span>
          </div>

          {/* Track */}
          <div className="relative h-5 rounded-full bg-zinc-800 overflow-visible">
            {/* Fill */}
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-700",
                overGoal ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-amber-500 to-yellow-400"
              )}
              style={{ width: `${Math.max(fillPct, 2)}%` }}
            />
            {/* Break-even marker */}
            {derived.breakEvenPct > 0 && derived.breakEvenPct < 100 && (
              <div className="absolute inset-y-0 z-10 flex flex-col items-center" style={{ left: `${derived.breakEvenPct}%` }}>
                <div className={cn("w-0.5 h-5 -translate-x-1/2", derived.covered ? "bg-emerald-300" : "bg-white/70")} />
              </div>
            )}
          </div>

          {/* Legend under the bar */}
          <div className="relative h-5 mt-1 text-[10px]">
            {derived.breakEvenPct > 0 && derived.breakEvenPct < 100 && (
              <span
                className="absolute -translate-x-1/2 text-zinc-500 whitespace-nowrap flex items-center gap-1"
                style={{ left: `${Math.min(Math.max(derived.breakEvenPct, 12), 88)}%` }}
              >
                <Flame className="w-3 h-3 text-orange-400" /> equilíbrio
              </span>
            )}
            <span className="absolute right-0 text-zinc-500 flex items-center gap-1">
              <Flag className="w-3 h-3 text-amber-400" /> meta
            </span>
          </div>
        </div>

        {/* Three insight tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          {/* Projeção */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Projeção de fechamento
            </div>
            <p className="text-xl font-black text-white">{formatCurrency(derived.projection)}</p>
            <p className={cn("text-xs mt-1 font-medium", derived.projectionPct >= 100 ? "text-emerald-400" : "text-zinc-500")}>
              {derived.projectionPct >= 100
                ? `no ritmo atual, bate a meta 🎯`
                : `${Math.round(derived.projectionPct)}% da meta no ritmo atual`}
            </p>
          </div>

          {/* Dia da virada / ponto de equilíbrio */}
          <div className={cn("rounded-xl border p-4", derived.covered ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/70 border-zinc-800")}>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Ponto de equilíbrio
            </div>
            {derived.monthExpenses === 0 ? (
              <>
                <p className="text-xl font-black text-white">—</p>
                <p className="text-xs text-zinc-500 mt-1">Lance suas despesas do mês</p>
              </>
            ) : derived.covered ? (
              <>
                <p className="text-xl font-black text-emerald-400">Custos cobertos ✓</p>
                <p className="text-xs text-emerald-400/80 mt-1">
                  {derived.breakEvenDay ? `virada no dia ${derived.breakEvenDay} — daí em diante é lucro` : "tudo o que entrar é lucro"}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-black text-white">Faltam {formatCurrency(Math.max(derived.monthExpenses - derived.monthRevenue, 0))}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {derived.projectedBreakEvenDay && derived.projectedBreakEvenDay <= derived.daysInMonth
                    ? `previsto virar por volta do dia ${derived.projectedBreakEvenDay}`
                    : "para cobrir os custos do mês"}
                </p>
              </>
            )}
          </div>

          {/* Lucro do mês */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
              {derived.profit >= 0 ? <Trophy className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-red-400" />}
              Lucro do mês (até agora)
            </div>
            <p className={cn("text-xl font-black", derived.profit >= 0 ? "text-amber-400" : "text-red-400")}>
              {formatCurrency(derived.profit)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">receita − despesas do mês</p>
          </div>
        </div>

        {/* Cumulative area chart with break-even + goal reference lines */}
        <div className="mt-5 pt-5 border-t border-zinc-800/70">
          <div className="flex items-center gap-4 mb-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 rounded" /> Receita acumulada</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 rounded" style={{ borderTop: "1px dashed" }} /> Ponto de equilíbrio</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 rounded" /> Meta</span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={derived.cumulative} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="cockpitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
              <Tooltip
                formatter={((v: number) => [formatCurrency(v), "Acumulado"]) as never}
                labelFormatter={((l: number) => `Dia ${l}`) as never}
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
              />
              {derived.monthExpenses > 0 && (
                <ReferenceLine y={derived.monthExpenses} stroke="#fb923c" strokeDasharray="4 4" strokeWidth={1.5} />
              )}
              {derived.goal && <ReferenceLine y={derived.goal} stroke="#34d399" strokeDasharray="2 2" strokeWidth={1.5} />}
              <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} fill="url(#cockpitFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function GoalModal({
  open,
  onClose,
  onSave,
  pending,
  current,
  suggested,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (goal: number | null) => void;
  pending: boolean;
  current?: number;
  suggested: number;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number(new FormData(e.currentTarget).get("goal"));
    onSave(Number.isFinite(value) && value > 0 ? value : null);
  };

  return (
    <FormModal open={open} onClose={onClose} title="Meta de faturamento do mês" onSubmit={handleSubmit} isPending={pending} submitLabel="Salvar meta">
      <p className="text-xs text-zinc-500">
        Quanto você quer faturar este mês? Usamos isso pra mostrar o quanto falta, quando cobre os custos e a projeção de fechamento.
      </p>
      <div>
        <label className={labelCls}>Meta (R$)</label>
        <input
          name="goal"
          type="number"
          min={0}
          step="100"
          required
          autoFocus
          defaultValue={current ?? ""}
          placeholder={suggested ? `Ex: ${suggested}` : "Ex: 30000"}
          className={fieldCls}
        />
      </div>
    </FormModal>
  );
}
