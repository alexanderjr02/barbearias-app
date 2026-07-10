"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
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
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-5">
          <ShieldCheck className="w-6 h-6 text-purple-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-1">Verificação em duas etapas</h1>
        <p className="text-zinc-500 text-sm mb-8">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Código</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full h-14 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/60 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length < 6}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-500/20"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Verificar →"}
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
      <h1 className="text-3xl font-black text-white mb-1">Entrar na conta</h1>
      <p className="text-zinc-500 text-sm mb-1">
        É dono de barbearia e não tem conta?{" "}
        <Link href="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Cadastre-se grátis
        </Link>
      </p>
      <p className="text-zinc-600 text-xs mb-8">
        É cliente?{" "}
        <Link href="/register/cliente" className="text-amber-400/80 hover:text-amber-300 font-medium transition-colors">
          Crie sua conta de cliente
        </Link>
      </p>

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
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 px-4 pr-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
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
          <div className="flex justify-end mt-2">
            <a href="#" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
              Esqueceu a senha?
            </a>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-900 font-bold rounded-2xl hover:from-amber-400 hover:to-amber-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20 mt-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            "Entrar na conta →"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl">
        <p className="text-xs text-zinc-500 text-center">
          <span className="text-amber-400 font-semibold">Demo:</span> demo@cortix.app / demo123456
        </p>
      </div>
    </div>
  );
}
