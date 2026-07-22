"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, X } from "lucide-react";
import { registerClientSchema } from "@/lib/validation";
import { redirectTo, formatPhoneBR } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { DatePicker } from "@/components/ui/DatePicker";

export default function RegisterClientPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerClientSchema),
    defaultValues: { name: "", email: "", password: "", phone: "", dateOfBirth: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        setServerError(data.error ?? "Não foi possível criar a conta");
        setIsLoading(false);
        return;
      }
      redirectTo("/");
    } catch {
      setServerError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  });

  const handleGoogleSuccess = async (idToken: string) => {
    setServerError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setServerError(data.error ?? "Não foi possível entrar com o Google");
        setIsLoading(false);
        return;
      }
      redirectTo("/");
    } catch {
      setServerError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  // Teto no dia de hoje — ninguém nasce no futuro. O calendário desabilita as
  // datas acima disso em vez de deixar escolher e reclamar depois.
  const maxDob = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-black text-white mb-1">Criar conta de cliente</h1>
      <p className="text-zinc-500 text-sm mb-1">
        Já tem conta?{" "}
        <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Entrar
        </Link>
      </p>
      <p className="text-zinc-600 text-xs mb-6">
        É dono de barbearia?{" "}
        <Link href="/register" className="text-amber-400/80 hover:text-amber-300 font-medium transition-colors">
          Cadastre sua barbearia
        </Link>
      </p>

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <GoogleSignInButton text="signup_with" onSuccess={handleGoogleSuccess} />
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">ou preencha seus dados</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Nome completo</label>
          <input type="text" placeholder="Maria Souza" {...register("name")}
            className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
          {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">E-mail</label>
          <input type="email" placeholder="seu@email.com" {...register("email")}
            className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
          {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">WhatsApp</label>
            <input type="tel" inputMode="numeric" placeholder="(11) 99999-9999"
              {...register("phone", { onChange: (e) => setValue("phone", formatPhoneBR(e.target.value)) })}
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
            {errors.phone && <p className="text-xs text-red-400 mt-1.5">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Nascimento</label>
            {/* O react-hook-form não enxerga um componente próprio como enxerga
                um <input>, então o valor é empurrado com setValue. O
                shouldValidate limpa o erro na hora em que a data é escolhida,
                em vez de deixar a mensagem vermelha na tela até o envio. */}
            <DatePicker
              value={watch("dateOfBirth") ?? ""}
              onChange={(v) => setValue("dateOfBirth", v, { shouldValidate: true })}
              max={maxDob}
              placeholder="Escolher data"
              className="h-12 rounded-2xl bg-zinc-900"
            />
            {errors.dateOfBirth && <p className="text-xs text-red-400 mt-1.5">{errors.dateOfBirth.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Senha</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" {...register("password")}
              className="w-full h-12 px-4 pr-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-base"
        >
          {isLoading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : "Criar minha conta"}
        </button>
      </form>

      {serverError && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
          <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{serverError}</p>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-600 text-center">
        Ao criar uma conta, você concorda com nossos{" "}
        <Link href="/termos" className="text-zinc-500 hover:underline">Termos de Uso</Link>{" "}
        e{" "}
        <Link href="/privacidade" className="text-zinc-500 hover:underline">Política de Privacidade</Link>
      </p>
    </div>
  );
}
