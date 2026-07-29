"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff, Check, X, ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";
import { redirectTo } from "@/lib/utils";

const PASSWORD_RULES = [
  { label: "8+ caracteres", test: (p: string) => p.length >= 8 },
  { label: "Uma letra", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "Um número", test: (p: string) => /[0-9]/.test(p) },
] as const;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rulesOk = PASSWORD_RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;
  const canSubmit = rulesOk && matches && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!rulesOk) {
      setError("A senha não atende aos requisitos mínimos.");
      return;
    }
    if (!matches) {
      setError("As senhas não coincidem.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível redefinir a senha");
        setIsLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-5">
          <X className="w-6 h-6 text-red-400" />
        </div>
        <h1 className="tipo-titulo text-4xl text-neve mb-3">Link inválido</h1>
        <p className="text-cinza text-sm mb-8">
          Este link de redefinição está incompleto ou expirou. Solicite um novo para continuar.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 h-12 px-5 bg-ouro text-preto font-bold rounded-xl hover:bg-ouro-claro transition-colors text-sm"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="tipo-titulo text-4xl text-neve mb-3">Senha redefinida!</h1>
        <p className="text-cinza text-sm mb-8">
          Sua senha foi atualizada e todas as sessões antigas foram encerradas. Agora é só entrar com a nova senha.
        </p>
        <button
          onClick={() => redirectTo("/login")}
          className="inline-flex items-center gap-2 h-12 px-5 bg-ouro text-preto font-bold rounded-xl hover:bg-ouro-claro transition-colors text-sm"
        >
          Ir para o login →
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="w-12 h-12 rounded-2xl bg-ouro/12 border border-ouro/30 flex items-center justify-center mb-5">
        <KeyRound className="w-6 h-6 text-ouro" />
      </div>
      <h1 className="tipo-titulo text-4xl text-neve mb-3">Criar nova senha</h1>
      <p className="text-cinza text-sm mb-8">Escolha uma senha forte que você não usa em outros sites.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs tipo-etiqueta text-cinza mb-2">Nova senha</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha forte"
              className="w-full h-12 px-4 pr-12 bg-grafite border border-traco-forte rounded-2xl text-neve placeholder:text-cinza/60 focus:outline-none focus:ring-2 focus:ring-ouro/50 focus:border-ouro/60 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cinza hover:text-neve/80 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <span key={rule.label} className={`inline-flex items-center gap-1 text-[11px] transition-colors ${ok ? "text-emerald-400" : "text-cinza/60"}`}>
                    {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {rule.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs tipo-etiqueta text-cinza mb-2">Confirmar senha</label>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Digite a senha novamente"
            className="w-full h-12 px-4 bg-grafite border border-traco-forte rounded-2xl text-neve placeholder:text-cinza/60 focus:outline-none focus:ring-2 focus:ring-ouro/50 focus:border-ouro/60 transition-all text-sm"
          />
          {confirm && !matches && <p className="text-xs text-red-400 mt-1.5">As senhas não coincidem</p>}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 bg-ouro text-preto font-bold rounded-xl hover:bg-ouro-claro transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-traco-forte border-t-transparent rounded-full animate-spin" />
          ) : (
            "Redefinir senha"
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
        className="mt-6 inline-flex items-center gap-2 text-sm text-cinza hover:text-neve/80 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o login
      </Link>
    </div>
  );
}
