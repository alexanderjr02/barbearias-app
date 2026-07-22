"use client";

import { useQuery } from "@tanstack/react-query";
import { HeartPulse, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type Nivel = "ok" | "atencao" | "faltando";

interface Item {
  nome: string;
  nivel: Nivel;
  detalhe: string;
  acao?: string;
}

interface Saude {
  itens: Item[];
  resumo: { ok: number; atencao: number; faltando: number };
  geradoEm: string;
}

const ESTILO: Record<Nivel, { Icon: typeof CheckCircle2; cor: string; borda: string; rotulo: string }> = {
  ok: { Icon: CheckCircle2, cor: "text-emerald-400", borda: "border-zinc-800", rotulo: "Tudo certo" },
  atencao: { Icon: AlertTriangle, cor: "text-amber-400", borda: "border-amber-500/30", rotulo: "Atenção" },
  faltando: { Icon: XCircle, cor: "text-red-400", borda: "border-red-500/30", rotulo: "Faltando" },
};

// /admin/health — o que está de pé e o que está faltando configurar.
//
// Existe por um caso concreto: o e-mail ficou dias saindo pelo remetente de
// teste e ninguém soube, até alguém precisar de um link que não chegou.
export default function AdminHealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => apiGet<Saude>("/api/admin/health"),
    refetchOnMount: "always",
  });

  const ordem: Nivel[] = ["faltando", "atencao", "ok"];
  const itens = [...(data?.itens ?? [])].sort((a, b) => ordem.indexOf(a.nivel) - ordem.indexOf(b.nivel));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        icon={HeartPulse}
        title="Saúde do sistema"
        subtitle="O que está de pé e o que ainda falta configurar"
        accent="mono"
        action={
          <button onClick={() => refetch()} disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Atualizar
          </button>
        }
      />

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Resumo rotulo="Tudo certo" valor={data.resumo.ok} cor="text-emerald-400" />
          <Resumo rotulo="Atenção" valor={data.resumo.atencao} cor="text-amber-400" />
          <Resumo rotulo="Faltando" valor={data.resumo.faltando} cor="text-red-400" />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => {
            const { Icon, cor, borda } = ESTILO[item.nivel];
            return (
              <div key={item.nome} className={cn("rounded-2xl border bg-zinc-900/40 p-4", borda)}>
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cor)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{item.nome}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{item.detalhe}</p>
                    {item.acao && (
                      <p className="mt-2 inline-block rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
                        {item.acao}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Resumo({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-[11px] text-zinc-500">{rotulo}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", cor)}>{valor}</p>
    </div>
  );
}
