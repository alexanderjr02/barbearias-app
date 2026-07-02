"use client";

import { DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { formatCurrency, formatDate } from "@/lib/utils";

const transactions = [
  { id: "1", type: "INCOME", description: "Corte + Barba — Lucas Mendes", amount: 55, date: "2025-07-02", method: "PIX", category: "SERVICE" },
  { id: "2", type: "INCOME", description: "Corte Degradê — Pedro Alves", amount: 45, date: "2025-07-02", method: "Cartão", category: "SERVICE" },
  { id: "3", type: "EXPENSE", description: "Compra produtos (Kérastase)", amount: 320, date: "2025-07-01", method: "Boleto", category: "SUPPLIES" },
  { id: "4", type: "INCOME", description: "Barba — Marcos Lima", amount: 25, date: "2025-07-01", method: "Dinheiro", category: "SERVICE" },
  { id: "5", type: "EXPENSE", description: "Aluguel do espaço", amount: 2500, date: "2025-07-01", method: "Transferência", category: "RENT" },
  { id: "6", type: "INCOME", description: "Tratamento — Rafael Torres", amount: 45, date: "2025-06-30", method: "PIX", category: "SERVICE" },
  { id: "7", type: "INCOME", description: "Produto vendido — Pomada", amount: 35, date: "2025-06-30", method: "Dinheiro", category: "PRODUCT" },
  { id: "8", type: "EXPENSE", description: "Material de limpeza", amount: 85, date: "2025-06-29", method: "Dinheiro", category: "SUPPLIES" },
];

export default function FinancePage() {
  const income = transactions.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);
  const profit = income - expenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Financeiro</h1>
          <p className="text-zinc-500 text-sm mt-1">Julho 2025</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            Exportar relatório
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
            + Lançamento
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">+18%</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(income)}</p>
          <p className="text-sm text-zinc-500 mt-1">Receitas</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full">-5%</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(expenses)}</p>
          <p className="text-sm text-zinc-500 mt-1">Despesas</p>
        </div>
        <div className={`border rounded-xl p-5 ${profit >= 0 ? "bg-zinc-900 border-green-500/20" : "bg-zinc-900 border-red-500/20"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${profit >= 0 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
              <DollarSign className={`w-5 h-5 ${profit >= 0 ? "text-amber-400" : "text-red-400"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? "text-amber-400" : "text-red-400"}`}>{formatCurrency(profit)}</p>
          <p className="text-sm text-zinc-500 mt-1">Lucro Líquido</p>
        </div>
      </div>

      {/* Chart */}
      <RevenueChart />

      {/* Transactions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Últimas Transações</h3>
          <button className="text-sm text-amber-400 hover:underline">Ver todas →</button>
        </div>
        <div className="divide-y divide-zinc-800">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === "INCOME" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {t.type === "INCOME" ? (
                  <ArrowUpRight className="w-5 h-5 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{t.description}</p>
                <p className="text-xs text-zinc-500">
                  {formatDate(t.date)} · {t.method}
                </p>
              </div>
              <span className={`text-sm font-bold ${t.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
