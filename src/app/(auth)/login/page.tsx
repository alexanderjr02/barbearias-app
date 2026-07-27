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
      <div className="w-full">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-latao/25 bg-latao/10">
          <ShieldCheck className="h-6 w-6 text-latao" aria-hidden="true" />
        </span>
        <h1 className="font-display text-4xl font-bold uppercase leading-none text-porcelana">
          Verificação em duas etapas
        </h1>
        <p className="mt-3 text-sm text-fumaca">
          Digite o código de 6 dígitos do seu aplicativo autenticador.
        </p>

        <form onSubmit={handleVerifyCode} className="mt-7 space-y-4">
          <div>
            <label htmlFor="codigo-2fa" className="mb-1.5 block text-[13px] font-semibold text-porcelana/80">
              Código
            </label>
            <input
              id="codigo-2fa"
              name="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="h-14 w-full rounded-2xl border border-breu-3 bg-breu-2 px-4 text-center font-mono text-2xl tracking-[0.4em] text-porcelana placeholder:text-fumaca/30 transition-colors focus:border-latao focus:outline-none"
            />
          </div>

          <Erro mensagem={error} />

          <button
            type="submit"
            disabled={isLoading || code.length < 6}
            aria-busy={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-latao text-sm font-bold uppercase tracking-wider text-breu transition-colors hover:bg-latao-claro disabled:opacity-50"
          >
            {isLoading ? <Girando /> : "Verificar"}
          </button>

          <button
            type="button"
            onClick={() => {
              setPendingToken(null);
              setCode("");
              setError(null);
            }}
            className="w-full text-xs text-fumaca transition-colors hover:text-porcelana"
          >
            Voltar para o login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="font-display text-4xl font-bold uppercase leading-none text-porcelana">
        Bem-vindo de volta
      </h1>
      {/* Cliente não cria conta por aqui. Esta é a entrada do gestor; a conta
          do cliente nasce no app da barbearia dele, junto com o primeiro
          agendamento e já ligada a alguém. Conta de cliente criada solta no
          site não tem barbearia, não tem agenda e não leva a lugar nenhum. */}
      <p className="mt-3 text-sm text-fumaca">
        É dono de barbearia e não tem conta?{" "}
        <Link href="/register" className="font-semibold text-latao transition-colors hover:text-latao-claro">
          Criar a minha conta
        </Link>
      </p>

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <div className="mt-7">
            <GoogleSignInButton onSuccess={handleGoogleSuccess} text="signin_with" />
          </div>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-breu-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fumaca/60">
              ou entre com e-mail
            </span>
            <span className="h-px flex-1 bg-breu-3" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "" : "mt-7"}`}>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-porcelana/80">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="h-12 w-full rounded-xl border border-breu-3 bg-breu-2/70 px-3.5 text-sm text-porcelana placeholder:text-fumaca/40 transition-colors focus:border-latao focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-4">
            <label htmlFor="senha" className="text-[13px] font-semibold text-porcelana/80">
              Senha
            </label>
            <Link href="/forgot-password" className="text-xs text-latao transition-colors hover:text-latao-claro">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <input
              id="senha"
              name="senha"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 w-full rounded-xl border border-breu-3 bg-breu-2/70 pl-3.5 pr-12 text-sm text-porcelana placeholder:text-fumaca/40 transition-colors focus:border-latao focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-fumaca transition-colors hover:bg-breu-3 hover:text-porcelana"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Saiu daqui um "Manter conectado" que era só desenho: sem `name`, sem
            estado e nunca enviado. A sessão já é longa por padrão (o refresh
            token vive bem mais que o de acesso, ver src/lib/sessionCookies.ts),
            então a caixa prometia escolha onde não havia nenhuma. */}

        <Erro mensagem={error} />

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-latao text-sm font-bold uppercase tracking-wider text-breu transition-colors hover:bg-latao-claro disabled:opacity-50"
        >
          {isLoading ? <Girando /> : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// O erro fica entre os campos e o botão, no caminho do olho de quem acabou de
// clicar e voltou. `role="alert"` porque leitor de tela não vê texto vermelho
// aparecer — precisa ouvir.
function Erro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="rounded-xl border border-vinho/50 bg-vinho/15 p-3 text-center text-xs text-porcelana">
      {mensagem}
    </p>
  );
}

// O spinner antigo era branco num botão branco: invisível justamente no
// momento em que serve para dizer "estou trabalhando".
function Girando() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-breu border-t-transparent" aria-hidden="true" />;
}
