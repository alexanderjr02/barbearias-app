"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Check, Zap, Crown, Save, ShieldCheck, ShieldOff, Copy, Smile, Download, DatabaseBackup } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

type Plan = "FREE" | "PRO" | "ENTERPRISE";
type Pricing = { price: number; appointmentsLimit: number | null; staffLimit: number | null };

const PLAN_META: Record<Plan, { label: string; icon: typeof Check; cls: string }> = {
  FREE: { label: "Starter", icon: Check, cls: "text-zinc-400" },
  PRO: { label: "Pro", icon: Zap, cls: "text-amber-400" },
  ENTERPRISE: { label: "White Label", icon: Crown, cls: "text-purple-400" },
};

function PlanCard({ plan, pricing, onSave }: { plan: Plan; pricing: Pricing; onSave: (p: Plan, data: Pricing) => Promise<void> }) {
  const [price, setPrice] = useState(pricing.price);
  const [appointmentsUnlimited, setAppointmentsUnlimited] = useState(pricing.appointmentsLimit === null);
  const [appointmentsLimit, setAppointmentsLimit] = useState(pricing.appointmentsLimit ?? 50);
  const [staffUnlimited, setStaffUnlimited] = useState(pricing.staffLimit === null);
  const [staffLimit, setStaffLimit] = useState(pricing.staffLimit ?? 3);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const meta = PLAN_META[plan];
  const Icon = meta.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(plan, {
        price,
        appointmentsLimit: appointmentsUnlimited ? null : appointmentsLimit,
        staffLimit: staffUnlimited ? null : staffLimit,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", meta.cls)} />
        <h3 className={cn("text-sm font-bold", meta.cls)}>{meta.label}</h3>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Preço mensal (R$)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Limite de agendamentos/mês</label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input type="checkbox" checked={appointmentsUnlimited} onChange={(e) => setAppointmentsUnlimited(e.target.checked)} className="accent-purple-500" />
            Ilimitado
          </label>
        </div>
        {!appointmentsUnlimited && (
          <input
            type="number"
            min={1}
            value={appointmentsLimit}
            onChange={(e) => setAppointmentsLimit(Number(e.target.value))}
            className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Limite de barbeiros</label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input type="checkbox" checked={staffUnlimited} onChange={(e) => setStaffUnlimited(e.target.checked)} className="accent-purple-500" />
            Ilimitado
          </label>
        </div>
        {!staffUnlimited && (
          <input
            type="number"
            min={1}
            value={staffLimit}
            onChange={(e) => setStaffLimit(Number(e.target.value))}
            className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-semibold rounded-lg hover:bg-purple-500/25 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
      </button>
    </div>
  );
}

function TwoFactorSection() {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-2fa-status"],
    queryFn: () => apiGet<{ enabled: boolean }>("/api/admin/security/2fa"),
  });

  const startEnroll = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await apiPost<{ secret: string; otpauthUri: string }>("/api/admin/security/2fa", {});
      setEnrolling(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar cadastro");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiPatch("/api/admin/security/2fa", { code });
      setEnrolling(null);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["admin-2fa-status"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await apiDelete("/api/admin/security/2fa");
      queryClient.invalidateQueries({ queryKey: ["admin-2fa-status"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        {data?.enabled ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldOff className="w-4 h-4 text-zinc-500" />}
        <h3 className="text-sm font-bold text-white">Verificação em duas etapas</h3>
      </div>
      <p className="text-xs text-zinc-500">
        Protege sua conta com um código de 6 dígitos gerado por um app autenticador (Google Authenticator, Authy, 1Password...), além da senha.
      </p>

      {data?.enabled && !enrolling && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Ativado</span>
          <button onClick={disable} disabled={busy} className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
            Desativar
          </button>
        </div>
      )}

      {!data?.enabled && !enrolling && (
        <button
          onClick={startEnroll}
          disabled={busy}
          className="flex items-center gap-2 px-3.5 py-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-semibold rounded-lg hover:bg-purple-500/25 transition-colors disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" /> Ativar 2FA
        </button>
      )}

      {enrolling && (
        <form onSubmit={confirmEnroll} className="space-y-3 border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-400">1. Adicione esta chave no seu app autenticador (entrada manual):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 break-all font-mono">{enrolling.secret}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(enrolling.secret);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && <p className="text-[10px] text-emerald-400">Copiado!</p>}
          <p className="text-xs text-zinc-400 pt-1">2. Digite o código gerado para confirmar:</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center text-lg font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEnrolling(null); setCode(""); setError(null); }}
              className="flex-1 py-2 text-xs font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="flex-1 py-2 text-xs font-semibold text-purple-400 bg-purple-500/15 border border-purple-500/30 rounded-lg hover:bg-purple-500/25 transition-colors disabled:opacity-50"
            >
              Confirmar e ativar
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface NpsData {
  average: number | null;
  npsScore: number | null;
  responseCount: number;
  responses: { id: string; score: number; comment: string | null; barbershopName: string; userName: string; createdAt: string }[];
}

function NpsSection() {
  const { data } = useQuery({ queryKey: ["admin-nps"], queryFn: () => apiGet<NpsData>("/api/admin/nps") });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3"><Smile className="w-5 h-5 text-purple-400" /></div>
          <p className="text-2xl font-black text-white">{data?.npsScore ?? "—"}</p>
          <p className="text-sm text-zinc-500">NPS</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-2xl font-black text-white">{data?.average != null ? data.average.toFixed(1) : "—"}</p>
          <p className="text-sm text-zinc-500">Nota média (0-10)</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-2xl font-black text-white">{data?.responseCount ?? 0}</p>
          <p className="text-sm text-zinc-500">Respostas</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white">Respostas recentes</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {(data?.responses.length ?? 0) === 0 && <p className="text-sm text-zinc-500 text-center py-10">Nenhuma resposta ainda</p>}
          {data?.responses.map((r) => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-300">{r.barbershopName} · {r.userName}</p>
                {r.comment && <p className="text-xs text-zinc-500 mt-0.5">"{r.comment}"</p>}
                <p className="text-[10px] text-zinc-700 mt-1">{formatDateTime(r.createdAt)}</p>
              </div>
              <span className={cn("text-lg font-black flex-shrink-0", r.score >= 9 ? "text-emerald-400" : r.score >= 7 ? "text-amber-400" : "text-red-400")}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BackupSection() {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      window.location.href = "/api/admin/backup";
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <DatabaseBackup className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-bold text-white">Backup do banco de dados</h3>
      </div>
      <p className="text-xs text-zinc-500">
        Baixa uma cópia completa do banco SQLite atual. Não existe backup automático agendado (sem infraestrutura de cron nesta versão) — use este botão quando quiser garantir uma cópia de segurança.
      </p>
      <button
        onClick={download}
        disabled={downloading}
        className="flex items-center gap-2 px-3.5 py-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-semibold rounded-lg hover:bg-purple-500/25 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" /> {downloading ? "Baixando..." : "Baixar backup agora"}
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"planos" | "seguranca" | "nps" | "backup">("planos");

  const { data } = useQuery({
    queryKey: ["admin-plan-pricing"],
    queryFn: () => apiGet<Record<Plan, Pricing>>("/api/admin/settings/plan-pricing"),
  });

  const savePlan = async (plan: Plan, pricing: Pricing) => {
    await apiPatch("/api/admin/settings/plan-pricing", { plan, ...pricing });
    queryClient.invalidateQueries({ queryKey: ["admin-plan-pricing"] });
    queryClient.invalidateQueries({ queryKey: ["plan-pricing"] });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader icon={Settings} title="Configurações" subtitle="Preços de planos e segurança da plataforma" accent="purple" />

      <div className="flex gap-2 border-b border-zinc-800">
        {[
          { id: "planos" as const, label: "Planos" },
          { id: "seguranca" as const, label: "Segurança" },
          { id: "nps" as const, label: "NPS" },
          { id: "backup" as const, label: "Backup" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.id ? "border-purple-500 text-purple-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "planos" && (
        <>
          {!data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-72 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["FREE", "PRO", "ENTERPRISE"] as const).map((plan) => (
                <PlanCard
                  key={`${plan}-${data[plan].price}-${data[plan].appointmentsLimit}-${data[plan].staffLimit}`}
                  plan={plan}
                  pricing={data[plan]}
                  onSave={savePlan}
                />
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-600">
            Alterar um preço aqui atualiza imediatamente o que os gestores veem no checkout de upgrade e na tela de Configurações do painel deles.
          </p>
        </>
      )}

      {tab === "seguranca" && <TwoFactorSection />}
      {tab === "nps" && <NpsSection />}
      {tab === "backup" && <BackupSection />}
    </div>
  );
}
