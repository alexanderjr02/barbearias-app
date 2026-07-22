"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket, Plus, Copy, Check, Loader2, Ban, RotateCcw, Store } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { cn, formatDate } from "@/lib/utils";

interface Redemption {
  createdAt: string;
  barbershop: { id: string; name: string; slug: string };
}

interface Coupon {
  id: string;
  code: string;
  plan: string;
  durationDays: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  redemptions: Redemption[];
}

const PLANOS = [
  { val: "ENTERPRISE", label: "White Label" },
  { val: "PRO", label: "Pro" },
  { val: "FREE", label: "Starter" },
] as const;

const DURACOES = [
  { val: 30, label: "30 dias" },
  { val: 90, label: "3 meses" },
  { val: 365, label: "12 meses" },
  { val: null, label: "Vitalício" },
] as const;

function duracaoLabel(dias: number | null): string {
  if (dias === null) return "Vitalício";
  if (dias % 365 === 0) return `${dias / 365} ano(s)`;
  if (dias % 30 === 0) return `${dias / 30} mes(es)`;
  return `${dias} dias`;
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => apiGet<{ coupons: Coupon[] }>("/api/admin/coupons") });
  const [criando, setCriando] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  const coupons = data?.coupons ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        icon={Ticket}
        title="Cupons de acesso"
        subtitle="Códigos que dão plano sem passar pela tela de pagamento"
        accent="mono"
        action={
          <button
            onClick={() => setCriando((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" /> Gerar cupom
          </button>
        }
      />

      {criando && <Formulario onDone={() => { setCriando(false); refresh(); }} />}

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-900" />
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
          <Ticket className="mx-auto h-7 w-7 text-zinc-700" />
          <p className="mt-3 text-sm font-medium text-zinc-300">Nenhum cupom ainda</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Gere um código para fechar venda por fora, dar cortesia ou levar a um evento — quem resgatar já entra no plano certo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <Cartao key={c.id} coupon={c} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function Formulario({ onDone }: { onDone: () => void }) {
  const [plan, setPlan] = useState<string>("ENTERPRISE");
  const [durationDays, setDurationDays] = useState<number | null>(365);
  const [maxUses, setMaxUses] = useState<string>("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const n = maxUses.trim() === "" ? null : Number(maxUses);
      const res = await apiPost<{ coupon: Coupon }>("/api/admin/coupons", {
        plan,
        durationDays,
        maxUses: Number.isInteger(n) && (n as number) > 0 ? n : null,
        note: note.trim() || null,
      });
      toast.success(`Cupom ${res.coupon.code} criado.`);
      onDone();
    } catch {
      // apiClient já mostrou o motivo
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">Plano concedido</p>
        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
          {PLANOS.map((p) => (
            <button key={p.val} type="button" onClick={() => setPlan(p.val)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", plan === p.val ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">Por quanto tempo</p>
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
          {DURACOES.map((d) => (
            <button key={String(d.val)} type="button" onClick={() => setDurationDays(d.val)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", durationDays === d.val ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white")}>
              {d.label}
            </button>
          ))}
        </div>
        {durationDays === null && (
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Vitalício não expira nunca. Use com limite de usos baixo — cortesia sem controle é receita saindo sem aparecer em lugar nenhum.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Limite de usos (vazio = ilimitado)</label>
          <input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="1"
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Anotação (para você lembrar)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: piloto Barbearia do João"
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none" />
        </div>
      </div>

      <button type="submit" disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Gerar código
      </button>
    </form>
  );
}

function Cartao({ coupon, onChanged }: { coupon: Coupon; onChanged: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const [busy, setBusy] = useState(false);

  const esgotado = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
  const vivo = coupon.isActive && !esgotado;

  const copiar = async () => {
    await navigator.clipboard.writeText(coupon.code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  const alternar = async () => {
    setBusy(true);
    try {
      await apiPatch(`/api/admin/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      toast.success(coupon.isActive ? "Cupom revogado." : "Cupom reativado.");
      onChanged();
    } catch {
      // apiClient já mostrou
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border bg-zinc-900/40 p-4", vivo ? "border-zinc-800" : "border-zinc-800/50 opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={copiar} title="Copiar" className="flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-sm font-bold tracking-wider text-white transition-colors hover:bg-zinc-800">
            {coupon.code}
            {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-500" />}
          </button>
          <div className="text-xs">
            <p className="font-semibold text-white">
              {PLANOS.find((p) => p.val === coupon.plan)?.label ?? coupon.plan} · {duracaoLabel(coupon.durationDays)}
            </p>
            <p className="text-zinc-500">
              {coupon.usedCount} de {coupon.maxUses ?? "∞"} usos
              {!coupon.isActive && " · revogado"}
              {esgotado && coupon.isActive && " · esgotado"}
            </p>
          </div>
        </div>
        <button onClick={alternar} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : coupon.isActive ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
          {coupon.isActive ? "Revogar" : "Reativar"}
        </button>
      </div>

      {coupon.note && <p className="mt-2.5 text-xs text-zinc-500">{coupon.note}</p>}

      {coupon.redemptions.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-zinc-800/70 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Quem usou</p>
          {coupon.redemptions.map((r) => (
            <Link key={r.barbershop.id} href={`/admin/barbershops/${r.barbershop.id}`}
              className="flex items-center gap-2 text-xs text-zinc-400 transition-colors hover:text-white">
              <Store className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              <span className="truncate">{r.barbershop.name}</span>
              <span className="text-zinc-600">· {formatDate(r.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
