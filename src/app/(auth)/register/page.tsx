"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { registerOwnerSchema } from "@/lib/validation";
import { slugify, redirectTo, formatPhoneBR, formatCNPJ } from "@/lib/utils";
import { z } from "zod";

type FormValues = z.infer<typeof registerOwnerSchema>;

const PASSOS = ["Escolha o plano", "Seus dados", "Sua barbearia"] as const;

// Os campos validados ao sair da etapa de dados pessoais.
const CAMPOS_DADOS = ["name", "email", "password", "phone"] as const;

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
    // Nome, e-mail e telefone podem vir preenchidos da landing: lá a pessoa
    // já escolheu o plano e digitou o contato. Pedir de novo o que ela acabou
    // de dar é a forma mais rápida de perder alguém que já disse sim.
    defaultValues: {
      name: searchParams.get("nome") ?? "",
      email: searchParams.get("email") ?? "",
      password: "",
      phone: searchParams.get("telefone") ?? "",
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
    if (step !== 3) return;
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
    { value: "starter", label: "Essencial", price: "R$ 50/mês", description: "Agenda, gorjeta e fidelidade. Até 3 barbeiros." },
    { value: "pro", label: "Pro", price: "R$ 250/mês", description: "Copiloto com IA, financeiro e assinatura" },
    { value: "white-label", label: "White Label", price: "R$ 897/mês", description: "App próprio com a sua marca" },
  ];

  const planoEscolhido = planOptions.find((p) => p.value === plan);

  // Avancar: da etapa do plano nao ha o que validar (sempre ha um escolhido);
  // da etapa de dados, valida antes de deixar seguir.
  const avancar = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    const valido = await trigger(CAMPOS_DADOS);
    if (valido) setStep(3);
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
      <h1 className="text-[28px] font-bold tracking-tight text-white mb-1.5">
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

      {/* Progresso: barras e legenda, em vez de círculos numerados ligados por
          um fio. Barra diz "quanto falta" sem exigir que o leitor interprete
          ícone. */}
      <div className="mb-7">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1 flex-1 rounded-full transition-colors ${step >= n ? "bg-amber-500" : "bg-zinc-800"}`} />
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Etapa {step} de 3 · <span className="text-zinc-300">{PASSOS[step - 1]}</span>
        </p>
      </div>

      {/* O plano escolhido acompanha as etapas seguintes. Quem está preenchendo
          CNPJ já esqueceu o que escolheu três telas atrás — e é justamente o
          que ele está comprando. */}
      {step > 1 && planoEscolhido && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{planoEscolhido.label}</p>
            <p className="text-xs text-zinc-500">{planoEscolhido.price}</p>
          </div>
          <button type="button" onClick={() => setStep(1)} className="shrink-0 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300">
            trocar
          </button>
        </div>
      )}

      {/* O botão do Google saiu daqui de propósito. Uma conta criada por ele
          nasce sempre como CLIENTE (ver /api/auth/google), então o dono que
          clicasse ganhava a conta errada e caía na página inicial sem
          barbearia nenhuma — e ainda tinha que voltar e preencher tudo. Um
          atalho que leva ao lugar errado é pior que não ter atalho. Abrir
          barbearia exige nome, CNPJ e endereço, coisas que o Google não
          fornece; não há atalho real a oferecer aqui. */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 ? (
          /* O plano vem PRIMEIRO porque é decisão de compra, não de cadastro:
             ninguém digita CNPJ sem saber quanto vai pagar. Deixá-lo no fim de
             um formulário longo faz a pessoa descobrir o preço depois de já ter
             investido dez minutos — e é aí que ela desiste. */
          <div className="space-y-2">
            {planOptions.map((p) => {
              const escolhido = plan === p.value;
              return (
                <label key={p.value} className="block cursor-pointer">
                  <input type="radio" value={p.value} checked={escolhido} onChange={() => setValue("plan", p.value)} className="sr-only peer" />
                  <div className={`rounded-xl border p-4 transition-colors ${escolhido ? "border-amber-500 bg-amber-500/[0.07]" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{p.label}</span>
                          {p.value === "pro" && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-200">mais escolhido</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{p.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-white">{p.price}</p>
                        {escolhido && <Check className="ml-auto mt-1 h-4 w-4 text-amber-400" />}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
            <p className="pt-1 text-xs leading-relaxed text-zinc-600">
              Dá para trocar de plano depois, a qualquer momento, sem perder nada.
            </p>
          </div>
        ) : step === 2 ? (
          <>
            <div>
              <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                Seu nome completo
              </label>
              <input type="text" autoComplete="name" placeholder="João Silva" {...register("name")}
                className="w-full h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm" />
              {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                E-mail
              </label>
              <input type="email" autoComplete="email" placeholder="seu@email.com" {...register("email")}
                className="w-full h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm" />
              {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                WhatsApp
              </label>
              <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="(11) 99999-9999"
                {...register("phone", { onChange: (e) => setValue("phone", formatPhoneBR(e.target.value)) })}
                className="w-full h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm" />
              {errors.phone && <p className="text-xs text-red-400 mt-1.5">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Crie uma senha forte" {...register("password")}
                  className="w-full h-11 px-3.5 pr-11 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm" />
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

            <div>
              <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
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
                className="w-full h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm"
              />
              {errors.barbershopName && <p className="text-xs text-red-400 mt-1.5">{errors.barbershopName.message}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                Link de agendamento
              </label>
              <div className="flex items-center">
                <span className="h-11 px-3 bg-zinc-900 border border-zinc-800 border-r-0 rounded-l-xl text-zinc-500 text-xs flex items-center whitespace-nowrap">
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
                  className="flex-1 min-w-0 h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-r-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm"
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
                  <X className="w-3 h-3" /> Esse link já está em uso. Tente outro
                </p>
              ) : (
                barbershopSlug && (
                  <p className="text-xs text-zinc-600 mt-1.5">Use apenas letras minúsculas, números e hífen (mín. 3 caracteres)</p>
                )
              )}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="São Paulo"
                  {...register("city")}
                  className="w-full h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm"
                />
                {errors.city && <p className="text-xs text-red-400 mt-1.5">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                  UF
                </label>
                <select
                  {...register("state")}
                  className="h-12 w-20 px-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm appearance-none text-center"
                >
                  <option value="">UF</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
                {errors.state && <p className="text-xs text-red-400 mt-1.5">{errors.state.message}</p>}
              </div>
            </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">
                  CNPJ <span className="text-amber-400/80 normal-case font-normal">(obrigatório)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  {...register("cnpj", { onChange: (e) => setValue("cnpj", formatCNPJ(e.target.value)) })}
                  className="w-full h-11 px-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 transition-colors text-sm"
                />
                {errors.cnpj && <p className="text-xs text-red-400 mt-1.5">{errors.cnpj.message}</p>}
              </div>
          </>
        )}

        <button
          type={step === 3 ? "submit" : "button"}
          onClick={step === 3 ? undefined : avancar}
          disabled={isLoading || (step === 3 && slugStatus === "taken")}
          className="w-full h-12 bg-amber-500 text-zinc-950 font-semibold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:hover:bg-amber-500 flex items-center justify-center gap-2 text-sm"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : step === 1 ? (
            `Continuar com o ${planoEscolhido?.label ?? "plano"}`
          ) : step === 2 ? (
            "Continuar"
          ) : (
            "Criar minha barbearia"
          )}
        </button>

        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
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
