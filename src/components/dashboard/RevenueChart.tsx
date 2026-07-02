"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

const weekData = [
  { name: "Seg", receita: 420, despesas: 120 },
  { name: "Ter", receita: 580, despesas: 140 },
  { name: "Qua", receita: 390, despesas: 100 },
  { name: "Qui", receita: 720, despesas: 160 },
  { name: "Sex", receita: 950, despesas: 200 },
  { name: "Sáb", receita: 1200, despesas: 180 },
  { name: "Dom", receita: 380, despesas: 80 },
];

const monthData = [
  { name: "Jan", receita: 18500, despesas: 6200 },
  { name: "Fev", receita: 21000, despesas: 6800 },
  { name: "Mar", receita: 19800, despesas: 7100 },
  { name: "Abr", receita: 24500, despesas: 7300 },
  { name: "Mai", receita: 22100, despesas: 6900 },
  { name: "Jun", receita: 26800, despesas: 7500 },
  { name: "Jul", receita: 28500, despesas: 7800 },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700/80 rounded-xl p-3 shadow-2xl shadow-black/50">
        <p className="text-zinc-400 text-xs font-medium mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-zinc-400 capitalize text-xs">{entry.name}:</span>
            <span className="text-white font-semibold text-xs">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function RevenueChart() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const data = period === "week" ? weekData : monthData;
  const totalReceita = data.reduce((a, d) => a + d.receita, 0);
  const totalDespesas = data.reduce((a, d) => a + d.despesas, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Visão Financeira</h3>
          <p className="text-xs text-zinc-600 mt-0.5">Receita vs Despesas</p>
        </div>
        <div className="flex items-center bg-zinc-800/80 rounded-lg p-0.5">
          {(["week", "month"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p ? "bg-zinc-700 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>
              {p === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
          <p className="text-xs text-zinc-500 mb-1">Receita total</p>
          <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalReceita)}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
          <p className="text-xs text-zinc-500 mb-1">Despesas</p>
          <p className="text-sm font-bold text-red-400">{formatCurrency(totalDespesas)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
          <Area type="monotone" dataKey="receita" stroke="#F59E0B" strokeWidth={2}
            fill="url(#gradReceita)" dot={false} activeDot={{ r: 4, fill: "#F59E0B" }} />
          <Area type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={1.5}
            fill="url(#gradDespesas)" dot={false} activeDot={{ r: 3, fill: "#EF4444" }} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-5 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <div className="w-3 h-0.5 bg-amber-400 rounded-full" /> Receita
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <div className="w-3 h-0.5 bg-red-400 rounded-full" /> Despesas
        </div>
      </div>
    </div>
  );
}
