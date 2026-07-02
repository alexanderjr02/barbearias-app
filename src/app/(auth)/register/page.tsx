"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  };

  return (
    <div>
      <h1 className="text-3xl font-black text-white mb-2">
        Criar conta grátis
      </h1>
      <p className="text-zinc-400 mb-2">
        Já tem conta?{" "}
        <Link href="/login" className="text-amber-400 hover:underline">
          Entrar
        </Link>
      </p>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 1 ? "text-amber-400" : "text-zinc-600"}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 1 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-500"}`}>
            1
          </div>
          Dados pessoais
        </div>
        <div className="flex-1 h-px bg-zinc-800" />
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 2 ? "text-amber-400" : "text-zinc-600"}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 2 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-500"}`}>
            2
          </div>
          Sua barbearia
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 1 ? (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Seu nome completo
              </label>
              <input
                type="text"
                required
                placeholder="João Silva"
                className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="w-full h-11 px-4 pr-11 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nome da barbearia
              </label>
              <input
                type="text"
                required
                placeholder="Barbearia do João"
                className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Link personalizado
              </label>
              <div className="flex items-center gap-0">
                <span className="h-11 px-3 bg-zinc-700 border border-zinc-600 border-r-0 rounded-l-xl text-zinc-400 text-sm flex items-center">
                  cortix.app/
                </span>
                <input
                  type="text"
                  required
                  placeholder="minha-barbearia"
                  className="flex-1 h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-r-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Cidade
              </label>
              <input
                type="text"
                placeholder="São Paulo, SP"
                className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Plano
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Starter (Grátis)", "Pro (R$ 97)", "Enterprise (R$ 197)"].map(
                  (plan, i) => (
                    <label key={plan} className="cursor-pointer">
                      <input
                        type="radio"
                        name="plan"
                        defaultChecked={i === 0}
                        className="sr-only peer"
                      />
                      <div className="text-center p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-400 peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-400 transition-all">
                        {plan}
                      </div>
                    </label>
                  )
                )}
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-base"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : step === 1 ? (
            "Continuar →"
          ) : (
            "Criar minha conta"
          )}
        </button>

        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Voltar
          </button>
        )}
      </form>

      <p className="mt-6 text-xs text-zinc-600 text-center">
        Ao criar uma conta, você concorda com nossos{" "}
        <a href="#" className="text-zinc-500 hover:underline">
          Termos de Uso
        </a>{" "}
        e{" "}
        <a href="#" className="text-zinc-500 hover:underline">
          Política de Privacidade
        </a>
      </p>
    </div>
  );
}
