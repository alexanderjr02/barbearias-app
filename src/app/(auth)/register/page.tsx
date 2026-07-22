"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Check, X, MapPin, Sparkles, AtSign, Loader2 } from "lucide-react";
import { registerOwnerSchema } from "@/lib/validation";
import { slugify, redirectTo, formatPhoneBR, formatCNPJ, formatCEP, getInitials } from "@/lib/utils";
import { z } from "zod";

type FormValues = z.infer<typeof registerOwnerSchema>;

const STEP_1_FIELDS = ["name", "email", "password", "phone"] as const;

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const PASSWORD_RULES = [
  { label: "8+ caracteres", test: (p: string) => p.length >= 8 },
  { label: "Uma letra", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "Um número", test: (p: string) => /[0-9]/.test(p) },
] as const;

function passwordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: -1, label: "", color: "bg-zinc-800" };
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

// O endereco de agendamento sai do dominio em que a pagina esta rodando.
// Estava escrito "cortix.app/" fixo no codigo — um dominio que NAO EXISTE
// (o DNS nao resolve). Toda barbearia que se cadastrou leu, no proprio
// cadastro, uma promessa de endereco falso. Derivar do runtime faz isso
// acompanhar producao, preview e desenvolvimento sem ninguem lembrar de
// atualizar.
function baseDeAgendamento(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.host}/booking/`;
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const selectedPlanParam = searchParams.get("plan")?.toLowerCase() ?? "starter";
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

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
      state: "",
      address: "",
      zipCode: "",
      whatsapp: "",
      instagram: "",
      cnpj: "",
      plan: selectedPlanParam === "enterprise" ? "white-label" : selectedPlanParam,
    },
  });

  const password = watch("password") ?? "";
  const barbershopSlug = watch("barbershopSlug");
  const barbershopName = watch("barbershopName");
  const city = watch("city");
  const state = watch("state");
  const plan = watch("plan");
  const strength = passwordStrength(password);

  // Live availability check for the booking link — debounced so we don't hit
  // the server on every keystroke. Only fires on a well-formed slug; a stale
  // in-flight request is aborted when the value changes again.
  useEffect(() => {
    if (step !== 2) return;
    const s = (barbershopSlug ?? "").trim();
    if (!s) {
      setSlugStatus("idle");
      return;
    }
    if (s.length < 3 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(s)}`, { signal: controller.signal });
        const data = await res.json();
        setSlugStatus(data.available ? "available" : data.valid ? "taken" : "invalid");
      } catch {
        // Aborted (value changed) or offline — leave the last state; submit
        // still validates server-side as the source of truth.
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [barbershopSlug, step]);

  const planOptions = [
    { value: "starter", label: "Essencial", price: "R$ 50/mês", description: "Agenda, gorjeta e fidelidade — até 3 barbeiros" },
    { value: "pro", label: "Pro", price: "R$ 250/mês", description: "Copiloto com IA, financeiro e assinatura" },
    { value: "white-label", label: "White Label", price: "R$ 897/mês", description: "App próprio com a sua marca" },
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
      {/* Não convidamos cliente a criar conta aqui. Conta de cliente sem
          barbearia não leva a lugar nenhum: ele se cadastra, cai na página
          inicial e não tem o que fazer. Quem agenda chega pelo link da
          barbearia — é lá que a conta dele nasce junto com o agendamento,
          já ligada a alguém. */}
      <div className="mb-6" />

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

      {/* O botão do Google saiu daqui de propósito. Uma conta criada por ele
          nasce sempre como CLIENTE (ver /api/auth/google), então o dono que
          clicasse ganhava a conta errada e caía na página inicial sem
          barbearia nenhuma — e ainda tinha que voltar e preencher tudo. Um
          atalho que leva ao lugar errado é pior que não ter atalho. Abrir
          barbearia exige nome, CNPJ e endereço, coisas que o Google não
          fornece; não há atalho real a oferecer aqui. */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Seu nome completo
              </label>
              <input type="text" autoComplete="name" placeholder="João Silva" {...register("name")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
              {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                E-mail
              </label>
              <input type="email" autoComplete="email" placeholder="seu@email.com" {...register("email")}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
              {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                WhatsApp
              </label>
              <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="(11) 99999-9999"
                {...register("phone", { onChange: (e) => setValue("phone", formatPhoneBR(e.target.value)) })}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
              {errors.phone && <p className="text-xs text-red-400 mt-1.5">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Senha
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Crie uma senha forte" {...register("password")}
                  className="w-full h-12 px-4 pr-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <>
                  <div className="mt-2 flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : "bg-zinc-800"}`} />
                    ))}
                    <span className="text-[10px] text-zinc-500 ml-1 whitespace-nowrap">{strength.label}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const ok = rule.test(password);
                      return (
                        <span key={rule.label} className={`inline-flex items-center gap-1 text-[11px] transition-colors ${ok ? "text-emerald-400" : "text-zinc-600"}`}>
                          {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {rule.label}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
              {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>}
            </div>
          </>
        ) : (
          <>
            {/* Live preview — the barbershop's public page taking shape as you type */}
            <LivePreview name={barbershopName} slug={barbershopSlug} city={city} state={state} />

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
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
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
              />
              {errors.barbershopName && <p className="text-xs text-red-400 mt-1.5">{errors.barbershopName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Link de agendamento
              </label>
              <div className="flex items-center">
                <span className="h-12 px-3 bg-zinc-800/80 border border-zinc-700 border-r-0 rounded-l-2xl text-zinc-400 text-sm flex items-center whitespace-nowrap">
                  {baseDeAgendamento()}
                </span>
                <input
                  type="text"
                  placeholder="minha-barbearia"
                  {...register("barbershopSlug", {
                    onChange: (e) => {
                      setSlugEdited(true);
                      setValue("barbershopSlug", slugify(e.target.value));
                    },
                  })}
                  className="flex-1 min-w-0 h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-r-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                />
              </div>
              {errors.barbershopSlug ? (
                <p className="text-xs text-red-400 mt-1.5">{errors.barbershopSlug.message}</p>
              ) : slugStatus === "checking" ? (
                <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Verificando disponibilidade…
                </p>
              ) : slugStatus === "available" ? (
                <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Disponível! Seus clientes agendam em {baseDeAgendamento()}{barbershopSlug}
                </p>
              ) : slugStatus === "taken" ? (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <X className="w-3 h-3" /> Esse link já está em uso — tente outro
                </p>
              ) : (
                barbershopSlug && (
                  <p className="text-xs text-zinc-600 mt-1.5">Use apenas letras minúsculas, números e hífen (mín. 3 caracteres)</p>
                )
              )}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="São Paulo"
                  {...register("city")}
                  className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                />
                {errors.city && <p className="text-xs text-red-400 mt-1.5">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  UF
                </label>
                <select
                  {...register("state")}
                  className="h-12 w-20 px-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm appearance-none text-center"
                >
                  <option value="">—</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
                {errors.state && <p className="text-xs text-red-400 mt-1.5">{errors.state.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  CEP <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00000-000"
                  {...register("zipCode", { onChange: (e) => setValue("zipCode", formatCEP(e.target.value)) })}
                  className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                />
                {errors.zipCode && <p className="text-xs text-red-400 mt-1.5">{errors.zipCode.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  Endereço <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro"
                  {...register("address")}
                  className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                />
                {errors.address && <p className="text-xs text-red-400 mt-1.5">{errors.address.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  Instagram <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="suabarbearia"
                    {...register("instagram")}
                    className="w-full h-12 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                  />
                </div>
                {errors.instagram && <p className="text-xs text-red-400 mt-1.5">{errors.instagram.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  CNPJ <span className="text-amber-400/80 normal-case font-normal">(obrigatório)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  {...register("cnpj", { onChange: (e) => setValue("cnpj", formatCNPJ(e.target.value)) })}
                  className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                />
                {errors.cnpj && <p className="text-xs text-red-400 mt-1.5">{errors.cnpj.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
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
                    <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-left transition-all peer-checked:border-amber-500 peer-checked:bg-amber-500/10">
                      <div>
                        <div className="font-semibold text-sm text-white">{p.label}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{p.description}</div>
                      </div>
                      <div className="text-xs font-bold text-amber-400 whitespace-nowrap ml-3">{p.price}</div>
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
          disabled={isLoading || (step === 2 && slugStatus === "taken")}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-2xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : step === 1 ? (
            "Continuar →"
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Colocar minha barbearia no ar
            </>
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
        <Link href="/termos" className="text-zinc-500 hover:underline">
          Termos de Uso
        </Link>{" "}
        e{" "}
        <Link href="/privacidade" className="text-zinc-500 hover:underline">
          Política de Privacidade
        </Link>
      </p>
    </div>
  );
}

/**
 * Prévia da página pública de agendamento.
 *
 * Ela foi reescrita para ESPELHAR a tela real (booking/[slug]/BookingWizard).
 * A versão anterior mostrava coisas que não existem lá: cinco estrelas
 * douradas, um selo verde "Aberto" e um endereço em `cortix.app` — domínio que
 * nem resolve. Prévia que promete o que o produto não entrega não é vitrine, é
 * pegadinha: o dono se cadastra esperando uma coisa e abre o link achando que
 * quebrou.
 *
 * O que a tela real tem, e agora a prévia também: foto de capa, logo quadrada
 * na cor da marca com as iniciais, nome, cidade, e a primeira etapa do
 * agendamento — escolher o serviço.
 */
function LivePreview({ name, slug, city, state }: { name?: string; slug?: string; city?: string; state?: string }) {
  const displayName = name?.trim() || "Sua Barbearia";
  const hasName = Boolean(name?.trim());
  const location = [city?.trim(), state?.trim()].filter(Boolean).join(", ");

  return (
    <div className="mb-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2.5 flex items-center gap-1.5 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sua página de agendamento</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        {/* Capa: a mesma imagem padrão que a página real usa enquanto a
            barbearia não envia a dela. */}
        <div className="relative h-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/shop-interior.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-zinc-950/55" />
        </div>

        <div className="px-4 pb-3">
          {/* Logo sobreposta à capa, como na tela real. */}
          <div className="-mt-6 flex items-end gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-base font-black text-zinc-950 ring-4 ring-zinc-950">
              {hasName ? getInitials(displayName) : "✂"}
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <p className={`truncate text-sm font-black ${hasName ? "text-white" : "text-zinc-600"}`}>{displayName}</p>
              {location && (
                <p className="flex items-center gap-1 truncate text-[10px] text-zinc-400">
                  <MapPin className="h-2.5 w-2.5 shrink-0" /> {location}
                </p>
              )}
            </div>
          </div>

          {/* Primeira etapa real do agendamento: escolher o serviço. */}
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Escolha o serviço</p>
          <div className="mt-1.5 space-y-1.5">
            {["Corte", "Corte + Barba"].map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg border border-zinc-800 px-2.5 py-1.5">
                <span className="text-[11px] text-zinc-300">{s}</span>
                <span className="text-[10px] text-zinc-600">a definir</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
            Os serviços e preços que você cadastrar depois aparecem aqui.
          </p>
        </div>
      </div>

      <p className="mt-2 truncate px-1 text-center text-[10px] text-zinc-600">
        {baseDeAgendamento()}<span className="text-zinc-400">{slug || "sua-barbearia"}</span>
      </p>
    </div>
  );
}
