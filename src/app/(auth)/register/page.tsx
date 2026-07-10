"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { registerOwnerSchema } from "@/lib/validation";
import { slugify, redirectTo } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { z } from "zod";

type FormValues = z.infer<typeof registerOwnerSchema>;

const STEP_1_FIELDS = ["name", "email", "password", "phone"] as const;

function passwordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "bg-zinc-800" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
  const levels = [
    { label: "Muito fraca", color: "bg-red-500" },
    { label: "Fraca", color: "bg-orange-500" },
    { label: "Razoável", color: "bg-yellow-500" },
    { label: "Forte", color: "bg-emerald-500" },
  ];
  return { score, ...levels[Math.min(score, 3)] };
}

// useSearchParams() opts this page out of static prerendering unless it's
// wrapped in Suspense — without it, `next build` fails to prerender /register.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const selectedPlanParam = searchParams.get("plan")?.toLowerCase() ?? "starter";
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerOwnerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      barbershopName: "",
      barbershopSlug: "",
      city: "",
      cnpj: "",
      plan: selectedPlanParam === "enterprise" ? "white-label" : selectedPlanParam,
    },
  });

  const password = watch("password");
  const barbershopSlug = watch("barbershopSlug");
  const plan = watch("plan");
  const strength = passwordStrength(password ?? "");

  const planOptions = [
    { value: "starter", label: "Starter (R$ 29/mês)", description: "Gestão básica para começar" },
    { value: "pro", label: "Pro (R$ 79/mês)", description: "Mais recursos e automações" },
    { value: "white-label", label: "White Label (R$ 299/mês + 3%)", description: "App própria e branding completo" },
  ];

  const goToStep2 = async () => {
    const valid = await trigger(STEP_1_FIELDS);
    if (valid) setStep(2);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
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
      redirectTo("/dashboard");
    } catch {
      setServerError("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-black text-white mb-1">
        Criar conta grátis
      </h1>
      <p className="text-zinc-500 text-sm mb-1">
        Já tem conta?{" "}
        <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Entrar
        </Link>
      </p>
      <p className="text-zinc-600 text-xs mb-6">
        É cliente e quer agendar horários?{" "}
        <Link href="/register/cliente" className="text-amber-400/80 hover:text-amber-300 font-medium transition-colors">
          Crie sua conta de cliente
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

      {step === 1 && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <GoogleSignInButton
            text="signup_with"
            onSuccess={async (idToken) => {
              setServerError(null);
              setIsLoading(true);
              const response = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
              });
              const data = await response.json();
              if (!response.ok) {
                setServerError(data.error);
                setIsLoading(false);
                return;
              }
              // A brand new Google sign-in always becomes a CLIENT (see
              // /api/auth/google) — an owner still needs to fill in the
              // barbershop form below, Google can't supply that.
              redirectTo(data.user.role === "CLIENT" ? "/" : "/dashboard");
            }}
          />
          <p className="text-[11px] text-zinc-600 text-center mt-2 mb-5">
            Entrar com Google aqui cria uma conta de <strong className="text-zinc-500">cliente</strong>. Para dono de barbearia, preencha o formulário abaixo.
          </p>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">ou preencha seus dados</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Seu nome completo
              </label>
              <input type="text" placeholder="João Silva" {...register("name")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
              {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                E-mail
              </label>
              <input type="email" placeholder="seu@email.com" {...register("email")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
              {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                WhatsApp
              </label>
              <input type="tel" placeholder="(11) 99999-9999" {...register("phone")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
              {errors.phone && <p className="text-xs text-red-400 mt-1.5">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Senha
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" {...register("password")}
                  className="w-full h-12 px-4 pr-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : "bg-zinc-800"}`} />
                  ))}
                  <span className="text-[10px] text-zinc-500 ml-1 whitespace-nowrap">{strength.label}</span>
                </div>
              )}
              {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>}
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
                placeholder="Barbearia do João"
                {...register("barbershopName", {
                  onChange: (e) => {
                    if (!slugEdited) setValue("barbershopSlug", slugify(e.target.value), { shouldValidate: true });
                  },
                })}
                className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
              {errors.barbershopName && <p className="text-xs text-red-400 mt-1.5">{errors.barbershopName.message}</p>}
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
                  placeholder="minha-barbearia"
                  {...register("barbershopSlug", { onChange: () => setSlugEdited(true) })}
                  className="flex-1 h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-r-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
              {errors.barbershopSlug ? (
                <p className="text-xs text-red-400 mt-1.5">{errors.barbershopSlug.message}</p>
              ) : (
                barbershopSlug && (
                  <p className="text-xs text-zinc-600 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" /> cortix.app/{barbershopSlug}
                  </p>
                )
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="São Paulo, SP"
                  {...register("city")}
                  className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                {errors.city && <p className="text-xs text-red-400 mt-1.5">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  CNPJ <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  {...register("cnpj")}
                  className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                {errors.cnpj && <p className="text-xs text-red-400 mt-1.5">{errors.cnpj.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Plano
              </label>
              <div className="grid gap-2">
                {planOptions.map((p) => (
                  <label key={p.value} className="cursor-pointer">
                    <input
                      type="radio"
                      value={p.value}
                      checked={plan === p.value}
                      onChange={() => setValue("plan", p.value)}
                      className="sr-only peer"
                    />
                    <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-left text-xs text-zinc-400 peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-400 transition-all">
                      <div className="font-semibold text-sm text-white">{p.label}</div>
                      <div className="text-zinc-500 mt-1">{p.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <button
          type={step === 1 ? "button" : "submit"}
          onClick={step === 1 ? goToStep2 : undefined}
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

      {serverError && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
          <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{serverError}</p>
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
