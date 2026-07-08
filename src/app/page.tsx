import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { LandingChatbot } from "@/components/chatbot/LandingChatbot";
import { Reveal } from "@/components/marketing/Reveal";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { AppShowcase, ClienteScreen } from "@/components/marketing/AppShowcase";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import {
  Calendar,
  BarChart3,
  Users,
  Package,
  MessageSquareText,
  Palette,
  Shield,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Scissors,
  TrendingUp,
  Clock,
  Smartphone,
  Check,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agendamento Online 24/7",
    description:
      "Clientes agendam pelo celular, site ou chatbot a qualquer hora. Só aparecem horários realmente livres.",
    color: "from-amber-500 to-yellow-500",
  },
  {
    icon: MessageSquareText,
    title: "Chatbot Automático",
    description:
      "Assistente virtual que responde dúvidas frequentes — horário, serviços e preços — sem sua equipe parar o trabalho.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: BarChart3,
    title: "Gestão Financeira",
    description:
      "Controle receitas, despesas e comissões, com relatórios e gráficos atualizados em tempo real.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description:
      "Histórico completo de cada cliente — visitas, gasto total e programa de pontos de fidelidade.",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Package,
    title: "Controle de Estoque",
    description:
      "Gerencie produtos e receba alerta automático quando o estoque estiver acabando.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Palette,
    title: "Identidade Própria",
    description:
      "Cada barbearia com sua cor, logo e banner — refletidos na página de agendamento e no app.",
    color: "from-pink-500 to-rose-500",
  },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 29",
    period: "/mês",
    description: "Ideal para começar com gestão simples",
    color: "border-white/10",
    features: [
      "Dashboard do gestor",
      "Agendamento online",
      "Gestão financeira básica",
      "Chatbot automático",
      "Até 3 barbeiros",
    ],
    cta: "Começar com Starter",
    href: "/register?plan=starter",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 79",
    period: "/mês",
    description: "Para barbearias em crescimento",
    color: "border-[var(--mkt-gold)]",
    badge: "Mais popular",
    features: [
      "Tudo do Starter",
      "App mobile para gestor, barbeiro e cliente",
      "Personalização de cores, logo e banner",
      "Programa de fidelidade (pontos e níveis)",
      "Relatórios avançados",
      "Até 10 barbeiros",
    ],
    cta: "Testar 14 dias grátis",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "White Label",
    price: "R$ 299",
    period: "/mês + 3%",
    description: "Para redes e expansão de marca",
    color: "border-fuchsia-500/60",
    features: [
      "Tudo do Pro",
      "Marca 100% personalizada, sem menção ao CORTIX",
      "Barbeiros ilimitados",
      "Suporte prioritário dedicado",
      "Prioridade em novas funcionalidades",
    ],
    cta: "Falar sobre White Label",
    href: "/register?plan=white-label",
    highlight: false,
  },
];

const trustPoints = [
  { icon: Shield, title: "Sem fidelidade", desc: "Cancele quando quiser, sem multa." },
  { icon: Clock, title: "No ar em minutos", desc: "Crie sua conta e comece a agendar hoje." },
  { icon: Shield, title: "Dados protegidos", desc: "Sessão criptografada e tratamento alinhado à LGPD." },
  { icon: MessageSquareText, title: "Suporte em português", desc: "Time de suporte local, sem robô de call center." },
];

const stats = [
  { value: "3", label: "experiências num app só", sub: "Gestor, barbeiro e cliente" },
  { value: "10", label: "áreas de gestão", sub: "Agenda, financeiro, estoque e mais" },
  { value: "100%", label: "personalizável", sub: "Sua cor, logo e banner" },
  { value: "Web + App", label: "em qualquer tela", sub: "Computador, Android e iPhone" },
];

const steps = [
  {
    step: "1",
    icon: Scissors,
    title: "Crie sua conta",
    desc: "Registre sua barbearia em 2 minutos. Sem cartão de crédito.",
  },
  {
    step: "2",
    icon: Palette,
    title: "Personalize",
    desc: "Adicione sua logo, cores e configure serviços, equipe e horários.",
  },
  {
    step: "3",
    icon: Smartphone,
    title: "Compartilhe",
    desc: "Divulgue seu link de agendamento nas redes sociais e no WhatsApp.",
  },
  {
    step: "4",
    icon: TrendingUp,
    title: "Cresça",
    desc: "Acompanhe os resultados pelo painel e pelo app, de onde estiver.",
  },
];

const whyUs = [
  {
    icon: Clock,
    title: "Configura em minutos",
    desc: "Cadastre serviços, horários e equipe — sua página de agendamento fica no ar no mesmo dia.",
  },
  {
    icon: Smartphone,
    title: "Painel e app, sempre em sincronia",
    desc: "O que você vê no computador é o mesmo que o barbeiro e o cliente veem no celular, na hora.",
  },
  {
    icon: Shield,
    title: "Sem letras miúdas",
    desc: "Preço fechado, sem taxa de adesão e sem multa de cancelamento.",
  },
];

const faqs = [
  {
    q: "Preciso de conhecimento técnico para usar?",
    a: "Não! O CORTIX foi criado para ser intuitivo. Você configura tudo em minutos, sem precisar de suporte técnico.",
  },
  {
    q: "Meus clientes precisam baixar algum aplicativo?",
    a: "Não. O agendamento é feito pelo navegador, no celular ou computador — funciona como PWA, podendo ser adicionado à tela inicial. Você e sua equipe também podem usar o app dedicado do CORTIX.",
  },
  {
    q: "Posso personalizar com a identidade da minha barbearia?",
    a: "Sim! Você define logo, cores e banner, tem um link próprio de agendamento e essa identidade aparece tanto no painel web quanto no app.",
  },
  {
    q: "O que o barbeiro e o cliente enxergam, além do gestor?",
    a: "O barbeiro tem sua própria agenda, cadastro de clientes e visão de comissão. O cliente agenda escolhendo barbeiro e serviço, acompanha o histórico e os pontos de fidelidade — cada papel com a sua tela.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "O plano Starter começa em R$ 29/mês. Os planos Pro e White Label têm 14 dias de teste grátis, sem cartão de crédito.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--mkt-bg)]">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 mkt-grain pointer-events-none" />
        <div className="absolute top-[-10%] left-[10%] w-[560px] h-[560px] bg-[var(--mkt-gold)]/10 rounded-full blur-3xl pointer-events-none mkt-orb-a" />
        <div className="absolute top-[10%] right-[5%] w-[420px] h-[420px] bg-fuchsia-500/[0.06] rounded-full blur-3xl pointer-events-none mkt-orb-b" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[var(--mkt-gold)]/10 border border-[var(--mkt-gold)]/30 text-[var(--mkt-gold-soft)] text-sm font-medium px-4 py-2 rounded-full mb-8">
              <Sparkles className="w-4 h-4" />
              Agora com app mobile para gestor, barbeiro e cliente
            </div>

            <h1 className="text-5xl sm:text-6xl font-black text-[var(--mkt-text)] leading-[1.05] mb-6 text-balance">
              Menos tempo na agenda,
              <br />
              <span className="bg-gradient-to-r from-[var(--mkt-gold)] to-[var(--mkt-gold-soft)] bg-clip-text text-transparent">
                mais tempo cortando
              </span>
            </h1>

            <p className="text-lg text-[var(--mkt-text-dim)] max-w-xl mb-8 leading-relaxed">
              Agendamento online, chatbot, financeiro e gestão de equipe em um só lugar —
              pelo computador ou pelo celular, para você parar de perder cliente por falta de resposta.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--mkt-gold)] to-[var(--mkt-gold-soft)] text-black font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all text-lg shadow-lg shadow-amber-500/20 hover:scale-[1.03]"
              >
                Começar agora
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/booking/demo"
                className="inline-flex items-center gap-2 border border-[var(--mkt-border-strong)] text-[var(--mkt-text-dim)] font-semibold px-8 py-4 rounded-xl hover:bg-white/5 hover:text-[var(--mkt-text)] transition-all text-lg"
              >
                Ver demonstração
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--mkt-text-dim)]">
              {["Sem cartão de crédito", "Configura em minutos", "Cancele quando quiser"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[var(--mkt-gold)]" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="mkt-float">
              <PhoneMockup>
                <ClienteScreen />
              </PhoneMockup>
            </div>
          </div>
        </div>
      </section>

      {/* Capability stats */}
      <section className="border-y border-[var(--mkt-border)] py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center lg:text-left">
              <p className="text-3xl font-black text-[var(--mkt-gold)] mb-1">{s.value}</p>
              <p className="text-sm font-semibold text-[var(--mkt-text)]">{s.label}</p>
              <p className="text-xs text-[var(--mkt-text-faint)] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-black text-[var(--mkt-text)] mb-4 text-balance">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-[var(--mkt-text-dim)] text-lg max-w-2xl mx-auto">
              Uma plataforma completa que reúne agenda, financeiro, equipe e fidelização num só sistema.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={i * 0.06}>
                  <div className="group h-full bg-[var(--mkt-surface)] border border-[var(--mkt-border)] rounded-xl p-6 hover:border-[var(--mkt-border-strong)] transition-all hover:-translate-y-1">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--mkt-text)] mb-2">{feature.title}</h3>
                    <p className="text-[var(--mkt-text-dim)] text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* App showcase */}
      <section className="py-24 px-4 bg-[var(--mkt-surface)]/40 border-y border-[var(--mkt-border)]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-black text-[var(--mkt-text)] mb-4 text-balance">
              Um app para cada papel da sua equipe
            </h2>
            <p className="text-[var(--mkt-text-dim)] text-lg max-w-2xl mx-auto">
              Mesmo sistema, mesma marca — cada pessoa vê só o que precisa ver.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <AppShowcase />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-black text-[var(--mkt-text)] mb-4">Como funciona?</h2>
            <p className="text-[var(--mkt-text-dim)] text-lg">Configure em minutos, colha resultados imediatamente</p>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.step} delay={i * 0.08} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--mkt-gold)]/10 border border-[var(--mkt-gold)]/30 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-[var(--mkt-gold)]" />
                  </div>
                  <div className="text-xs font-bold text-[var(--mkt-gold)] mb-2 tracking-wide">PASSO {item.step}</div>
                  <h3 className="text-lg font-bold text-[var(--mkt-text)] mb-2">{item.title}</h3>
                  <p className="text-[var(--mkt-text-dim)] text-sm">{item.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-[var(--mkt-surface)]/40 border-y border-[var(--mkt-border)]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-4xl font-black text-[var(--mkt-text)] mb-4">Planos transparentes</h2>
            <p className="text-[var(--mkt-text-dim)] text-lg">Sem taxas escondidas. Cancele quando quiser.</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.08}>
                <div
                  className={`relative h-full text-left bg-[var(--mkt-surface)] border-2 ${plan.color} rounded-2xl p-8 flex flex-col ${
                    plan.highlight ? "lg:scale-[1.03] shadow-2xl shadow-amber-500/10" : ""
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--mkt-gold)] to-[var(--mkt-gold-soft)] text-black text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-[var(--mkt-text)] mb-1">{plan.name}</h3>
                    <p className="text-[var(--mkt-text-faint)] text-sm mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[var(--mkt-text)]">{plan.price}</span>
                      <span className="text-[var(--mkt-text-faint)]">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <CheckCircle className="w-4 h-4 text-[var(--mkt-gold)] flex-shrink-0 mt-0.5" />
                        <span className="text-[var(--mkt-text-dim)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`block text-center py-3 px-6 rounded-xl font-bold transition-all ${
                      plan.highlight
                        ? "bg-gradient-to-r from-[var(--mkt-gold)] to-[var(--mkt-gold-soft)] text-black hover:opacity-90"
                        : "border border-[var(--mkt-border-strong)] text-[var(--mkt-text-dim)] hover:border-[var(--mkt-gold)] hover:text-[var(--mkt-gold)]"
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

      {/* Trust / why choose us */}
      <section id="why-us" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-black text-[var(--mkt-text)] mb-4">Por que barbearias escolhem o CORTIX</h2>
            <p className="text-[var(--mkt-text-dim)] text-lg max-w-2xl mx-auto">
              Construído para quem administra uma barbearia no dia a dia, sem depender de suporte técnico.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {whyUs.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={i * 0.08}>
                  <div className="h-full bg-[var(--mkt-surface)] border border-[var(--mkt-border)] rounded-xl p-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--mkt-gold)]/10 border border-[var(--mkt-gold)]/30 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[var(--mkt-gold)]" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--mkt-text)] mb-2">{item.title}</h3>
                    <p className="text-[var(--mkt-text-dim)] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trustPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.title}
                  className="bg-[var(--mkt-surface)] border border-[var(--mkt-border)] rounded-xl p-5 text-left"
                >
                  <Icon className="w-5 h-5 text-[var(--mkt-gold)] mb-3" />
                  <p className="text-sm font-bold text-[var(--mkt-text)] mb-1">{point.title}</p>
                  <p className="text-xs text-[var(--mkt-text-faint)]">{point.desc}</p>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 bg-[var(--mkt-surface)]/40 border-y border-[var(--mkt-border)]">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-black text-[var(--mkt-text)] mb-4">Perguntas frequentes</h2>
          </Reveal>

          <Reveal delay={0.1}>
            <FaqAccordion items={faqs} />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-br from-[var(--mkt-gold)]/10 to-transparent border border-[var(--mkt-gold)]/20 rounded-3xl p-12">
              <div className="absolute inset-0 mkt-grain pointer-events-none" />
              <Clock className="w-12 h-12 text-[var(--mkt-gold)] mx-auto mb-6 relative" />
              <h2 className="relative text-4xl font-black text-[var(--mkt-text)] mb-4 text-balance">
                Pronto para organizar sua barbearia?
              </h2>
              <p className="relative text-[var(--mkt-text-dim)] text-lg mb-8 max-w-xl mx-auto">
                Crie sua conta agora e tenha sua página de agendamento no ar ainda hoje.
              </p>
              <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--mkt-gold)] to-[var(--mkt-gold-soft)] text-black font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all text-lg hover:scale-[1.03]"
                >
                  Criar minha conta
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/booking/demo"
                  className="inline-flex items-center justify-center gap-2 border border-[var(--mkt-border-strong)] text-[var(--mkt-text-dim)] font-semibold px-8 py-4 rounded-xl hover:bg-white/5 hover:text-[var(--mkt-text)] transition-all text-lg"
                >
                  Ver demo ao vivo
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--mkt-border)] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--mkt-gold)] to-amber-600 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-black" />
                </div>
                <span className="text-xl font-black text-[var(--mkt-text)]">
                  CORT<span className="text-[var(--mkt-gold)]">IX</span>
                </span>
              </div>
              <p className="text-[var(--mkt-text-faint)] text-sm">
                Gestão completa para barbearias — no computador e no celular.
              </p>
            </div>
            {[
              {
                title: "Produto",
                links: ["Funcionalidades", "Preços", "Demo", "Changelog"],
              },
              {
                title: "Empresa",
                links: ["Sobre", "Blog", "Carreiras", "Contato"],
              },
              {
                title: "Suporte",
                links: ["Documentação", "Status", "Política de Privacidade", "Termos"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[var(--mkt-text)] font-bold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[var(--mkt-text-faint)] text-sm hover:text-[var(--mkt-text-dim)] transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--mkt-border)] pt-6 text-center text-[var(--mkt-text-faint)] text-sm">
            © 2025 CORTIX. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <LandingChatbot />
    </div>
  );
}
