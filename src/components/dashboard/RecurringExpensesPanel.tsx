"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Repeat, Plus, Trash2, CalendarClock } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";

interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  dayOfMonth: number;
  isActive: boolean;
}

/**
 * Despesas fixas do mês.
 *
 * Cadastrar aqui é o que tira o gestor da redigitação: uma vez por conta, e o
 * lançamento nasce sozinho todo mês no dia certo. É também o que faz o "Lucro
 * líquido" da tela acima parar de mentir para cima — sem as fixas, ele conta
 * a receita inteira e quase nenhuma despesa.
 */
export function RecurringExpensesPanel() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["finance-recurring"],
    queryFn: () => apiGet<{ items: RecurringExpense[]; monthlyTotal: number }>("/api/finance/recurring"),
  });

  const items = data?.items ?? [];
  const monthlyTotal = data?.monthlyTotal ?? 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["finance-recurring"] });
    // O financeiro muda junto: criar uma fixa já vencida gera o lançamento na
    // hora, e a tela de cima precisa refletir isso.
    queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
  };

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost("/api/finance/recurring", payload),
    onSuccess: () => {
      refresh();
      setModalOpen(false);
      toast.success("Despesa fixa cadastrada");
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPatch("/api/finance/recurring", { id, isActive }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/finance/recurring?id=${id}`),
    onSuccess: () => {
      refresh();
      toast.success("Despesa fixa removida");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    create.mutate({
      description: form.get("description"),
      category: form.get("category") || "Fixas",
      amount: Number(form.get("amount")),
      dayOfMonth: Number(form.get("dayOfMonth")),
    });
  };

  return (
    <>
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova despesa fixa"
        onSubmit={handleSubmit}
        isPending={create.isPending}
        error={create.error?.message}
        submitLabel="Cadastrar"
      >
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3.5 py-3 text-xs leading-relaxed text-zinc-500">
          Cadastre uma vez e o lançamento passa a nascer sozinho todo mês, no dia do vencimento.
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input name="description" required className={fieldCls} placeholder="Ex: Aluguel da loja" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Valor (R$)</label>
            <input name="amount" type="number" min={0.01} step="0.01" required className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Vence no dia</label>
            <input name="dayOfMonth" type="number" min={1} max={28} defaultValue={5} required className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <input name="category" className={fieldCls} placeholder="Fixas" defaultValue="Fixas" />
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-600">
          O dia vai até 28 porque 29, 30 e 31 não existem em todo mês — uma conta marcada para o dia 31 sumiria
          em fevereiro.
        </p>
      </FormModal>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <Repeat className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Despesas fixas</h3>
              <p className="mt-0.5 text-xs text-zinc-600">
                {items.filter((i) => i.isActive).length > 0
                  ? `${formatCurrency(monthlyTotal)} por mês, lançados sozinhos`
                  : "Lançadas sozinhas todo mês"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/60">
              <CalendarClock className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="mt-3.5 text-sm font-semibold text-zinc-300">Nenhuma despesa fixa</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-600">
              Aluguel, energia, internet, contador. Enquanto elas não estiverem aqui, o lucro acima está maior do
              que a realidade.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/70">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn("group flex items-center gap-3.5 px-5 py-3.5 transition-colors", !item.isActive && "opacity-45")}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800/70 text-xs font-black text-zinc-400">
                  {item.dayOfMonth}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.description}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {item.category} · todo dia {item.dayOfMonth}
                  </p>
                </div>
                <span className="flex-shrink-0 text-sm font-bold tabular-nums text-red-400">
                  {formatCurrency(item.amount)}
                </span>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {/* Pausar em vez de apagar: conta suspensa por uns meses é
                      comum, e apagar perderia o cadastro inteiro. */}
                  <button
                    onClick={() => toggle.mutate({ id: item.id, isActive: !item.isActive })}
                    title={item.isActive ? "Pausar" : "Reativar"}
                    className={cn(
                      "relative h-5 w-9 flex-shrink-0 rounded-full transition-colors",
                      item.isActive ? "bg-blue-500" : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                        item.isActive ? "translate-x-[18px]" : "translate-x-0.5"
                      )}
                    />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover "${item.description}"? Os lançamentos já feitos continuam no histórico.`)) {
                        remove.mutate(item.id);
                      }
                    }}
                    title="Remover"
                    className="rounded-lg p-1.5 text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
