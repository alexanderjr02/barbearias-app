"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Stamp, Users2, Star, Check, Loader2, Sparkles, Scissors } from "lucide-react";
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
    return <div className="flex items-center justify-center py-24 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Gift}
        title="Fidelidade"
        subtitle="Desenhe o programa da sua barbearia — pontos, cartão de selos e indicação"
        accent="amber"
      />

      <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {([["programa", "Programa"], ["premios", `Prêmios a entregar${rewards.length ? ` · ${rewards.length}` : ""}`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
              tab === id ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "programa" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ---- Cartão de selos ---- */}
          <Section
            icon={Stamp}
            title="Cartão de selos"
            hint="O clássico da barbearia: a cada N cortes, um prêmio."
            enabled={cfg.stampEnabled}
            onToggle={(v) => save({ stampEnabled: v })}
          >
            {/* Prévia ao vivo: o gestor vê o que o cliente vai ver */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400/80 mb-3">Prévia do que o cliente vê</p>
              <StampPreview goal={cfg.stampGoal} filled={Math.min(3, cfg.stampGoal)} />
              <p className="text-xs text-zinc-400 mt-3">
                Ao completar, ganha: <span className="text-amber-300 font-semibold">{cfg.stampRewardLabel || "—"}</span>
              </p>
            </div>

            <Field label="Cortes para completar">
              <NumberInput value={cfg.stampGoal} min={1} max={30} onCommit={(v) => save({ stampGoal: v })} />
            </Field>
            <Field label="Prêmio">
              <TextInput value={cfg.stampRewardLabel} placeholder="Ex: 1 corte grátis" onCommit={(v) => save({ stampRewardLabel: v })} />
            </Field>
          </Section>

          {/* ---- Indicação ---- */}
          <Section
            icon={Users2}
            title="Indicação"
            hint="Cada cliente vira vendedor. O prêmio só sai quando o amigo aparece de verdade."
            enabled={cfg.referralEnabled}
            onToggle={(v) => save({ referralEnabled: v })}
          >
            <Field label="Quem indica ganha">
              <TextInput value={cfg.referralReferrerReward} placeholder="Ex: R$ 15 de desconto" onCommit={(v) => save({ referralReferrerReward: v })} />
            </Field>
            <Field label="O amigo ganha">
              <TextInput value={cfg.referralFriendReward} placeholder="Ex: R$ 10 no 1º corte" onCommit={(v) => save({ referralFriendReward: v })} />
            </Field>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Quem já é cliente da casa não vale como indicação — assim o programa traz gente nova em vez de virar desconto pra base atual.
            </p>
          </Section>

          {/* ---- Pontos ---- */}
          <Section
            icon={Star}
            title="Pontos e faixas"
            hint="Quanto cada real vale e onde ficam Prata e Ouro."
            enabled={cfg.loyaltyEnabled}
            onToggle={(v) => save({ loyaltyEnabled: v })}
            className="lg:col-span-2"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Pontos por R$ 1">
                <NumberInput value={cfg.pointsPerReal} min={0} max={100} onCommit={(v) => save({ pointsPerReal: v })} />
              </Field>
              <Field label="Prata a partir de">
                <NumberInput value={cfg.silverThreshold} min={1} max={99999} onCommit={(v) => save({ silverThreshold: v })} suffix="pts" />
              </Field>
              <Field label="Ouro a partir de">
                <NumberInput value={cfg.goldThreshold} min={1} max={99999} onCommit={(v) => save({ goldThreshold: v })} suffix="pts" />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Tier label="Bronze" color="text-zinc-400 bg-zinc-800" from={0} to={cfg.silverThreshold - 1} />
              <Tier label="Prata" color="text-slate-200 bg-slate-600/30" from={cfg.silverThreshold} to={cfg.goldThreshold - 1} />
              <Tier label="Ouro" color="text-amber-300 bg-amber-500/15" from={cfg.goldThreshold} />
            </div>
          </Section>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-16 text-center">
              <Gift className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Nenhum prêmio esperando</p>
              <p className="text-xs text-zinc-600 mt-1">Quando um cliente completar a cartela ou trouxer um amigo, aparece aqui.</p>
            </div>
          ) : (
            rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <Gift className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{r.clientName}</p>
                  <p className="text-xs text-amber-300">{r.label}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {SOURCE_LABEL[r.source] ?? r.source} · {formatDateTime(r.createdAt)}
                    {r.clientPhone ? ` · ${r.clientPhone}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => redeem(r)}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-zinc-900 transition-all flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Entregar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {saving && (
        <p className="text-[11px] text-zinc-600 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> salvando…
        </p>
      )}
    </div>
  );
}

/* ---------- peças de UI ---------- */

function Section({ icon: Icon, title, hint, enabled, onToggle, children, className }: {
  icon: typeof Gift; title: string; hint: string; enabled: boolean;
  onToggle: (v: boolean) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-zinc-900 p-5 transition-colors", enabled ? "border-zinc-700" : "border-zinc-800", className)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors", enabled ? "bg-amber-500/15" : "bg-zinc-800")}>
          <Icon className={cn("w-[18px] h-[18px]", enabled ? "text-amber-400" : "text-zinc-600")} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{hint}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {/* Some por completo quando desligado — configuração de algo inativo só
          polui a tela e confunde. */}
      {enabled && <div className="mt-5 space-y-4">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={cn("relative h-6 w-11 flex-shrink-0 rounded-full transition-colors", checked ? "bg-amber-500" : "bg-zinc-700")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

/** Salva ao sair do campo, não a cada tecla — senão cada dígito viraria uma
 * requisição e um estado intermediário inválido. */
function NumberInput({ value, min, max, onCommit, suffix }: { value: number; min: number; max: number; onCommit: (v: number) => void; suffix?: string }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Number(local);
          if (Number.isFinite(n) && n >= min && n <= max && n !== value) onCommit(n);
          else setLocal(String(value));
        }}
        className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 pointer-events-none">{suffix}</span>}
    </div>
  );
}

function TextInput({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local.trim() && local !== value) onCommit(local.trim()); else setLocal(value); }}
      className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
    />
  );
}

function Tier({ label, color, from, to }: { label: string; color: string; from: number; to?: number }) {
  return (
    <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold", color)}>
      {label} · {from}{to !== undefined ? `–${to}` : "+"} pts
    </span>
  );
}

/** A prévia é o que vende a ideia: o gestor vê o cartão do jeito que o cliente
 * vai ver, e entende na hora o que está configurando. */
function StampPreview({ goal, filled }: { goal: number; filled: number }) {
  const shown = Math.min(goal, 12);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
            i < filled ? "border-amber-400 bg-amber-400 text-zinc-900" : "border-dashed border-zinc-700 text-zinc-700"
          )}
        >
          {i === goal - 1 && goal <= 12 ? <Sparkles className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
        </div>
      ))}
      {goal > 12 && <span className="self-center text-xs text-zinc-600">+{goal - 12}</span>}
    </div>
  );
}
