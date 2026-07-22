"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog, Loader2, Check, KeyRound, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";

interface Me {
  name: string;
  email: string;
  role: string;
}

// /admin/account — a conta do próprio administrador.
//
// Existia um buraco básico: o dono da plataforma não conseguia trocar o
// próprio nome, e-mail ou senha por lugar nenhum. A única saída era o
// "esqueci a senha" por e-mail — ou seja, uma operação de dentro do sistema
// dependia de o e-mail estar entregando, coisa que nem sempre está.
export default function AdminAccountPage() {
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ["admin-me"], queryFn: () => apiGet<Me>("/api/admin/me") });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
          <UserCog className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Minha conta</h1>
          <p className="text-sm text-zinc-500">
            {isLoading ? "carregando…" : `${me?.email} · ${me?.role === "SUPER_ADMIN" ? "Super admin" : "Suporte"}`}
          </p>
        </div>
      </header>

      {me && <ProfileSection me={me} onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-me"] })} />}
      <PasswordSection />
      <TwoFactorLink />
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-white/40 focus:outline-none"
      />
    </div>
  );
}

function SubmitButton({ busy, done, children }: { busy: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function ProfileSection({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setName(me.name);
    setEmail(me.email);
  }, [me.name, me.email]);

  const emailChanged = email.trim().toLowerCase() !== me.email.toLowerCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPatch("/api/admin/me", { name, email, currentPassword: emailChanged ? currentPassword : undefined });
      toast.success("Dados atualizados.");
      setCurrentPassword("");
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      onSaved();
    } catch {
      // o apiClient já mostrou o motivo
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Dados de acesso" description="Seu nome aparece na auditoria de tudo que você faz. O e-mail é o que recupera a conta.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {emailChanged && (
          <Field
            label="Senha atual (obrigatória para trocar o e-mail)"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        )}
        <SubmitButton busy={busy} done={done}>Salvar</SubmitButton>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && newPassword !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    try {
      const res = await apiPost<{ message: string }>("/api/admin/me/password", { currentPassword, newPassword });
      toast.success(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // o apiClient já mostrou o motivo
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Senha"
      description="Mínimo de 8 caracteres, com letras e números. Ao trocar, as outras sessões abertas são encerradas."
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Senha atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" required />
        <Field label="Senha nova" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
        <Field label="Repita a senha nova" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
        {mismatch && <p className="text-xs text-red-400">As senhas não conferem.</p>}
        <SubmitButton busy={busy} done={done}>
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="h-4 w-4" /> Trocar senha
          </span>
        </SubmitButton>
      </form>
    </Card>
  );
}

function TwoFactorLink() {
  return (
    <Card title="Verificação em duas etapas" description="Um código do aplicativo autenticador além da senha. Fica em Configurações, junto com os outros ajustes de plataforma.">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3.5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
      >
        <ShieldCheck className="h-4 w-4" />
        Abrir configurações de 2FA
        <ExternalLink className="h-3.5 w-3.5 text-zinc-600" />
      </Link>
    </Card>
  );
}
