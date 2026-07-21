"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, CalendarClock, UserX, Sparkles, TrendingUp, Activity, Loader2, Eye, Lightbulb, Zap, Lock } from "lucide-react";
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
  feed: { action: string; detail: string; createdAt: string }[];
}

const LEVELS = [
  { val: "off", label: "Desligado", Icon: Eye, blurb: "O Copiloto observa, mas não dispara nenhuma campanha." },
  { val: "suggest", label: "Sugerir", Icon: Lightbulb, blurb: "Ele acha as oportunidades e mostra aqui. Nada sai sem o seu toque." },
  { val: "auto", label: "Agir sozinho", Icon: Zap, blurb: "Ele dispara as campanhas na hora certa, sozinho — e te conta o que fez." },
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Marketing"
        subtitle="O Copiloto acha as campanhas certas — você aprova, ele dispara."
      />

      {locked ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-amber-400" />
            <div>
              <p className="font-semibold text-white">Copiloto de Marketing é do plano Pro</p>
              <p className="mt-1 text-sm text-zinc-300">Ative o plano para o Copiloto encontrar oportunidades e trazer clientes de volta sozinho.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Nível de autonomia — o interruptor-mestre do marketing automático. */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-semibold text-white">Quanto o Copiloto age no marketing</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {LEVELS.map(({ val, label, Icon }) => {
                const on = level === val;
                return (
                  <button
                    key={val}
                    onClick={() => setLevel.mutate(val)}
                    disabled={setLevel.isPending}
                    className={cn(
                      "rounded-xl border p-3 text-center transition-colors",
                      on ? "border-amber-500/60 bg-amber-500/10" : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <Icon className={cn("mx-auto h-5 w-5", on ? "text-amber-400" : "text-zinc-500")} />
                    <p className={cn("mt-1.5 text-xs font-bold", on ? "text-amber-400" : "text-white")}>{label}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">{LEVELS.find((l) => l.val === level)?.blurb}</p>
          </div>

          {/* Oportunidades — cada card com o número REAL e um toque para disparar. */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Oportunidades agora</p>
            <div className="grid gap-4 md:grid-cols-2">
              <OpportunityCard
                Icon={CalendarClock}
                title="Encher a semana"
                highlight={`${data?.freeSlotsWeek ?? 0} horários vagos`}
                desc="Transforme horário parado em agendamento: convida clientes ativos (que aceitaram receber) a preencher os próximos dias."
                actionLabel="Enviar convite"
                pending={fillWeek.isPending}
                disabled={isLoading || (data?.freeSlotsWeek ?? 0) === 0}
                onAction={() => fillWeek.mutate()}
                note={level === "auto" ? "O Copiloto já dispara isto sozinho — você também pode agora." : undefined}
              />
              <OpportunityCard
                Icon={UserX}
                title="Trazer os sumidos"
                highlight={`${data?.churnedCount ?? 0} clientes sumidos`}
                desc="Clientes que não aparecem há um tempo. Um empurrãozinho traz parte deles de volta — só quem aceitou receber."
                actionLabel="Chamar de volta"
                pending={winback.isPending}
                disabled={isLoading || (data?.churnedCount ?? 0) === 0}
                onAction={() => winback.mutate()}
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">
              Aniversariantes do dia o Copiloto cuida sozinho no automático. Tudo só vai para quem deu consentimento (LGPD).
            </p>
          </div>

          {/* Resultado real. */}
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-900/30 p-5">
            <div className="flex items-center gap-2 text-zinc-400">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <p className="text-xs font-medium">Receita recuperada este mês pelo Copiloto</p>
            </div>
            <p className="mt-2 text-3xl font-black text-white">{formatCurrency(data?.recoveredThisMonth ?? 0)}</p>
            <p className="mt-1 text-xs text-zinc-500">{data?.actionsThisMonth ?? 0} ações executadas</p>
          </div>

          {/* O que o Copiloto fez. */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">O que o Copiloto fez</p>
            {data && data.feed.length > 0 ? (
              <div className="space-y-2">
                {data.feed.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                      <Activity className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-300">{f.detail}</p>
                      <p className="text-[10px] text-zinc-600">{formatDate(f.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-6 text-center">
                <Activity className="mx-auto h-6 w-6 text-zinc-600" />
                <p className="mt-2 text-sm text-zinc-400">Ainda sem campanhas</p>
                <p className="mt-0.5 text-xs text-zinc-600">Quando o Copiloto disparar uma campanha, aparece aqui com o resultado.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OpportunityCard({
  Icon,
  title,
  highlight,
  desc,
  actionLabel,
  pending,
  disabled,
  onAction,
  note,
}: {
  Icon: typeof CalendarClock;
  title: string;
  highlight: string;
  desc: string;
  actionLabel: string;
  pending: boolean;
  disabled: boolean;
  onAction: () => void;
  note?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <Icon className="h-5 w-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-lg font-black text-amber-400">{highlight}</p>
        </div>
      </div>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-400">{desc}</p>
      {note && <p className="mt-2 text-[11px] text-zinc-500">{note}</p>}
      <button
        onClick={onAction}
        disabled={pending || disabled}
        className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {actionLabel}
      </button>
    </div>
  );
}
