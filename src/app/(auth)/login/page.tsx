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
  const [notice, setNotice] = useState<string | null>(null);

  // Only a 2FA-enabled account (opt-in, SUPER_ADMIN only today) ever reaches
  // this second step, everyone else's login completes in one round trip.
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
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-ouro/25 bg-ouro/10">
          <ShieldCheck className="h-6 w-6 text-ouro" aria-hidden="true" />
        </span>
        <h1 className="tipo-titulo text-4xl text-neve">
          Verificação em duas etapas
        </h1>
        <p className="mt-3 text-sm text-cinza">
          Digite o código de 6 dígitos do seu aplicativo autenticador.
        </p>

        <form onSubmit={handleVerifyCode} className="mt-7 space-y-4">
          <div>
            <label htmlFor="codigo-2fa" className="mb-1.5 block text-[13px] font-semibold text-neve/80">
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
              className="h-14 w-full rounded-2xl border border-traco-forte bg-grafite px-4 text-center font-mono text-2xl tracking-[0.4em] text-neve placeholder:text-cinza/30 transition-colors focus:border-ouro focus:outline-none"
            />
          </div>

          <Erro mensagem={error} />

          <button
            type="submit"
            disabled={isLoading || code.length < 6}
            aria-busy={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ouro text-sm font-bold text-preto transition-colors hover:bg-ouro-claro disabled:opacity-50"
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
            className="w-full text-xs text-cinza transition-colors hover:text-neve"
          >
            Voltar para o login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="tipo-titulo text-4xl text-neve">
        Bem-vindo de volta
      </h1>
      {/* Cliente não cria conta por aqui. Esta é a entrada do gestor; a conta
          do cliente nasce no app da barbearia dele, junto com o primeiro
          agendamento e já ligada a alguém. Conta de cliente criada solta no
          site não tem barbearia, não tem agenda e não leva a lugar nenhum. */}
      <p className="mt-3 text-sm text-cinza">
        É dono de barbearia e não tem conta?{" "}
        <Link href="/register" className="font-semibold text-ouro transition-colors hover:text-ouro-claro">
          Criar a minha conta
        </Link>
      </p>

      {/* Entrada social, o mesmo par do app: Google e Apple. Sempre visível.
          O Google usa o fluxo oficial quando a chave (NEXT_PUBLIC_GOOGLE_CLIENT_ID)
          está configurada; sem ela, cai num botão-espelho que avisa em vez de
          renderizar nada. O Apple ainda não está ligado (nem no app), então
          avisa também. */}
      <div className="mt-7 space-y-2.5">
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
          <GoogleSignInButton onSuccess={handleGoogleSuccess} text="signin_with" />
        ) : (
          <button
            type="button"
            onClick={() => setNotice("Login com Google chega em breve. Por enquanto, use seu e-mail.")}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-neve text-sm font-semibold text-preto transition-opacity hover:opacity-90"
          >
            <GoogleIcon className="h-[18px] w-[18px]" />
            Continuar com Google
          </button>
        )}
        <button
          type="button"
          onClick={() => setNotice("Login com Apple chega em breve. Por enquanto, use seu e-mail.")}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-traco-forte bg-grafite text-sm font-semibold text-neve transition-colors hover:bg-traco-forte"
        >
          <AppleIcon className="h-[18px] w-[18px]" />
          Continuar com Apple
        </button>
      </div>
      {notice && (
        <p className="mt-3 rounded-xl border border-traco-forte bg-grafite/60 p-3 text-center text-xs text-cinza">
          {notice}
        </p>
      )}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-traco-forte" />
        <span className="text-[11px] font-semibold tipo-etiqueta text-cinza-fraco">
          ou entre com e-mail
        </span>
        <span className="h-px flex-1 bg-traco-forte" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-neve/80">
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
            className="h-12 w-full rounded-xl border border-traco-forte bg-grafite/70 px-3.5 text-sm text-neve placeholder:text-cinza/40 transition-colors focus:border-ouro focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="senha" className="mb-1.5 block text-[13px] font-semibold text-neve/80">
            Senha
          </label>
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
              className="h-12 w-full rounded-xl border border-traco-forte bg-grafite/70 pl-3.5 pr-12 text-sm text-neve placeholder:text-cinza/40 transition-colors focus:border-ouro focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-cinza transition-colors hover:bg-traco-forte hover:text-neve"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-xs text-ouro transition-colors hover:text-ouro-claro">
              Esqueceu a senha?
            </Link>
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ouro text-sm font-bold text-preto transition-colors hover:bg-ouro-claro disabled:opacity-50"
        >
          {isLoading ? <Girando /> : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// O erro fica entre os campos e o botão, no caminho do olho de quem acabou de
// clicar e voltou. `role="alert"` porque leitor de tela não vê texto vermelho
// aparecer, precisa ouvir.
function Erro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/15 p-3 text-center text-xs text-neve">
      {mensagem}
    </p>
  );
}

// O spinner antigo era branco num botão branco: invisível justamente no
// momento em que serve para dizer "estou trabalhando".
function Girando() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-preto border-t-transparent" aria-hidden="true" />;
}

// O "G" colorido oficial do Google, para o botão-espelho (quando a chave não
// está configurada e o botão do próprio Google não renderiza).
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// A maçã da Apple, desenhada, mesma marca do botão do app. Herda a cor do
// texto (currentColor), então acompanha o tema do botão sem arquivo à parte.
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM262.1 104.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
