"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Scissors, FileText } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/apiClient";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface ApiTransaction {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string | null;
}

interface FinanceResponse {
  transactions: ApiTransaction[];
  summary: { income: number; expenses: number; profit: number; serviceRevenue: number; manualIncome: number };
}

const CATEGORY_PALETTE = ["#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#EF4444", "#06B6D4", "#F97316"];

export default function FinancePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ["finance-transactions"], queryFn: () => apiGet<FinanceResponse>("/api/finance/transactions") });

  const createTransaction = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/finance/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      setModalOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createTransaction.mutate({
      type: form.get("type"),
      category: form.get("category"),
      description: form.get("description"),
      amount: Number(form.get("amount")),
      date: form.get("date") || undefined,
      paymentMethod: form.get("paymentMethod") || undefined,
    });
  };

  const income = data?.summary.income ?? 0;
  const expenses = data?.summary.expenses ?? 0;
  const profit = data?.summary.profit ?? 0;
  const serviceRevenue = data?.summary.serviceRevenue ?? 0;
  const manualIncome = data?.summary.manualIncome ?? 0;
  const transactions = useMemo(() => data?.transactions ?? [], [data?.transactions]);
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, value], i) => ({ name, value, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <div className="space-y-6">
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo lançamento"
        onSubmit={handleSubmit}
        isPending={createTransaction.isPending}
        error={createTransaction.error?.message}
        submitLabel="Criar lançamento"
      >
        <div>
          <label className={labelCls}>Tipo</label>
          <select name="type" className={fieldCls} defaultValue="EXPENSE">
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <input name="category" required className={fieldCls} placeholder="Ex: Aluguel, Produtos, Marketing" />
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input name="description" required className={fieldCls} placeholder="Ex: Aluguel do espaço" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Valor (R$)</label>
            <input name="amount" type="number" min={0} step="0.01" required className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Data</label>
            <input name="date" type="date" className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Forma de pagamento</label>
          <input name="paymentMethod" className={fieldCls} placeholder="PIX, Cartão, Dinheiro..." />
        </div>
      </FormModal>

      <PageHeader
        icon={Wallet}
        title="Financeiro"
        subtitle="Receita de serviços concluídos + lançamentos manuais"
        action={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Lançamento
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(income)}</p>
          <p className="text-sm text-zinc-500 mt-1">Receitas</p>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Scissors className="w-3 h-3 text-zinc-600" /> {formatCurrency(serviceRevenue)} serviços</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-zinc-600" /> {formatCurrency(manualIncome)} manual</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(expenses)}</p>
          <p className="text-sm text-zinc-500 mt-1">Despesas</p>
          <p className="text-xs text-zinc-600 mt-3 pt-3 border-t border-zinc-800/80">
            {expensesByCategory.length > 0 ? `Maior categoria: ${expensesByCategory[0].name}` : "Nenhuma despesa lançada"}
          </p>
        </div>
        <div className={cn("border rounded-xl p-5", profit >= 0 ? "bg-amber-500/[0.04] border-amber-500/20" : "bg-red-500/5 border-red-500/20")}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", profit >= 0 ? "bg-amber-500/10" : "bg-red-500/10")}>
              <DollarSign className={cn("w-5 h-5", profit >= 0 ? "text-amber-400" : "text-red-400")} />
            </div>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", profit >= 0 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400")}>{margin}% margem</span>
          </div>
          <p className={cn("text-2xl font-black", profit >= 0 ? "text-amber-400" : "text-red-400")}>{formatCurrency(profit)}</p>
          <p className="text-sm text-zinc-500 mt-1">Lucro líquido</p>
        </div>
      </div>

      {/* Chart + category breakdown */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Despesas por categoria</h3>
          <p className="text-xs text-zinc-600 mb-4">De todos os lançamentos manuais</p>
          {expensesByCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ArrowDownRight className="w-6 h-6 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-600">Nenhuma despesa registrada ainda</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                    {expensesByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={((v: number) => formatCurrency(v)) as never} contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3 max-h-32 overflow-y-auto">
                {expensesByCategory.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-zinc-400 flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-zinc-300 font-medium">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white">Últimos Lançamentos Manuais</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {transactions.length === 0 && (
            <p className="text-sm text-zinc-500 px-6 py-8 text-center">Nenhum lançamento manual registrado ainda.</p>
          )}
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", t.type === "INCOME" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                {t.type === "INCOME" ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownRight className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{t.description}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 flex-shrink-0">{t.category}</span>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatDate(t.date)} {t.paymentMethod ? `· ${t.paymentMethod}` : ""}
                </p>
              </div>
              <span className={cn("text-sm font-bold flex-shrink-0", t.type === "INCOME" ? "text-emerald-400" : "text-red-400")}>
                {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
