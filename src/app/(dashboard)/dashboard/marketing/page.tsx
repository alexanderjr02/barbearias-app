"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowRight } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RukzLetraR } from "@/components/brand/RukzLogo";

interface Opportunities {
  autopilotLevel: "off" | "suggest" | "auto";
  plan: string;
  automations: { confirm: boolean; birthday: boolean; winbackDays: number | null };
  freeSlotsWeek: number;
  churnedCount: number;
  recoveredThisMonth: number;
  actionsThisMonth: number;
  avgTicket: number;
  feed: { action: string; detail: string; createdAt: string }[];
  /** Leituras que exigem julgamento: escala, preço por barbeiro, horário morto. */
  gestao: { tipo: string; titulo: string; detalhe: string; valorMes: number }[];
  /** Quem passou do PRÓPRIO ritmo e ainda não virou sumido. */
  fugindo: { nome: string; ritmo: number; atraso: number; ticket: number }[];
  fugindoValor: number;
}

interface Vitrine {
  temPost: boolean;
  motivo?: string;
  porIA?: boolean;
  antes?: string | null;
  depois?: string | null;
  cliente?: string;
  servico?: string;
  nota?: number | null;
  legenda?: string;
}

const LEVELS = [
  { val: "off", label: "Pausado", status: "Em pausa. O Copiloto não dispara nada." },
  { val: "suggest", label: "Sugerir", status: "Achando oportunidades. Você aprova cada envio." },
  { val: "auto", label: "No automático", status: "No comando. Dispara as campanhas na hora certa e te conta depois." },
] as const;

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["marketing-opportunities"], queryFn: () => apiGet<Opportunities>("/api/marketing/opportunities") });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["marketing-opportunities"] });

  const setLevel = useMutation({
    mutationFn: (level: string) => apiPatch("/api/barbershop", { autopilotLevel: level }),
    onSuccess: refresh,
  });

  const fillWeek = useMutation({
    mutationFn: () => apiPost<{ ok: boolean; sent: number; message: string }>("/api/marketing/fill-week", {}),
    onSuccess: (res) => {
      refresh();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não consegui enviar"),
  });

  const { data: vitrine } = useQuery({ queryKey: ["vitrine"], queryFn: () => apiGet<Vitrine>("/api/marketing/vitrine") });

  const resgate = useMutation({
    mutationFn: () => apiPost<{ message: string }>("/api/copilot/action", { action: "rescue_early" }),
    onSuccess: (res) => {
      refresh();
      toast.success(res.message);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não consegui enviar"),
  });

  const winback = useMutation({
    mutationFn: () => apiPost<{ message: string }>("/api/copilot/action", { action: "winback_churned" }),
    onSuccess: (res) => {
      refresh();
      toast.success(res.message);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não consegui enviar"),
  });

  const level = data?.autopilotLevel ?? "suggest";
  const locked = data?.plan === "FREE";
  const ticket = data?.avgTicket ?? 0;
  const freeSlots = data?.freeSlotsWeek ?? 0;
  const churned = data?.churnedCount ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marketing"
        subtitle="O Copiloto acha onde tem dinheiro parado. Você aprova, ele traz o cliente."
      />

      {locked ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="font-semibold text-white">Copiloto de Marketing é do plano Pro</p>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-400">
            Ative o Pro para o Copiloto encontrar horário parado, trazer cliente sumido e encher sua semana sozinho.
          </p>
        </div>
      ) : (
        <>
          {/* Barra do Copiloto: identidade, status ao vivo e o interruptor-mestre
              de autonomia, tudo numa linha só. */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                  <RukzLetraR className="h-5 w-5 text-amber-400" />
                  {level !== "off" && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                      <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-zinc-900 bg-emerald-400" />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Copiloto de Marketing</p>
                  <p className="mt-0.5 max-w-md text-xs leading-relaxed text-zinc-500">{LEVELS.find((l) => l.val === level)?.status}</p>
                </div>
              </div>

              <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                {LEVELS.map(({ val, label }) => {
                  const on = level === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setLevel.mutate(val)}
                      disabled={setLevel.isPending}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                        on ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Oportunidades: o número primeiro, o dinheiro em jogo logo abaixo, e
              um único botão. Sem selo colorido na frente de cada linha, que era
              o que deixava a tela com cara de adesivo. */}
          <div>
            <p className="mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Onde tem dinheiro agora</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <OpportunityCard
                title="Encher a semana"
                value={freeSlots}
                unit={freeSlots === 1 ? "horário livre" : "horários livres"}
                money={ticket > 0 ? `Cada horário vale cerca de ${formatCurrency(ticket)}` : "Horário parado é dinheiro parado"}
                desc="Convida clientes ativos a preencher os próximos dias."
                actionLabel="Enviar convite"
                pending={fillWeek.isPending}
                disabled={isLoading || freeSlots === 0}
                onAction={() => fillWeek.mutate()}
                highlight={freeSlots > 0}
                auto={level === "auto"}
              />
              <OpportunityCard
                title="Indo embora agora"
                value={data?.fugindo.length ?? 0}
                unit={(data?.fugindo.length ?? 0) === 1 ? "cliente atrasado" : "clientes atrasados"}
                money={
                  (data?.fugindoValor ?? 0) > 0
                    ? `${formatCurrency(data?.fugindoValor ?? 0)} por rodada de corte`
                    : "Ninguém fora do próprio ritmo agora"
                }
                desc="Passaram do ritmo DELES, mas ainda não sumiram. Resgatar morno custa uma mensagem; frio custa desconto."
                actionLabel="Chamar antes de sumir"
                pending={resgate.isPending}
                disabled={isLoading || (data?.fugindo.length ?? 0) === 0}
                onAction={() => resgate.mutate()}
                highlight={(data?.fugindo.length ?? 0) > 0}
                auto={false}
              />
              <OpportunityCard
                title="Trazer os sumidos"
                value={churned}
                unit={churned === 1 ? "cliente sumido" : "clientes sumidos"}
                money={ticket > 0 && churned > 0 ? `Até ${formatCurrency(churned * ticket)} se voltarem` : "Um empurrãozinho traz parte deles de volta"}
                desc="Quem não aparece há um tempo recebe um lembrete pra remarcar."
                actionLabel="Chamar de volta"
                pending={winback.isPending}
                disabled={isLoading || churned === 0}
                onAction={() => winback.mutate()}
                highlight={false}
                auto={false}
              />
            </div>
            <p className="mt-2.5 px-0.5 text-[11px] leading-relaxed text-zinc-600">
              Aniversariantes do dia o Copiloto parabeniza sozinho no automático. Tudo só vai para quem deu consentimento (LGPD).
            </p>
          </div>

          {/* O que exige DECISÃO do dono, não disparo de mensagem. Relatório
              diz "segunda faturou R$ 400"; isto diz o que fazer a respeito. */}
          {data && data.gestao.length > 0 && (
            <div>
              <p className="mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Decisões que estão na mesa</p>
              <div className="space-y-3">
                {data.gestao.map((g) => (
                  <div key={g.tipo} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{g.titulo}</p>
                      <span className="shrink-0 text-sm font-black text-amber-400">
                        {formatCurrency(g.valorMes)}<span className="ml-1 text-[11px] font-medium text-zinc-500">por mês</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{g.detalhe}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 px-0.5 text-[11px] text-zinc-600">
                Contas feitas com os números da sua loja nas últimas 8 semanas. Nada aqui muda sozinho: a decisão é sua.
              </p>
            </div>
          )}

          {/* O post da semana. Postar é a tarefa que ninguém faz. */}
          {vitrine?.temPost && (
            <div>
              <p className="mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Post da semana, pronto</p>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
                <div className="flex flex-wrap gap-4">
                  <div className="flex gap-2">
                    {vitrine.antes && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vitrine.antes} alt="Antes" className="h-28 w-24 rounded-xl object-cover" />
                    )}
                    {vitrine.depois && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vitrine.depois} alt="Depois" className="h-28 w-24 rounded-xl object-cover" />
                    )}
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <p className="text-xs text-zinc-500">
                      {vitrine.servico} no {vitrine.cliente}
                      {vitrine.nota ? ` · ${vitrine.nota} de 5` : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-200">{vitrine.legenda}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(vitrine.legenda ?? "");
                        toast.success("Legenda copiada");
                      }}
                      className="mt-3 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-amber-500/40 hover:text-amber-400"
                    >
                      Copiar legenda
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-zinc-600">
                  Escolhido entre os atendimentos da semana com foto, nota do cliente primeiro. Só entra quem autorizou uso de imagem.
                </p>
              </div>
            </div>
          )}

          {/* A prova: o que a autonomia devolveu em dinheiro. */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Recuperado no mês" value={formatCurrency(data?.recoveredThisMonth ?? 0)} accent />
            <StatCard label="Ações do Copiloto" value={String(data?.actionsThisMonth ?? 0)} />
            <StatCard label="Ticket médio" value={formatCurrency(ticket)} />
          </div>

          <div>
            <p className="mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">O que o Copiloto fez</p>
            {data && data.feed.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                {data.feed.map((f, i) => (
                  <div key={i} className={cn("flex items-start gap-3 p-3.5", i > 0 && "border-t border-zinc-800")}>
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-zinc-200">{f.detail}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{formatDate(f.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <RukzLetraR className="mx-auto h-6 w-6 text-zinc-700" />
                <p className="mt-3 text-sm font-medium text-zinc-300">Ainda sem campanhas</p>
                <p className="mt-1 text-xs text-zinc-500">Quando o Copiloto disparar uma campanha, ela aparece aqui com o resultado.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OpportunityCard({
  title,
  value,
  unit,
  money,
  desc,
  actionLabel,
  pending,
  disabled,
  onAction,
  highlight,
  auto,
}: {
  title: string;
  value: number;
  unit: string;
  money: string;
  desc: string;
  actionLabel: string;
  pending: boolean;
  disabled: boolean;
  onAction: () => void;
  highlight: boolean;
  auto: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-zinc-900 p-4 sm:p-5",
        highlight ? "border-amber-500/30" : "border-zinc-800",
      )}
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        {auto && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">no automático</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-black tabular-nums tracking-tight text-white">{value}</span>
        <span className="text-sm text-zinc-400">{unit}</span>
      </div>
      <p className="mt-1 text-xs font-medium text-amber-400/90">{money}</p>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
      <button
        onClick={onAction}
        disabled={pending || disabled}
        className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {actionLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 sm:p-4">
      <p className="text-[11px] font-medium leading-tight text-zinc-500">{label}</p>
      <p className={cn("mt-1.5 text-lg font-bold tabular-nums sm:text-xl", accent ? "text-amber-400" : "text-white")}>{value}</p>
    </div>
  );
}
