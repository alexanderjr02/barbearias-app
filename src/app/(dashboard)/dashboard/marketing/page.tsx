"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, CalendarClock, UserX, Sparkles, Activity, Loader2, Lock, ArrowRight, Gift } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/PageHeader";

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
}

const LEVELS = [
  { val: "off", label: "Pausado", status: "Em pausa — o Copiloto não dispara nada." },
  { val: "suggest", label: "Sugerir", status: "Achando oportunidades — você aprova cada envio." },
  { val: "auto", label: "No automático", status: "No comando — dispara as campanhas na hora certa e te conta depois." },
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
        icon={Megaphone}
        title="Marketing"
        subtitle="O Copiloto acha onde tem dinheiro parado — você aprova, ele traz o cliente."
      />

      {locked ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Copiloto de Marketing é do plano Pro</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">Ative o Pro para o Copiloto encontrar horário parado, trazer cliente sumido e encher sua semana sozinho.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Barra do Copiloto — identidade + status ao vivo + controle de autonomia. */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <Sparkles className="h-5 w-5 text-amber-400" />
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

              {/* Controle segmentado — o interruptor-mestre. */}
              <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
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

          {/* Oportunidades — linhas de insight com o dinheiro em jogo e um toque pra agir. */}
          <div>
            <p className="mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Onde tem dinheiro agora</p>
            <div className="space-y-3">
              <OpportunityRow
                Icon={CalendarClock}
                title="Encher a semana"
                value={freeSlots}
                unit={freeSlots === 1 ? "horário livre" : "horários livres"}
                money={ticket > 0 ? `Cada horário vale ~${formatCurrency(ticket)}` : "Horário parado é dinheiro parado"}
                desc="Convida clientes ativos a preencher os próximos dias."
                actionLabel="Enviar convite"
                pending={fillWeek.isPending}
                disabled={isLoading || freeSlots === 0}
                onAction={() => fillWeek.mutate()}
                highlight={freeSlots > 0}
                auto={level === "auto"}
              />
              <OpportunityRow
                Icon={UserX}
                title="Trazer os sumidos"
                value={churned}
                unit={churned === 1 ? "cliente sumido" : "clientes sumidos"}
                money={ticket > 0 && churned > 0 ? `Até ~${formatCurrency(churned * ticket)} se voltarem` : "Um empurrãozinho traz parte deles de volta"}
                desc="Quem não aparece há um tempo recebe um lembrete pra remarcar."
                actionLabel="Chamar de volta"
                pending={winback.isPending}
                disabled={isLoading || churned === 0}
                onAction={() => winback.mutate()}
                highlight={false}
                auto={false}
              />
            </div>
            <div className="mt-2.5 flex items-center gap-2 px-0.5 text-[11px] text-zinc-600">
              <Gift className="h-3.5 w-3.5 shrink-0" />
              <span>Aniversariantes do dia o Copiloto parabeniza sozinho no automático. Tudo só vai para quem deu consentimento (LGPD).</span>
            </div>
          </div>

          {/* Faixa de resultado — a prova, sem gradiente. */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Recuperado no mês" value={formatCurrency(data?.recoveredThisMonth ?? 0)} accent />
            <StatCard label="Ações do Copiloto" value={String(data?.actionsThisMonth ?? 0)} />
            <StatCard label="Ticket médio" value={ticket > 0 ? formatCurrency(ticket) : "—"} />
          </div>

          {/* Linha do tempo do Copiloto. */}
          <div>
            <p className="mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">O que o Copiloto fez</p>
            {data && data.feed.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
                {data.feed.map((f, i) => (
                  <div key={i} className={cn("flex items-start gap-3 p-3.5", i > 0 && "border-t border-zinc-800/70")}>
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Activity className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-zinc-200">{f.detail}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{formatDate(f.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/60">
                  <Sparkles className="h-5 w-5 text-zinc-500" />
                </div>
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

function OpportunityRow({
  Icon,
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
  Icon: typeof CalendarClock;
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
        "rounded-2xl border bg-zinc-900/40 p-4 sm:p-5",
        highlight ? "border-amber-500/30" : "border-zinc-800",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <Icon className="h-5 w-5 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            {auto && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">no automático</span>}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{value}</span>
            <span className="text-sm text-zinc-400">{unit}</span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-amber-400/90">{money}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{desc}</p>
        </div>
      </div>
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5 sm:p-4">
      <p className="text-[11px] font-medium leading-tight text-zinc-500">{label}</p>
      <p className={cn("mt-1.5 text-lg font-bold tabular-nums sm:text-xl", accent ? "text-amber-400" : "text-white")}>{value}</p>
    </div>
  );
}
