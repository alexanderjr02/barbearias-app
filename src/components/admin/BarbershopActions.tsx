"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserRoundCog, Trash2, Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { apiPost, apiDelete } from "@/lib/apiClient";
import { toast } from "@/lib/toast";

/**
 * As ações que faltavam para o admin não depender de ninguém: destravar o
 * acesso de um gestor, passar a barbearia para outro dono, e apagar de vez.
 *
 * Ficam num bloco separado no fim da página, e não junto dos dados, porque
 * duas delas são irreversíveis — misturar "trocar plano" com "apagar tudo" na
 * mesma faixa da tela é como se clica no que não queria.
 */
export function BarbershopActions({ id, slug, name, ownerEmail, isActive }: { id: string; slug: string; name: string; ownerEmail: string; isActive: boolean }) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Ações do administrador</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Coisas que só você pode fazer por esta barbearia.</p>
      </div>
      <ResetSenha id={id} ownerEmail={ownerEmail} />
      <Transferir id={id} />
      <Apagar id={id} slug={slug} name={name} isActive={isActive} />
    </section>
  );
}

function Linha({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">{children}</div>;
}

function ResetSenha({ id, ownerEmail }: { id: string; ownerEmail: string }) {
  const [busy, setBusy] = useState(false);
  const [senha, setSenha] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const run = async () => {
    if (!confirm(`Definir uma senha nova para ${ownerEmail}?\n\nAs sessões abertas dele serão encerradas.`)) return;
    setBusy(true);
    try {
      const res = await apiPost<{ senhaNova: string }>(`/api/admin/barbershops/${id}/reset-password`, {});
      setSenha(res.senhaNova);
    } catch {
      // apiClient já mostrou
    } finally {
      setBusy(false);
    }
  };

  return (
    <Linha>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Redefinir a senha do gestor</p>
          <p className="mt-0.5 text-xs text-zinc-500">Para quando ele perde a senha e o e-mail não chega.</p>
        </div>
        <button onClick={run} disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white hover:text-zinc-950 disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Redefinir
        </button>
      </div>
      {senha && (
        <div className="mt-3 rounded-lg bg-white/10 p-3">
          <p className="text-[11px] text-zinc-300">Repasse ao gestor. Não aparece de novo.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-zinc-950 px-2.5 py-1.5 font-mono text-sm text-white">{senha}</code>
            <button onClick={async () => { await navigator.clipboard.writeText(senha); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
              className="rounded-lg bg-white px-2.5 py-1.5 text-zinc-950 transition-colors hover:bg-zinc-200">
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
    </Linha>
  );
}

function Transferir({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const run = async () => {
    setBusy(true);
    try {
      const res = await apiPost<{ message: string }>(`/api/admin/barbershops/${id}/transfer`, { email });
      toast.success(res.message);
      setAberto(false);
      setEmail("");
      router.refresh();
      window.location.reload();
    } catch {
      // apiClient já mostrou
    } finally {
      setBusy(false);
    }
  };

  return (
    <Linha>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Transferir para outro dono</p>
          <p className="mt-0.5 text-xs text-zinc-500">A conta precisa já existir. A agenda e o histórico ficam.</p>
        </div>
        <button onClick={() => setAberto((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white hover:text-zinc-950">
          <UserRoundCog className="h-3.5 w-3.5" /> Transferir
        </button>
      </div>
      {aberto && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="e-mail do novo dono"
            className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none" />
          <button onClick={run} disabled={busy || !email.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
          </button>
        </div>
      )}
    </Linha>
  );
}

function Apagar({ id, slug, name, isActive }: { id: string; slug: string; name: string; isActive: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const run = async () => {
    setBusy(true);
    try {
      const res = await apiDelete<{ message: string }>(`/api/admin/barbershops/${id}?confirm=${encodeURIComponent(confirmacao)}`);
      toast.success(res.message);
      router.push("/admin/barbershops");
    } catch {
      // apiClient já mostrou
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Apagar &ldquo;{name}&rdquo;</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Some com agenda, clientes e financeiro. Não tem desfazer nem lixeira.
          </p>
        </div>
        <button onClick={() => setAberto((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/15">
          <Trash2 className="h-3.5 w-3.5" /> Apagar
        </button>
      </div>

      {aberto && (
        <div className="mt-3 space-y-2.5">
          {isActive ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-amber-200">
                Esta barbearia está <strong>ativa</strong>. Suspenda antes de apagar — é a trava que impede uma operação em
                funcionamento sumir com um clique errado.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-400">
                Digite <code className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-white">{slug}</code> para confirmar:
              </p>
              <div className="flex flex-wrap gap-2">
                <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder={slug}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-sm text-white placeholder:text-zinc-700 focus:border-red-500/50 focus:outline-none" />
                <button onClick={run} disabled={busy || confirmacao !== slug}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Apagar de vez
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
