import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { LandingChatbot } from "@/components/chatbot/LandingChatbot";
import { Reveal } from "@/components/marketing/Reveal";
import {
  Calendar,
  BarChart3,
  Users,
  Package,
  MessageSquareText,
  Palette,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Scissors,
  TrendingUp,
  Clock,
  Smartphone,
  Star,
  CalendarCheck,
  BellRing,
  X,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agendamento online 24/7",
    description:
      "Sua página de agendamento aberta o tempo todo. O cliente escolhe serviço, barbeiro e horário sozinho — sem trocar mil mensagens.",
    color: "from-amber-500 to-yellow-500",
  },
  {
    icon: BellRing,
    title: "Lembrete no WhatsApp",
    description:
      "Confirmação e lembrete automáticos derrubam as faltas. Menos cadeira vazia, menos prejuízo no fim do dia.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: BarChart3,
    title: "Financeiro sob controle",
    description:
      "Receitas, despesas, comissão por barbeiro e relatórios em tempo real. Você sabe exatamente quanto entrou e quanto sobrou.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "Clientes fiéis",
    description:
      "Histórico, preferências, aniversário e programa de pontos. Traga o cliente de volta sem depender da sorte.",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Package,
    title: "Estoque no ponto",
    description:
      "Controle de produtos com alerta de estoque mínimo. Nunca mais fique sem pomada no meio do corte.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Palette,
    title: "A cara da sua marca",
    description:
      "Sua logo, suas cores e um link só seu. Uma página de agendamento com a identidade da sua barbearia, não a de um sistema genérico.",
    color: "from-pink-500 to-rose-500",
  },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 50",
    period: "/mês",
    description: "Pra começar a organizar hoje",
    color: "border-zinc-700",
    features: [
      "Agendamento online 24/7",
      "Link de agendamento próprio",
      "Cadastro de clientes",
      "Fila de espera",
      "Avaliações dos clientes",
      "Caixa do dia (fechamento)",
      "Até 3 barbeiros",
    ],
    cta: "Começar com Starter",
    href: "/register?plan=starter",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 250",
    period: "/mês",
    description: "Pra barbearia que quer crescer",
    color: "border-amber-500",
    badge: "Mais popular",
    features: [
      "Tudo do Starter",
      "Barbeiros e agendamentos ilimitados",
      "Financeiro completo: meta, ponto de equilíbrio e comissões",
      "Relatórios detalhados",
      "Controle de estoque",
      "Fidelidade (pontos/cashback)",
      "Clube de assinatura (cobrança recorrente)",
      "Chatbot com IA que agenda pelo chat",
      "Lembrete no WhatsApp",
      "Suporte prioritário",
    ],
    cta: "Testar 14 dias grátis",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "White Label",
    price: "R$ 897",
    period: "/mês",
    description: "Pra rede e marca própria",
    color: "border-fuchsia-500",
    features: [
      "Tudo do Pro",
      "App próprio com a sua marca (logo, cores e fundo)",
      "No ar hoje — o cliente instala pelo link, sem esperar aprovação de loja",
      "Painel da rede: compare suas unidades lado a lado",
      "Copiloto de rede: sabe qual loja está puxando o faturamento pra baixo",
      "Multi-unidade / rede — R$ 149 por unidade adicional",
      "Marca 100% sua, sem CORTIX",
      "Nota fiscal automática (NFS-e)",
      "Barbeiros ilimitados",
      "Atendimento dedicado",
    ],
    cta: "Quero o White Label",
    href: "/register?plan=white-label",
    highlight: false,
  },
];

const stats = [
  { icon: Clock, value: "24/7", label: "agendamento online" },
  { icon: BellRing, value: "WhatsApp", label: "lembrete automático" },
  { icon: Shield, value: "0%", label: "taxa de adesão" },
  { icon: Zap, value: "Hoje", label: "sua página no ar" },
];

const pains = [
  "Cliente chama no direct de madrugada e você só vê de manhã — quando ele já marcou no concorrente.",
  "Falta sem avisar deixa a cadeira vazia e o caixa no vermelho.",
  "Agenda no caderno e no WhatsApp vira bagunça, horário batido e cliente irritado.",
];

const gains = [
  "Página de agendamento própria, aberta 24 horas.",
  "Confirmação e lembrete automáticos no WhatsApp — menos faltas.",
  "Agenda por barbeiro, sem choque de horário, tudo num lugar.",
];

const steps = [
  { step: "1", icon: Scissors, title: "Crie sua conta", desc: "Cadastre a barbearia em 2 minutos. Sem cartão de crédito." },
  { step: "2", icon: Palette, title: "Personalize", desc: "Coloque logo, cores, serviços e horários da sua equipe." },
  { step: "3", icon: Smartphone, title: "Compartilhe o link", desc: "Divulgue no Instagram e no WhatsApp. Pronto pra receber." },
  { step: "4", icon: TrendingUp, title: "Cresça", desc: "Acompanhe resultados e deixe o sistema trabalhar por você." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <MarketingNav />

      {/* ================= HERO ================= */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Zap className="w-4 h-4" />
              Sistema completo para barbearias
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-[3.7rem] font-extrabold text-white leading-[1.05] mb-6">
              Sua barbearia lotada,
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent text-shimmer">
                sem mexer na agenda.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Agendamento online 24/7, lembrete no WhatsApp que derruba as faltas
              e financeiro completo — num sistema com a identidade da sua barbearia.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-6">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold px-8 py-4 rounded-xl hover:shadow-2xl hover:shadow-amber-500/30 transition-all text-lg hover:-translate-y-0.5"
              >
                Criar conta grátis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/booking/demo"
                className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-200 font-semibold px-8 py-4 rounded-xl hover:bg-white/5 hover:border-zinc-500 transition-all text-lg"
              >
                Ver demonstração
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> No ar hoje</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Cancele quando quiser</span>
            </div>
          </div>

          {/* Hero image + floating cards */}
          <Reveal delay={120} className="relative">
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-black/60 aspect-[4/5] sm:aspect-[5/5] max-w-md mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/barba-scissors.jpg" alt="Barbeiro fazendo a barba de um cliente" className="w-full h-full object-cover kenburns" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>

            {/* Floating "novo agendamento" card */}
            <div className="absolute -left-4 sm:-left-8 top-10 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl w-[200px]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Novo agendamento</p>
                  <p className="text-[11px] text-zinc-500">Corte + Barba · 14:30</p>
                </div>
              </div>
            </div>

            {/* Floating rating card */}
            <div className="absolute -right-2 sm:-right-6 bottom-8 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl">
              <div className="flex items-center gap-1 mb-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs font-bold text-white">Agenda cheia</p>
              <p className="text-[11px] text-zinc-500">e cliente voltando</p>
            </div>
          </Reveal>
        </div>

        {/* Stats strip */}
        <Reveal className="relative max-w-5xl mx-auto mt-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm text-center">
                <s.icon className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-black text-white font-display">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ================= PROBLEM → SOLUTION ================= */}
      <section className="py-20 px-4 bg-zinc-950">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/fade-cut.jpg" alt="Barbeiro fazendo um degradê" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/20 to-transparent" />
            </div>
          </Reveal>

          <Reveal delay={100} className="order-1 lg:order-2">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
              Pare de perder cliente no{" "}
              <span className="text-amber-400">&quot;chama no direct&quot;</span>
            </h2>
            <div className="space-y-3 mb-8">
              {pains.map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400/80 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-400 text-[15px] leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
            <div className="h-px bg-zinc-800 mb-8" />
            <div className="space-y-3">
              {gains.map((g) => (
                <div key={g} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-200 text-[15px] leading-relaxed font-medium">{g}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="font-display text-4xl font-extrabold text-white mb-4">
              Tudo que sua barbearia precisa, num app só
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              O melhor dos grandes sistemas do mercado, reunido — e com a sua cara.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={(i % 3) * 90}>
                  <div className="group h-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/40 hover:bg-zinc-900/80 transition-all hover:-translate-y-1">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="py-20 px-4 bg-zinc-950">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/tools.jpg" alt="Ferramentas de barbearia" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="font-display text-xl font-bold text-white">No ar hoje.</p>
                <p className="text-sm text-zinc-300">Sem instalação, sem técnico, sem enrolação.</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h2 className="font-display text-4xl font-extrabold text-white mb-8">Como funciona</h2>
            <div className="space-y-6">
              {steps.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-500 mb-0.5">PASSO {item.step}</div>
                      <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="font-display text-4xl font-extrabold text-white mb-4">Planos que cabem no seu caixa</h2>
            <p className="text-zinc-400 text-lg">Preço fechado, sem taxa escondida. Cancele quando quiser.</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 90}>
                <div
                  className={`relative text-left bg-zinc-900 border-2 ${plan.color} rounded-2xl p-8 flex flex-col h-full ${plan.highlight ? "lg:scale-[1.03] shadow-2xl shadow-amber-500/10" : ""}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-zinc-500 text-sm mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-4xl font-black text-white">{plan.price}</span>
                      <span className="text-zinc-500">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`block text-center py-3 px-6 rounded-xl font-bold transition-all ${
                      plan.highlight
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5"
                        : "border border-zinc-700 text-zinc-300 hover:border-amber-500 hover:text-amber-400"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WHY US ================= */}
      <section id="why-us" className="py-20 px-4 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="font-display text-4xl font-extrabold text-white mb-4">Por que escolher o CORTIX</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Feito pra quem toca uma barbearia no dia a dia — sem depender de suporte técnico.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: "Configura em minutos", desc: "Cadastre serviços, horários e equipe — sua página de agendamento fica no ar no mesmo dia." },
              { icon: Shield, title: "Sem letra miúda", desc: "Preço fechado, sem taxa de adesão e sem multa de cancelamento." },
              { icon: MessageSquareText, title: "Suporte de verdade", desc: "Gente de verdade, em português, pra te ajudar na configuração e no uso." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={i * 90}>
                  <div className="h-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/40 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="font-display text-4xl font-extrabold text-white mb-4">Perguntas frequentes</h2>
          </Reveal>

          <div className="space-y-4">
            {[
              { q: "Preciso saber de tecnologia pra usar?", a: "Não. O CORTIX foi feito pra ser simples. Você configura tudo em minutos, sem precisar de suporte técnico." },
              { q: "Meus clientes precisam baixar app?", a: "Não. O agendamento é pelo navegador, no celular ou computador. Funciona como PWA e pode ser adicionado à tela inicial." },
              { q: "Consigo deixar com a cara da minha barbearia?", a: "Sim! Coloque sua logo, escolha as cores e crie um link personalizado com a identidade visual da sua barbearia." },
              { q: "O lembrete funciona no WhatsApp?", a: "Sim, nos planos Pro e White Label a confirmação e o lembrete de agendamento saem pelo WhatsApp." },
              { q: "Como é o teste grátis?", a: "O Essencial começa em R$ 50/mês. Pro e White Label têm 14 dias grátis, sem cartão de crédito." },
            ].map((faq, i) => (
              <Reveal key={i} delay={(i % 2) * 80}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
                  <h3 className="text-white font-bold mb-2">{faq.q}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="relative rounded-[2rem] overflow-hidden border border-amber-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/fade-detail.jpg" alt="Detalhe de um corte degradê" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
              <div className="relative p-10 sm:p-16 max-w-xl">
                <Scissors className="w-11 h-11 text-amber-400 mb-6" />
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                  Bora encher essa agenda?
                </h2>
                <p className="text-zinc-300 text-lg mb-8">
                  Crie sua conta agora e coloque sua página de agendamento no ar ainda hoje. Sem cartão de crédito.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/register"
                    className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold px-8 py-4 rounded-xl hover:shadow-2xl hover:shadow-amber-500/30 transition-all text-lg hover:-translate-y-0.5"
                  >
                    Criar minha conta
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/booking/demo"
                    className="inline-flex items-center justify-center gap-2 border border-white/20 bg-white/5 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-lg"
                  >
                    Ver demo ao vivo
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-zinc-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-black" />
                </div>
                <span className="text-xl font-black text-white font-display">
                  CORT<span className="text-amber-400">IX</span>
                </span>
              </div>
              <p className="text-zinc-500 text-sm">O sistema de gestão mais completo para barbearias modernas.</p>
            </div>
            {[
              { title: "Produto", links: ["Funcionalidades", "Preços", "Demo", "Changelog"] },
              { title: "Empresa", links: ["Sobre", "Blog", "Carreiras", "Contato"] },
              { title: "Suporte", links: ["Documentação", "Status", "Política de Privacidade", "Termos"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-bold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => {
                    const href =
                      link === "Termos" ? "/termos" : link === "Política de Privacidade" ? "/privacidade" : "#";
                    return (
                      <li key={link}>
                        <a href={href} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
                          {link}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-900 pt-6 text-center text-zinc-600 text-sm">
            © 2026 CORTIX. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <LandingChatbot />
    </div>
  );
}
