"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const selectedPlanParam = searchParams.get("plan")?.toLowerCase() ?? "starter";
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    barbershopName: "",
    barbershopSlug: "",
    city: "",
    plan: selectedPlanParam === "enterprise" ? "white-label" : selectedPlanParam,
  });

  const updateField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const planOptions = [
    { value: "starter", label: "Starter (R$ 29/mês)", description: "Gestão básica para começar" },
    { value: "pro", label: "Pro (R$ 79/mês)", description: "Mais recursos e automações" },
    { value: "white-label", label: "White Label (R$ 299/mês + 3%)", description: "App própria e branding completo" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível criar a conta");
        setIsLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-black text-white mb-1">
        Criar conta grátis
      </h1>
      <p className="text-zinc-500 text-sm mb-6">
        Já tem conta?{" "}
        <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Entrar
        </Link>
      </p>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-7">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 1 ? "text-amber-400" : "text-zinc-600"}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "bg-amber-500 text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}>
            {step > 1 ? "✓" : "1"}
          </div>
          Dados pessoais
        </div>
        <div className="flex-1 h-px bg-zinc-800" />
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 2 ? "text-amber-400" : "text-zinc-600"}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? "bg-amber-500 text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}>
            2
          </div>
          Sua barbearia
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Seu nome completo
              </label>
              <input type="text" required placeholder="João Silva" value={form.name} onChange={updateField("name")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                E-mail
              </label>
              <input type="email" required placeholder="seu@email.com" value={form.email} onChange={updateField("email")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                WhatsApp
              </label>
              <input type="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={updateField("phone")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Senha
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required minLength={8} placeholder="Mínimo 8 caracteres" value={form.password} onChange={updateField("password")}
                  className="w-full h-12 px-4 pr-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
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
                value={form.barbershopName}
                onChange={updateField("barbershopName")}
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
                  value={form.barbershopSlug}
                  onChange={updateField("barbershopSlug")}
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
                value={form.city}
                onChange={updateField("city")}
                className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Plano
              </label>
              <div className="grid gap-2">
                {planOptions.map((plan) => (
                  <label key={plan.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.value}
                      checked={form.plan === plan.value}
                      onChange={() => setForm((prev) => ({ ...prev, plan: plan.value }))}
                      className="sr-only peer"
                    />
                    <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-left text-xs text-zinc-400 peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-400 transition-all">
                      <div className="font-semibold text-sm text-white">{plan.label}</div>
                      <div className="text-zinc-500 mt-1">{plan.description}</div>
                    </div>
                  </label>
                ))}
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

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      )}

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
