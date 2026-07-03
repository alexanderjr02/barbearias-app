import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { LandingChatbot } from "@/components/chatbot/LandingChatbot";
import {
  Calendar,
  BarChart3,
  Users,
  Package,
  MessageSquareText,
  Palette,
  Shield,
  Zap,
  Star,
  CheckCircle,
  ArrowRight,
  Scissors,
  TrendingUp,
  Clock,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agendamento Online 24/7",
    description:
      "Clientes agendam pelo celular, site ou chatbot a qualquer hora. Confirmação automática via WhatsApp.",
    color: "from-amber-500 to-yellow-500",
  },
  {
    icon: MessageSquareText,
    title: "Chatbot Inteligente",
    description:
      "Assistente virtual que responde dúvidas, agenda horários e envia lembretes automaticamente.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: BarChart3,
    title: "Gestão Financeira",
    description:
      "Controle receitas, despesas, comissões e gere relatórios detalhados em tempo real.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description:
      "Histórico completo de cada cliente, preferências, aniversários e programa de fidelidade.",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Package,
    title: "Controle de Estoque",
    description:
      "Gerencie produtos, alertas de estoque mínimo e rastreie o consumo em cada serviço.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Palette,
    title: "Personalização Total",
    description:
      "Cada barbearia com sua identidade: cores, logo, domínio próprio e página de agendamento personalizada.",
    color: "from-pink-500 to-rose-500",
  },
];

const plans = [
  {
    name: "Starter",
    price: "Grátis",
    period: "para sempre",
    description: "Ideal para começar",
    color: "border-zinc-700",
    features: [
      "Até 50 agendamentos/mês",
      "1 barbeiro",
      "Agenda online básica",
      "Chatbot básico",
      "App para clientes",
    ],
    cta: "Começar grátis",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 97",
    period: "/mês",
    description: "Para barbearias em crescimento",
    color: "border-amber-500",
    badge: "Mais popular",
    features: [
      "Agendamentos ilimitados",
      "Até 10 barbeiros",
      "Chatbot avançado com IA",
      "Gestão financeira completa",
      "Controle de estoque",
      "Relatórios avançados",
      "Marketing e lembretes SMS",
      "Página personalizada",
      "Suporte prioritário",
    ],
    cta: "Testar 14 dias grátis",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "R$ 197",
    period: "/mês",
    description: "Para redes e franquias",
    color: "border-zinc-600",
    features: [
      "Tudo do plano Pro",
      "Barbeiros ilimitados",
      "Múltiplas unidades",
      "API personalizada",
      "Integração WhatsApp Business",
      "Domínio próprio",
      "Split de pagamentos",
      "Gerente de conta dedicado",
    ],
    cta: "Falar com vendas",
    href: "/register?plan=enterprise",
    highlight: false,
  },
];

const testimonials = [
  {
    name: "Carlos Oliveira",
    role: "Dono — Barbearia King's",
    content:
      "O CORTIX transformou minha barbearia. Reduzi 80% do tempo no telefone e aumentei 40% na receita no primeiro mês.",
    rating: 5,
    avatar: "CO",
  },
  {
    name: "Rafael Santos",
    role: "Barbeiro — Corte Perfeito",
    content:
      "O chatbot é incrível! Agenda sozinho enquanto estou trabalhando. Nunca mais perdi cliente por falta de resposta.",
    rating: 5,
    avatar: "RS",
  },
  {
    name: "Diego Ferreira",
    role: "Gerente — Barber Shop Premium",
    content:
      "O controle financeiro me deu clareza total do negócio. Agora sei exatamente quanto cada barbeiro traz por mês.",
    rating: 5,
    avatar: "DF",
  },
];

const stats = [
  { value: "5.000+", label: "Barbearias ativas" },
  { value: "2M+", label: "Agendamentos realizados" },
  { value: "98%", label: "Satisfação dos clientes" },
  { value: "R$ 50M+", label: "Em receita gerada" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium px-4 py-2 rounded-full mb-8">
            <Zap className="w-4 h-4" />
            O sistema #1 para barbearias no Brasil
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Sua barbearia no
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              próximo nível
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Agendamento automático, chatbot inteligente, gestão financeira e
            muito mais. Tudo que sua barbearia precisa em uma plataforma.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all text-lg shadow-lg shadow-amber-500/25 hover:scale-105"
            >
              Começar grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/booking/demo"
              className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-300 font-semibold px-8 py-4 rounded-xl hover:bg-white/5 hover:border-zinc-500 transition-all text-lg"
            >
              Ver demonstração
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm"
              >
                <p className="text-3xl font-black text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Fake browser bar */}
            <div className="bg-zinc-950 px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 bg-zinc-800 rounded-md px-3 py-1 text-xs text-zinc-500 max-w-xs mx-auto text-center">
                app.cortix.com.br/dashboard
              </div>
            </div>
            {/* Dashboard mock */}
            <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Receita Hoje", value: "R$ 1.250", change: "+12%", positive: true },
                { label: "Agendamentos", value: "18", change: "+5", positive: true },
                { label: "Clientes Novos", value: "7", change: "+3", positive: true },
                { label: "Ticket Médio", value: "R$ 69", change: "+8%", positive: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-zinc-800 rounded-xl p-4 border border-zinc-700"
                >
                  <p className="text-xs text-zinc-500 mb-2">{item.label}</p>
                  <p className="text-2xl font-bold text-white">{item.value}</p>
                  <span className="text-xs text-green-400 font-medium">
                    {item.change} hoje
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700 flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-2 bg-zinc-700 rounded-full mb-2 w-full">
                    <div className="h-2 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full w-3/4" />
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full mb-2 w-4/5">
                    <div className="h-2 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full w-1/2" />
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full w-2/3">
                    <div className="h-2 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full w-4/5" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Meta mensal</p>
                  <p className="text-xl font-bold text-white">R$ 28.500</p>
                  <p className="text-xs text-amber-400">75% atingida</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Uma plataforma completa que combina as melhores funcionalidades
              dos principais sistemas do mercado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all hover:-translate-y-1"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Como funciona?
            </h2>
            <p className="text-zinc-400 text-lg">
              Configure em minutos, colha resultados imediatamente
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
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
                desc: "Adicione sua logo, cores e configure seus serviços e horários.",
              },
              {
                step: "3",
                icon: Smartphone,
                title: "Compartilhe",
                desc: "Divulgue seu link de agendamento nas redes sociais e WhatsApp.",
              },
              {
                step: "4",
                icon: TrendingUp,
                title: "Cresça",
                desc: "Acompanhe resultados e deixe o sistema trabalhar por você.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-amber-400" />
                  </div>
                  <div className="text-xs font-bold text-amber-500 mb-2">
                    PASSO {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-zinc-400 text-sm">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Planos transparentes
            </h2>
            <p className="text-zinc-400 text-lg">
              Sem taxas escondidas. Cancele quando quiser.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-zinc-900 border-2 ${plan.color} rounded-2xl p-8 flex flex-col ${plan.highlight ? "scale-105 shadow-xl shadow-amber-500/10" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-zinc-500 text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">
                      {plan.price}
                    </span>
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
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:opacity-90"
                      : "border border-zinc-700 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              O que dizem nossos clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
              >
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                  &ldquo;{t.content}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Perguntas frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Preciso de conhecimento técnico para usar?",
                a: "Não! O CORTIX foi criado para ser intuitivo. Você configura tudo em minutos, sem precisar de suporte técnico.",
              },
              {
                q: "Meus clientes precisam baixar algum aplicativo?",
                a: "Não. O agendamento é feito pelo navegador, no celular ou computador. Funciona como PWA, podendo ser adicionado à tela inicial.",
              },
              {
                q: "Posso personalizar com a identidade da minha barbearia?",
                a: "Sim! Você pode colocar sua logo, escolher as cores, criar um link personalizado e configurar uma página de agendamento com sua identidade visual.",
              },
              {
                q: "O chatbot funciona no WhatsApp?",
                a: "Nos planos Pro e Enterprise, oferecemos integração com WhatsApp Business API para agendamento automático via chat.",
              },
              {
                q: "Como funciona o período de teste?",
                a: "O plano Starter é gratuito para sempre. Os planos Pro e Enterprise têm 14 dias de teste grátis, sem cartão de crédito.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
              >
                <h3 className="text-white font-bold mb-2">{faq.q}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-3xl p-12">
            <Clock className="w-12 h-12 text-amber-400 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-white mb-4">
              Comece agora, gratuitamente
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
              Junte-se a mais de 5.000 barbearias que já transformaram seu
              negócio com o CORTIX.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all text-lg"
              >
                Criar conta grátis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/booking/demo"
                className="inline-flex items-center justify-center gap-2 border border-zinc-700 text-zinc-300 font-semibold px-8 py-4 rounded-xl hover:bg-white/5 transition-all text-lg"
              >
                Ver demo ao vivo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-black" />
                </div>
                <span className="text-xl font-black text-white">
                  CORT<span className="text-amber-400">IX</span>
                </span>
              </div>
              <p className="text-zinc-500 text-sm">
                O sistema de gestão mais completo para barbearias modernas.
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
                <h4 className="text-white font-bold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-900 pt-6 text-center text-zinc-600 text-sm">
            © 2025 CORTIX. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <LandingChatbot />
    </div>
  );
}
