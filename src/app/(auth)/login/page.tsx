"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Check } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { redirectTo } from "@/lib/utils";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Only a 2FA-enabled account (opt-in, SUPER_ADMIN only today) ever reaches
  // this second step — everyone else's login completes in one round trip.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const finishLogin = (data: { user: { role: string } }) => {
    redirectTo(data.user.role === "SUPER_ADMIN" || data.user.role === "SUPPORT_ADMIN" ? "/admin" : "/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível entrar");
        setIsLoading(false);
        return;
      }
      if (data.requiresTwoFactor) {
        setPendingToken(data.pendingToken);
        setIsLoading(false);
        return;
      }
      finishLogin(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível entrar com o Google");
        setIsLoading(false);
        return;
      }
      finishLogin(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Código inválido");
        setIsLoading(false);
        return;
      }
      finishLogin(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (pendingToken) {
    return (
      <div className="w-full max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1.5">Verificação em duas etapas</h1>
        <p className="text-zinc-500 text-sm mb-8">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Código</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full h-14 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:border-white/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length < 6}
            className="w-full h-12 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Verificar"}
          </button>

          <button
            type="button"
            onClick={() => {
              setPendingToken(null);
              setCode("");
              setError(null);
            }}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Voltar
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-xs text-red-400 text-center">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-[28px] font-bold tracking-tight text-white mb-1.5">Bem-vindo de volta</h1>
      <p className="text-zinc-500 text-sm mb-1">
        É dono de barbearia e não tem conta?{" "}
        <Link href="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Cadastre-se grátis
        </Link>
      </p>
      {/* Cliente não cria conta por aqui. Esta é a entrada do gestor; a conta
          do cliente nasce no app da barbearia dele, junto com o primeiro
          agendamento e já ligada a alguém. Conta de cliente criada solta no
          site não tem barbearia, não tem agenda e não leva a lugar nenhum. */}
      <div className="mb-8" />

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <div className="mb-5">
            <GoogleSignInButton onSuccess={handleGoogleSuccess} text="signin_with" />
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">ou entre com e-mail</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
            E-mail
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 pr-11 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <span className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900 flex items-center justify-center peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors">
                <Check className="w-3 h-3 text-zinc-900 opacity-0 peer-checked:opacity-100" strokeWidth={3} />
              </span>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">Manter conectado</span>
            </label>
            <Link href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-amber-500 text-zinc-950 font-semibold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            "Entrar"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
