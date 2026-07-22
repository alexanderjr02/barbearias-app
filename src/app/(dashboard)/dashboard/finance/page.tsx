"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, Scissors, FileText, Trash2, Loader2 } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FinancialCockpit } from "@/components/dashboard/FinancialCockpit";
import { DailyCashPanel } from "@/components/dashboard/DailyCashPanel";
import { RecurringExpensesPanel } from "@/components/dashboard/RecurringExpensesPanel";
import { TipPayoutsPanel } from "@/components/dashboard/TipPayoutsPanel";
import { DatePicker } from "@/components/ui/DatePicker";

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
  // Lançamento pendente de exclusão (abre o modal de confirmação).
  const [pendingDelete, setPendingDelete] = useState<ApiTransaction | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ["finance-transactions"], queryFn: () => apiGet<FinanceResponse>("/api/finance/transactions") });

  const createTransaction = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/finance/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      setModalOpen(false);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/finance/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      setPendingDelete(null);
      toast.success("Lançamento excluído");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não consegui excluir"),
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
      {/* Confirmação de exclusão de lançamento. */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setPendingDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Excluir lançamento?</p>
                <p className="mt-1 text-sm text-zinc-400">
                  &ldquo;{pendingDelete.description}&rdquo; ({pendingDelete.type === "INCOME" ? "+" : "−"}
                  {formatCurrency(pendingDelete.amount)}) será removido do financeiro. Isso não pode ser desfeito.
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleteTransaction.isPending}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteTransaction.mutate(pendingDelete.id)}
                disabled={deleteTransaction.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-60"
              >
                {deleteTransaction.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

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
            <DatePicker name="date" placeholder="Hoje" />
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
        subtitle="Serviços e mensalidades entram automático — você só lança o que sobra"
        action={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Lançamento
          </button>
        }
      />

      {/* Meta & Ponto de Equilíbrio ao vivo */}
      <FinancialCockpit />

      {/* Caixa do Dia + fechamento */}
      <DailyCashPanel />

      {/* Resultado.
          Três cards iguais tratavam receita, despesa e lucro como se pesassem
          o mesmo — mas lucro é a resposta e os outros dois são a conta que
          leva até ela. Aqui o lucro domina e a barra mostra, em uma olhada,
          quanto da receita sobrou. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-6",
            profit >= 0
              ? "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.09] via-amber-500/[0.02] to-transparent"
              : "border-red-500/25 bg-gradient-to-br from-red-500/[0.09] via-red-500/[0.02] to-transparent"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Lucro líquido</p>
              <p className={cn("mt-2 text-4xl font-black tracking-tight", profit >= 0 ? "text-white" : "text-red-400")}>
                {formatCurrency(profit)}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-bold",
                profit >= 0
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              )}
            >
              {margin}% de margem
            </span>
          </div>

          {/* Barra receita x despesa: proporção lida sem precisar comparar números */}
          <div className="mt-6">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${income > 0 ? Math.max(0, Math.min(100, (1 - expenses / income) * 100)) : 0}%` }}
              />
              <div className="flex-1 bg-gradient-to-r from-red-500/70 to-red-400/70" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Sobrou {formatCurrency(profit)}
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Saiu {formatCurrency(expenses)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            icon={ArrowUpRight}
            tone="emerald"
            label="Receitas"
            value={formatCurrency(income)}
            rows={[
              { icon: Scissors, label: "Serviços", value: formatCurrency(serviceRevenue) },
              { icon: FileText, label: "Manual", value: formatCurrency(manualIncome) },
            ]}
          />
          <MetricCard
            icon={ArrowDownRight}
            tone="red"
            label="Despesas"
            value={formatCurrency(expenses)}
            rows={
              expensesByCategory.length > 0
                ? expensesByCategory.slice(0, 2).map((c) => ({ label: c.name, value: formatCurrency(c.value), dot: c.color }))
                : [{ label: "Nada lançado ainda", value: "—" }]
            }
          />
        </div>
      </div>

      <TipPayoutsPanel />

      {/* Fixas — ficam acima do gráfico de propósito: é o que o gestor precisa
          cadastrar para o número lá em cima parar de mentir. */}
      <RecurringExpensesPanel />

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

      {/* Lançamentos */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-white">Lançamentos manuais</h3>
            <p className="mt-0.5 text-xs text-zinc-600">
              Serviços concluídos e mensalidades pagas entram sozinhos — aqui fica o resto
            </p>
          </div>
          {transactions.length > 0 && (
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400">
              {transactions.length}
            </span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60">
              <Wallet className="h-6 w-6 text-zinc-600" />
            </div>
            <p className="mt-4 text-sm font-semibold text-zinc-300">Nenhum lançamento manual</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-600">
              Aluguel, produtos, energia — o que não passa pelo agendamento entra aqui e o lucro acima passa a
              refletir a realidade.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-5 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Fazer o primeiro lançamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/70">
            {transactions.map((t) => (
              <div key={t.id} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
                <div
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                    t.type === "INCOME" ? "bg-emerald-500/10" : "bg-red-500/10"
                  )}
                >
                  {t.type === "INCOME" ? (
                    <ArrowUpRight className="h-4.5 w-4.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-4.5 w-4.5 text-red-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{t.description}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-600">
                    <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-medium text-zinc-400">{t.category}</span>
                    <span>{formatDate(t.date)}</span>
                    {t.paymentMethod && <span>· {t.paymentMethod}</span>}
                  </div>
                </div>
                <span
                  className={cn(
                    "flex-shrink-0 text-sm font-bold tabular-nums",
                    t.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {t.type === "INCOME" ? "+" : "−"}
                  {formatCurrency(t.amount)}
                </span>
                {/* Lixeira revelada no hover da linha — some quando não está
                    focado, para não poluir. */}
                <button
                  onClick={() => setPendingDelete(t)}
                  title="Excluir lançamento"
                  className="flex-shrink-0 rounded-lg p-1.5 text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Cartão de apoio: um número grande e até duas linhas que o explicam. */
function MetricCard({
  icon: Icon,
  tone,
  label,
  value,
  rows,
}: {
  icon: React.ElementType;
  tone: "emerald" | "red";
  label: string;
  value: string;
  rows: { icon?: React.ElementType; label: string; value: string; dot?: string }[];
}) {
  const tones = {
    emerald: { chip: "bg-emerald-500/10 text-emerald-400", border: "border-zinc-800" },
    red: { chip: "bg-red-500/10 text-red-400", border: "border-zinc-800" },
  }[tone];

  return (
    <div className={cn("flex flex-col rounded-2xl border bg-zinc-900/60 p-5", tones.border)}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tones.chip)}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3.5 text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
      <div className="mt-3.5 space-y-1.5 border-t border-zinc-800/80 pt-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            {r.dot ? (
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: r.dot }} />
            ) : r.icon ? (
              <r.icon className="h-3 w-3 flex-shrink-0 text-zinc-600" />
            ) : null}
            <span className="flex-1 truncate text-zinc-500">{r.label}</span>
            <span className="font-medium text-zinc-300 tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
