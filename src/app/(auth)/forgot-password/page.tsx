"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível enviar o e-mail");
        setIsLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
          <MailCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Verifique seu e-mail</h1>
        <p className="text-zinc-500 text-sm leading-relaxed mb-8">
          Se houver uma conta associada a <span className="text-zinc-300 font-medium">{email}</span>, enviamos um link para
          redefinir a senha. O link expira em 1 hora. Não esqueça de olhar a caixa de spam.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
        <KeyRound className="w-6 h-6 text-amber-400" />
      </div>
      <h1 className="text-3xl font-black text-white mb-1">Esqueceu a senha?</h1>
      <p className="text-zinc-500 text-sm mb-8">
        Sem problema. Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">E-mail</label>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-900 font-bold rounded-2xl hover:from-amber-400 hover:to-amber-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            "Enviar link de redefinição →"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      )}

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o login
      </Link>
    </div>
  );
}
