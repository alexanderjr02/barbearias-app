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
        <h1 className="font-display text-4xl font-bold uppercase leading-none text-porcelana mb-3">Verifique seu e-mail</h1>
        <p className="text-fumaca text-sm leading-relaxed mb-8">
          Se houver uma conta associada a <span className="text-porcelana/80 font-medium">{email}</span>, enviamos um link para
          redefinir a senha. O link expira em 1 hora. Não esqueça de olhar a caixa de spam.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-latao hover:text-latao-claro transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="w-12 h-12 rounded-2xl bg-latao/12 border border-latao/30 flex items-center justify-center mb-5">
        <KeyRound className="w-6 h-6 text-latao" />
      </div>
      <h1 className="font-display text-4xl font-bold uppercase leading-none text-porcelana mb-3">Esqueceu a senha?</h1>
      <p className="text-fumaca text-sm mb-8">
        Sem problema. Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-fumaca uppercase tracking-wide mb-2">E-mail</label>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full h-12 px-4 bg-breu-2 border border-breu-3 rounded-2xl text-porcelana placeholder:text-fumaca/60 focus:outline-none focus:ring-2 focus:ring-latao/50 focus:border-latao/60 transition-all text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-latao text-breu font-bold uppercase tracking-wider rounded-xl hover:bg-latao-claro transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-breu-3 border-t-transparent rounded-full animate-spin" />
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
        className="mt-6 inline-flex items-center gap-2 text-sm text-fumaca hover:text-porcelana/80 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o login
      </Link>
    </div>
  );
}
