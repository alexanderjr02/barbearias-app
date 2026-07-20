"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Check, Copy } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface StaffPayout {
  staffId: string;
  staffName: string;
  avatar: string | null;
  pixKey: string | null;
  pending: number;
  pendingCount: number;
  settled: number;
  directToBarber: number;
}

/**
 * Repasse de gorjetas.
 *
 * Gorjeta não é receita da barbearia — é dinheiro do barbeiro que passou pela
 * conta dela. Por isso fica fora do faturamento (contá-la inflaria lucro e
 * margem com dinheiro alheio) e aparece aqui como dívida a quitar.
 *
 * Quando o barbeiro tem PIX próprio o cliente paga direto e não há repasse:
 * esse valor aparece só como informação, nunca como pendência.
 */
export function TipPayoutsPanel() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["tip-payouts"],
    queryFn: () => apiGet<{ staff: StaffPayout[]; totalPending: number }>("/api/tips/payouts"),
  });

  const settle = useMutation({
    mutationFn: (staffId: string) => apiPost<{ settled: number; staffName: string }>("/api/tips/payouts", { staffId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tip-payouts"] });
      toast.success(`${res.settled} ${res.settled === 1 ? "gorjeta quitada" : "gorjetas quitadas"} com ${res.staffName}`);
    },
  });

  const staff = data?.staff ?? [];
  const totalPending = data?.totalPending ?? 0;
  const withPending = staff.filter((s) => s.pending > 0);

  // Sem gorjeta nenhuma registrada, o painel não tem o que dizer — some em vez
  // de ocupar espaço com uma caixa vazia.
  if (staff.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
            <HandCoins className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Gorjetas a repassar</h3>
            <p className="mt-0.5 text-xs text-zinc-600">
              Não entra no faturamento — é dinheiro do barbeiro que passou pela sua conta
            </p>
          </div>
        </div>
        {totalPending > 0 && (
          <div className="text-right">
            <p className="text-lg font-black tabular-nums text-violet-300">{formatCurrency(totalPending)}</p>
            <p className="text-[11px] text-zinc-600">a pagar</p>
          </div>
        )}
      </div>

      {withPending.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <Check className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300">Nada pendente</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Todas as gorjetas foram repassadas ou caíram direto na chave do barbeiro.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/70">
          {withPending.map((s) => (
            <div key={s.staffId} className="flex items-center gap-3.5 px-5 py-4">
              {s.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatar} alt={s.staffName} className="h-10 w-10 flex-shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xs font-black text-zinc-400">
                  {s.staffName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{s.staffName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-600">
                  <span>
                    {s.pendingCount} {s.pendingCount === 1 ? "gorjeta" : "gorjetas"}
                  </span>
                  {/* A chave aparece aqui porque é o que o dono precisa na hora
                      de mandar o PIX — sem ela ele teria que abrir a Equipe. */}
                  {s.pixKey ? (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(s.pixKey!);
                        toast.success("Chave PIX copiada");
                      }}
                      className="flex items-center gap-1 rounded bg-zinc-800/80 px-1.5 py-0.5 font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                      <Copy className="h-2.5 w-2.5" />
                      {s.pixKey}
                    </button>
                  ) : (
                    <span className="text-amber-500/80">sem chave PIX cadastrada</span>
                  )}
                </div>
              </div>

              <span className="flex-shrink-0 text-base font-black tabular-nums text-violet-300">
                {formatCurrency(s.pending)}
              </span>

              <button
                onClick={() => {
                  if (confirm(`Confirmar que você repassou ${formatCurrency(s.pending)} para ${s.staffName}?`)) {
                    settle.mutate(s.staffId);
                  }
                }}
                disabled={settle.isPending}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors",
                  "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 disabled:opacity-50"
                )}
              >
                <Check className="h-3.5 w-3.5" />
                Repassei
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quem recebe direto não é dívida, mas o dono ainda quer saber quanto
          o barbeiro está ganhando de gorjeta. */}
      {staff.some((s) => s.directToBarber > 0) && (
        <div className="border-t border-zinc-800/70 px-5 py-3">
          <p className="text-[11px] leading-relaxed text-zinc-600">
            {staff
              .filter((s) => s.directToBarber > 0)
              .map((s) => `${s.staffName} recebeu ${formatCurrency(s.directToBarber)} direto na chave dele`)
              .join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
