"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Stamp, Users2, Star, Check, Loader2, Sparkles, Scissors, Crown, ChevronRight, Copy } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { cn, formatDateTime } from "@/lib/utils";

interface Config {
  loyaltyEnabled: boolean;
  pointsPerReal: number;
  silverThreshold: number;
  goldThreshold: number;
  silverDiscount: number;
  goldDiscount: number;
  stampEnabled: boolean;
  stampGoal: number;
  stampRewardLabel: string;
  referralEnabled: boolean;
  referralReferrerReward: string;
  referralFriendReward: string;
}
interface Reward {
  id: string;
  label: string;
  source: string;
  createdAt: string;
  clientName: string;
  clientPhone: string;
}

const SOURCE_LABEL: Record<string, string> = {
  STAMP_CARD: "Cartela completa",
  REFERRAL_REFERRER: "Indicou um amigo",
  REFERRAL_FRIEND: "Veio por indicação",
};

export default function LoyaltyPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"programa" | "premios">("programa");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  // Quantos selos mostrar na prévia. É só encenação visual, mas deixa o gestor
  // ver a cartela meio cheia em vez de sempre vazia — que é como ela passa a
  // maior parte da vida do cliente.
  const [previewStamps, setPreviewStamps] = useState(3);

  const { data } = useQuery({ queryKey: ["loyalty-config"], queryFn: () => apiGet<Config>("/api/loyalty/config") });
  const { data: rewardsData } = useQuery({
    queryKey: ["loyalty-rewards"],
    queryFn: () => apiGet<{ rewards: Reward[] }>("/api/loyalty/rewards"),
    refetchInterval: 30_000,
  });

  useEffect(() => { if (data && !cfg) setCfg(data); }, [data, cfg]);

  const rewards = rewardsData?.rewards ?? [];

  const save = async (patch: Partial<Config>) => {
    if (!cfg) return;
    const next = { ...cfg, ...patch };
    setCfg(next);
    setSaving(true);
    try {
      const saved = await apiPatch<Config>("/api/loyalty/config", patch);
      setCfg(saved);
      queryClient.invalidateQueries({ queryKey: ["loyalty-config"] });
    } catch (e) {
      setCfg(cfg); // desfaz o otimismo se o servidor recusou
      toast.error(e instanceof Error ? e.message : "Não consegui salvar");
    } finally {
      setSaving(false);
    }
  };

  const redeem = async (r: Reward) => {
    try {
      await apiPost("/api/loyalty/rewards", { rewardId: r.id });
      toast.success(`"${r.label}" entregue a ${r.clientName}`);
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
    } catch {
      toast.error("Não consegui dar baixa");
    }
  };

  if (!cfg) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Gift} title="Fidelidade" subtitle="Carregando o programa da sua barbearia…" accent="amber" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 animate-pulse" />)}
          </div>
          <div className="hidden xl:block h-[640px] rounded-[2.5rem] bg-zinc-900/60 border border-zinc-800/60 animate-pulse" />
        </div>
      </div>
    );
  }

  const activeCount = [cfg.stampEnabled, cfg.referralEnabled, cfg.loyaltyEnabled].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Gift}
        title="Fidelidade"
        subtitle="Desenhe o programa da sua barbearia — e veja na hora o que o cliente vê"
        accent="amber"
      />

      {/* Barra de status: o que está no ar agora, em números reais. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Sparkles}
          value={`${activeCount} de 3`}
          label="mecanismos ativos"
          tone={activeCount === 0 ? "off" : "amber"}
        />
        <StatCard
          icon={Gift}
          value={String(rewards.length)}
          label={rewards.length === 1 ? "prêmio esperando entrega" : "prêmios esperando entrega"}
          tone={rewards.length > 0 ? "emerald" : "off"}
          onClick={rewards.length > 0 ? () => setTab("premios") : undefined}
        />
        <StatCard
          icon={Stamp}
          value={cfg.stampEnabled ? `${cfg.stampGoal} cortes` : "—"}
          label={cfg.stampEnabled ? "para ganhar o prêmio" : "cartela desligada"}
          tone={cfg.stampEnabled ? "amber" : "off"}
        />
      </div>

      <SegmentedTabs
        tab={tab}
        onChange={setTab}
        pendingCount={rewards.length}
      />

      {tab === "programa" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
          {/* ---------------- Controles ---------------- */}
          <div className="space-y-4">
            <Section
              icon={Stamp}
              title="Cartão de selos"
              hint="O clássico da barbearia: a cada N cortes, um prêmio. Some do papel e vai pro bolso do cliente."
              enabled={cfg.stampEnabled}
              onToggle={(v) => save({ stampEnabled: v })}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Cortes para fechar a cartela">
                  <NumberInput value={cfg.stampGoal} min={2} max={30} onCommit={(v) => save({ stampGoal: v })} suffix="cortes" />
                </Field>
                <Field label="Prêmio ao completar">
                  <TextInput value={cfg.stampRewardLabel} placeholder="1 corte grátis" onCommit={(v) => save({ stampRewardLabel: v })} />
                </Field>
              </div>
              <SliderRow
                label="Ver prévia com"
                value={previewStamps}
                max={cfg.stampGoal}
                onChange={setPreviewStamps}
              />
            </Section>

            <Section
              icon={Users2}
              title="Indicação"
              hint="O crescimento mais barato que existe — cada cliente vira vendedor. Os dois lados ganham."
              enabled={cfg.referralEnabled}
              onToggle={(v) => save({ referralEnabled: v })}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Quem indicou ganha">
                  <TextInput value={cfg.referralReferrerReward} placeholder="R$ 10 de desconto" onCommit={(v) => save({ referralReferrerReward: v })} />
                </Field>
                <Field label="O amigo ganha">
                  <TextInput value={cfg.referralFriendReward} placeholder="R$ 10 no 1º corte" onCommit={(v) => save({ referralFriendReward: v })} />
                </Field>
              </div>
              <Note>
                O prêmio só cai quando o amigo <strong className="text-zinc-300">conclui o primeiro corte</strong> — ninguém ganha por cadastro fantasma.
              </Note>
            </Section>

            <Section
              icon={Crown}
              title="Pontos e faixas"
              hint="Cada real gasto vira ponto. As faixas dão status — e status é o que traz o cliente de volta."
              enabled={cfg.loyaltyEnabled}
              onToggle={(v) => save({ loyaltyEnabled: v })}
            >
              <Field label="Pontos por R$ 1 gasto">
                <NumberInput value={cfg.pointsPerReal} min={1} max={100} onCommit={(v) => save({ pointsPerReal: v })} suffix="pts" />
              </Field>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">Faixas</p>
                <TierLadder cfg={cfg} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="Prata começa em">
                  <NumberInput value={cfg.silverThreshold} min={1} max={100000} onCommit={(v) => save({ silverThreshold: v })} suffix="pts" />
                </Field>
                <Field label="Ouro começa em">
                  <NumberInput value={cfg.goldThreshold} min={cfg.silverThreshold + 1} max={999999} onCommit={(v) => save({ goldThreshold: v })} suffix="pts" />
                </Field>
              </div>

              <Note>
                Com {cfg.pointsPerReal} pts por real, um corte de R$ 50 rende{" "}
                <strong className="text-amber-300">{cfg.pointsPerReal * 50} pontos</strong> — a faixa Prata chega em{" "}
                <strong className="text-zinc-300">
                  {Math.max(1, Math.ceil(cfg.silverThreshold / (cfg.pointsPerReal * 50)))} cortes
                </strong>.
              </Note>
            </Section>
          </div>

          {/* ---------------- Prévia viva ---------------- */}
          <div className="xl:sticky xl:top-6">
            <PhonePreview cfg={cfg} stamps={previewStamps} saving={saving} />
          </div>
        </div>
      ) : (
        <RewardsQueue rewards={rewards} onRedeem={redeem} />
      )}
    </div>
  );
}

/* ============================ Prévia ============================ */

/**
 * O coração da tela. Configurar fidelidade às cegas é o que faz o gestor
 * desistir no meio — aqui ele vê exatamente a tela do cliente mudando
 * enquanto mexe, então a decisão deixa de ser abstrata.
 */
function PhonePreview({ cfg, stamps, saving }: { cfg: Config; stamps: number; saving: boolean }) {
  const filled = Math.min(stamps, cfg.stampGoal);
  const remaining = Math.max(0, cfg.stampGoal - filled);
  const nothingOn = !cfg.stampEnabled && !cfg.referralEnabled && !cfg.loyaltyEnabled;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Prévia — o app do cliente</p>
        <span className={cn("flex items-center gap-1.5 text-[11px] transition-opacity", saving ? "text-amber-400 opacity-100" : "text-emerald-400 opacity-70")}>
          {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> salvando</> : <><Check className="w-3 h-3" /> salvo</>}
        </span>
      </div>

      {/* Moldura do aparelho */}
      <div className="relative mx-auto w-full max-w-[340px] rounded-[2.25rem] bg-zinc-800 p-2 shadow-2xl shadow-black/60 ring-1 ring-white/5">
        <div className="absolute left-1/2 top-3.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-zinc-950" />
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#0B0713] min-h-[560px]">
          {/* brilho de fundo, o mesmo clima do app */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />

          <div className="relative px-4 pb-6 pt-11">
            <p className="text-center text-[13px] font-semibold text-white/90">Minha carteira</p>

            {nothingOn ? (
              <div className="mt-24 px-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                  <Gift className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-400">Nada aparece aqui</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
                  Com tudo desligado, o cliente abre a carteira e encontra uma tela vazia. Ligue ao menos um mecanismo.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3.5">
                {/* Cartela */}
                {cfg.stampEnabled && (
                  <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/12 to-transparent p-4">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[13px] font-bold text-white">Cartão de selos</p>
                      <p className="text-[11px] text-amber-300/90">{filled}/{cfg.stampGoal}</p>
                    </div>
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {Array.from({ length: cfg.stampGoal }).map((_, i) => {
                        const isLast = i === cfg.stampGoal - 1;
                        const done = i < filled;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                              done
                                ? "bg-gradient-to-br from-amber-300 to-amber-500 text-zinc-900 shadow-lg shadow-amber-500/25"
                                : isLast
                                  ? "border-2 border-dashed border-amber-400/50 text-amber-400/60"
                                  : "border-2 border-dashed border-white/12 text-transparent"
                            )}
                          >
                            {isLast && !done ? <Gift className="h-3.5 w-3.5" /> : done ? <Scissors className="h-3.5 w-3.5" /> : "•"}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3.5 text-[11px] text-zinc-400">
                      {remaining === 0 ? (
                        <span className="font-semibold text-amber-300">Cartela completa! Prêmio liberado 🎉</span>
                      ) : (
                        <>Faltam <span className="font-semibold text-white">{remaining}</span> {remaining === 1 ? "corte" : "cortes"} para ganhar{" "}
                          <span className="font-semibold text-amber-300">{cfg.stampRewardLabel || "seu prêmio"}</span></>
                      )}
                    </p>
                  </div>
                )}

                {/* Pontos */}
                {cfg.loyaltyEnabled && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-zinc-500">Seus pontos</p>
                        <p className="mt-0.5 text-2xl font-black tracking-tight text-white">{cfg.pointsPerReal * 50}</p>
                      </div>
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                        {cfg.pointsPerReal * 50 >= cfg.goldThreshold ? "OURO" : cfg.pointsPerReal * 50 >= cfg.silverThreshold ? "PRATA" : "BRONZE"}
                      </span>
                    </div>
                    <ProgressToNextTier cfg={cfg} points={cfg.pointsPerReal * 50} />
                  </div>
                )}

                {/* Indicação */}
                {cfg.referralEnabled && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-[13px] font-bold text-white">Indique um amigo</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      Você ganha <span className="text-amber-300">{cfg.referralReferrerReward || "—"}</span> e ele ganha{" "}
                      <span className="text-amber-300">{cfg.referralFriendReward || "—"}</span>.
                    </p>
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-white/15 bg-black/30 px-3.5 py-2.5">
                      <span className="font-mono text-lg font-black tracking-[0.2em] text-white">XAN308</span>
                      <Copy className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressToNextTier({ cfg, points }: { cfg: Config; points: number }) {
  const isGold = points >= cfg.goldThreshold;
  if (isGold) return <p className="mt-3 text-[11px] text-amber-300">Faixa máxima alcançada.</p>;

  const target = points >= cfg.silverThreshold ? cfg.goldThreshold : cfg.silverThreshold;
  const floor = points >= cfg.silverThreshold ? cfg.silverThreshold : 0;
  const label = points >= cfg.silverThreshold ? "Ouro" : "Prata";
  const pct = Math.max(0, Math.min(100, ((points - floor) / Math.max(1, target - floor)) * 100));

  return (
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        Faltam <span className="font-semibold text-zinc-300">{Math.max(0, target - points)}</span> pontos para {label}
      </p>
    </div>
  );
}

/* ============================ Peças ============================ */

function StatCard({ icon: Icon, value, label, tone, onClick }: {
  icon: React.ElementType; value: string; label: string; tone: "amber" | "emerald" | "off"; onClick?: () => void;
}) {
  const tones = {
    amber: "border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent text-amber-400",
    emerald: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent text-emerald-400",
    off: "border-zinc-800 bg-zinc-900/40 text-zinc-600",
  }[tone];

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn("group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all", tones, onClick && "hover:scale-[1.01] cursor-pointer")}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black leading-none tracking-tight text-white">{value}</p>
        <p className="mt-1 truncate text-[11px] text-zinc-500">{label}</p>
      </div>
      {onClick && <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5" />}
    </Tag>
  );
}

function SegmentedTabs({ tab, onChange, pendingCount }: {
  tab: "programa" | "premios"; onChange: (t: "programa" | "premios") => void; pendingCount: number;
}) {
  return (
    <div className="relative flex w-fit gap-1 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
      {([["programa", "Programa"], ["premios", "Prêmios a entregar"]] as const).map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
            tab === id ? "bg-zinc-100 text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {label}
          {id === "premios" && pendingCount > 0 && (
            <span className={cn(
              "flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-black",
              tab === id ? "bg-zinc-900 text-white" : "bg-emerald-500 text-zinc-900"
            )}>
              {pendingCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, hint, enabled, onToggle, children }: {
  icon: React.ElementType; title: string; hint: string; enabled: boolean;
  onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border transition-all duration-300",
      enabled ? "border-zinc-700/70 bg-zinc-900/70" : "border-zinc-800/60 bg-zinc-900/30"
    )}>
      <div className="flex items-start gap-3.5 p-5">
        <div className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors",
          enabled ? "bg-amber-500/15 text-amber-400" : "bg-zinc-800/60 text-zinc-600"
        )}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-sm font-bold transition-colors", enabled ? "text-white" : "text-zinc-500")}>{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{hint}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>

      {/* Colapsa quando desligado: esconder controle que não faz nada é o que
          separa uma tela limpa de uma tela cheia de campo morto. */}
      <div className={cn(
        "grid transition-all duration-300 ease-out",
        enabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="border-t border-zinc-800/60 p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * O switch é o gesto mais repetido desta tela — vale o capricho. Três coisas
 * que separam ele de um checkbox estilizado: a trilha acende com brilho
 * próprio quando liga, o botão estica no meio do caminho (o "squish" que dá
 * peso físico ao movimento) e a curva é elástica, não linear.
 */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "group relative h-7 w-[52px] flex-shrink-0 rounded-full outline-none",
        "transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
        "focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
        checked
          ? "bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_0_1px_rgba(245,158,11,0.5),0_2px_12px_-1px_rgba(245,158,11,0.55)]"
          : "bg-zinc-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]"
      )}
    >
      {/* Ícones dentro da trilha: dão leitura instantânea do estado sem
          depender só da posição do botão (e de enxergar bem a cor). */}
      <Check
        className={cn(
          "pointer-events-none absolute left-[9px] top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-900/70 transition-all duration-200",
          checked ? "scale-100 opacity-100 delay-100" : "scale-50 opacity-0"
        )}
        strokeWidth={3.5}
      />
      <span
        className={cn(
          "pointer-events-none absolute right-[11px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-[1.5px] border-zinc-600 transition-all duration-200",
          checked ? "scale-50 opacity-0" : "scale-100 opacity-100 delay-100"
        )}
      />
      <span
        className={cn(
          "absolute top-1/2 h-[22px] -translate-y-1/2 rounded-full bg-white",
          "shadow-[0_1px_3px_rgba(0,0,0,0.4)]",
          "transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
          // largura maior no active = o botão "estica" enquanto desliza
          "w-[22px] group-active:w-[27px]",
          checked ? "left-[26px] group-active:left-[21px]" : "left-1"
        )}
      />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3.5 py-3 text-[11px] leading-relaxed text-zinc-500">
      {children}
    </p>
  );
}

function SliderRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3.5 py-3">
      <span className="flex-shrink-0 text-[11px] text-zinc-500">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-amber-500"
      />
      <span className="w-16 flex-shrink-0 text-right text-[11px] font-semibold text-amber-300">
        {Math.min(value, max)} {Math.min(value, max) === 1 ? "selo" : "selos"}
      </span>
    </div>
  );
}

/**
 * Inputs commitam no blur (e no Enter), nunca a cada tecla: por tecla dispara
 * um PATCH por dígito e ainda grava estados intermediários inválidos — digitar
 * "10" passaria por "1".
 */
function NumberInput({ value, min, max, onCommit, suffix }: {
  value: number; min: number; max: number; onCommit: (v: number) => void; suffix?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < min || n > max) { setDraft(String(value)); return; }
    if (n !== value) onCommit(n);
  };

  return (
    <div className="group relative">
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3.5 py-2.5 pr-16 text-sm font-semibold text-white outline-none transition-colors focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15"
      />
      {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-600">{suffix}</span>}
    </div>
  );
}

function TextInput({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onCommit(draft); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15"
    />
  );
}

function TierLadder({ cfg }: { cfg: Config }) {
  const tiers = [
    { label: "Bronze", from: 0, to: cfg.silverThreshold - 1, color: "from-orange-700/40 to-orange-900/20 border-orange-700/40 text-orange-300", discount: 0 },
    { label: "Prata", from: cfg.silverThreshold, to: cfg.goldThreshold - 1, color: "from-slate-400/25 to-slate-600/10 border-slate-400/30 text-slate-200", discount: cfg.silverDiscount },
    { label: "Ouro", from: cfg.goldThreshold, to: undefined, color: "from-amber-400/25 to-amber-600/10 border-amber-400/35 text-amber-200", discount: cfg.goldDiscount },
  ];

  return (
    <div className="flex gap-2">
      {tiers.map((t, i) => (
        <div key={t.label} className={cn("flex-1 rounded-xl border bg-gradient-to-br p-3", t.color)}>
          <div className="flex items-center gap-1.5">
            {i === 2 && <Crown className="h-3 w-3" />}
            {i === 1 && <Star className="h-3 w-3" />}
            <span className="text-[11px] font-bold">{t.label}</span>
          </div>
          <p className="mt-1.5 text-[10px] leading-tight opacity-70">
            {t.to === undefined ? `${t.from.toLocaleString("pt-BR")}+ pts` : `${t.from.toLocaleString("pt-BR")}–${t.to.toLocaleString("pt-BR")}`}
          </p>
          {t.discount > 0 && (
            <p className="mt-1 text-[10px] font-semibold">{Math.round(t.discount * 100)}% off</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RewardsQueue({ rewards, onRedeem }: { rewards: Reward[]; onRedeem: (r: Reward) => void }) {
  if (rewards.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/50">
          <Gift className="h-7 w-7 text-zinc-600" />
        </div>
        <p className="mt-5 text-sm font-semibold text-zinc-300">Nenhum prêmio esperando</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-600">
          Quando um cliente fechar a cartela ou trouxer um amigo, o prêmio aparece aqui para você entregar no balcão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {rewards.map((r) => (
        <div
          key={r.id}
          className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-emerald-500/30"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-transparent text-emerald-400">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{r.clientName}</p>
            <p className="truncate text-xs font-medium text-amber-300">{r.label}</p>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              {SOURCE_LABEL[r.source] ?? r.source} · {formatDateTime(r.createdAt)}
              {r.clientPhone ? ` · ${r.clientPhone}` : ""}
            </p>
          </div>
          <button
            onClick={() => onRedeem(r)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-900 transition-colors hover:bg-emerald-400"
          >
            <Check className="h-3.5 w-3.5" /> Entregar
          </button>
        </div>
      ))}
    </div>
  );
}
