import Link from "next/link";
import Image from "next/image";
import { Big_Shoulders, Manrope } from "next/font/google";
import {
  CalendarDays, Wallet, Bell, Sparkles, Smartphone,
  ShieldCheck, ArrowRight, Scissors, Boxes,
} from "lucide-react";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { SignupInline } from "@/components/landing/SignupInline";
import { Reveal } from "@/components/landing/Reveal";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { AgendaEnchendo } from "@/components/landing/AgendaEnchendo";

// Landing do CORTIX.
//
// A página tem um objetivo só: fechar assinatura. Por isso os planos e o
// cadastro moram aqui dentro, e não atrás de um link. Cada página entre a
// decisão e a conta é gente que some no caminho.
//
// A página alterna breu e porcelana de propósito. O claro não é enfeite: marca
// os dois momentos em que a pessoa precisa olhar com atenção — a prova (as
// telas reais do produto) e a decisão (os planos). O resto fica escuro, e o
// contraste faz o trabalho de hierarquia que uma seta nunca faria.
//
// As imagens são capturas do produto rodando, não ilustração. Barbearia
// desconfia de tela bonita que não existe, e com razão.

// A tipografia da landing mora aqui, e não no layout raiz, para que só quem
// abre esta página baixe estas fontes — o painel continua em Inter/Sora.
//
// Títulos — Big Shoulders: condensada e alta, a letra de letreiro de barbearia
// e de cartaz de luta. Cabe mais palavra em português por linha que uma
// grotesca normal. O Next não tem métricas de fallback para ela e cairia na
// Arial, larga demais, fazendo o título saltar de largura ao trocar de fonte;
// Arial Narrow é condensada como ela e o salto some.
//
// Texto — Manrope: x-height grande, ótima em tela pequena, que é onde o dono
// da barbearia lê tudo.
const tipoTitulo = Big_Shoulders({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--ff-display",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Haettenschweiler", "system-ui", "sans-serif"],
});
const tipoTexto = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--ff-body",
  display: "swap",
});

export const metadata = {
  title: "CORTIX | Sistema de gestão para barbearias",
  description:
    "Agenda online 24 horas, lembrete automático que derruba a falta, financeiro sem planilha e app com a sua marca. O sistema que enche a agenda da sua barbearia.",
};

const NUMEROS = [
  { valor: "24 h", rotulo: "agenda aberta, mesmo com a barbearia fechada" },
  { valor: "1 toque", rotulo: "para o cliente remarcar, sem precisar ligar" },
  { valor: "R$ 50", rotulo: "por mês para começar, sem fidelidade" },
];

const CORRIDA = [
  "Agenda aberta 24 horas",
  "Lembrete que derruba a falta",
  "Assinatura de clientes",
  "Comissão calculada sozinha",
  "Copiloto com IA",
  "App com a sua marca",
  "Estoque com alerta",
  "Sem fidelidade",
];

// `largo` marca os dois recursos que carregam a venda: a agenda, que é a razão
// de alguém procurar um sistema, e o app com a marca, que é a razão de alguém
// subir de plano. Os dois ganham o dobro de espaço no grid.
const RECURSOS = [
  {
    icone: CalendarDays,
    titulo: "Agenda que ninguém fura",
    texto: "Cada barbeiro com a própria agenda, horário bloqueado, encaixe e arrastar para remarcar. Acabou o caderno com rasura na régua.",
    largo: true,
  },
  {
    icone: Bell,
    titulo: "Lembrete que derruba a falta",
    texto: "Confirmação e aviso automáticos antes do horário. Quem esquece é lembrado, e a cadeira não fica vazia.",
  },
  {
    icone: Sparkles,
    titulo: "Copiloto que age",
    texto: "Ele acha o horário parado e o cliente sumido, e chama de volta. Você aprova, ou deixa no automático.",
  },
  {
    icone: Wallet,
    titulo: "Financeiro sem planilha",
    texto: "Entrada, saída, comissão por barbeiro e ticket médio calculados sozinhos. Você abre e já sabe quanto sobrou.",
  },
  {
    icone: Boxes,
    titulo: "Estoque que avisa",
    texto: "Pomada, lâmina e talco com saldo em dia e alerta antes de acabar. Ninguém mais descobre no meio do atendimento.",
  },
];

// A conta é o argumento da assinatura. Dono de barbearia não compra "receita
// recorrente" — compra saber quanto cai na conta no dia 1º sem ninguém sentar
// na cadeira. Números de exemplo, e a seção diz isso na cara.
const CONTA = [
  { rotulo: "Assinantes", valor: "40" },
  { rotulo: "Mensalidade", valor: "R$ 89" },
];

const PASSOS = [
  { n: "1", titulo: "Crie a conta", texto: "Escolha o plano e preencha os dados da barbearia. Poucos minutos." },
  { n: "2", titulo: "Monte o time e os serviços", texto: "Cadastre barbeiros, serviços e horários de funcionamento." },
  { n: "3", titulo: "Divulgue o link", texto: "Mande no Instagram e no WhatsApp. O cliente agenda sozinho." },
];

const PERGUNTAS = [
  {
    p: "Preciso ter CNPJ?",
    r: "Sim. O cadastro exige CNPJ válido, e cada CNPJ abre uma barbearia. É o que garante que do outro lado existe um negócio de verdade.",
  },
  {
    p: "Tem período de teste?",
    r: "Não. Preferimos preço honesto a teste que vira cobrança esquecida. Você cancela quando quiser, sem multa.",
  },
  {
    p: "Meu cliente precisa baixar aplicativo?",
    r: "Não. Ele agenda pelo link, direto do navegador. Se quiser, instala o app na tela de início em dois toques.",
  },
  {
    p: "Consigo trocar de plano depois?",
    r: "Sim, a qualquer momento, sem perder nada. Você sobe quando a barbearia crescer e desce se precisar.",
  },
  {
    p: "E se eu quiser sair?",
    r: "Você cancela e leva seus dados. Sem fidelidade, sem carência e sem ligação de retenção.",
  },
  {
    p: "Serve para mais de uma unidade?",
    r: "Sim, no plano White Label. Um dono tem várias unidades na mesma conta, cada uma com sua agenda, sua equipe e seu caixa, e troca entre elas sem sair do painel.",
  },
];

export default function Home() {
  return (
    <div className={`marca-cortix min-h-screen bg-breu ${tipoTexto.variable} ${tipoTitulo.variable}`}>
      {/* Sem JavaScript o .reveal esconderia a página inteira. Animação nunca
          pode ser condição para o conteúdo existir. */}
      <noscript>
        <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
      </noscript>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-breu-3 bg-breu/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-latao-claro to-latao-escuro">
              <Scissors className="h-4 w-4 text-breu" />
            </span>
            <span className="font-display text-2xl font-bold uppercase leading-none tracking-wide text-porcelana">
              Cort<span className="text-latao">ix</span>
            </span>
          </span>
          <div className="flex items-center gap-6">
            <a href="#recursos" className="hidden text-sm font-medium text-fumaca transition-colors hover:text-porcelana sm:block">Recursos</a>
            <a href="#planos" className="hidden text-sm font-medium text-fumaca transition-colors hover:text-porcelana sm:block">Planos</a>
            <Link href="/login" className="text-sm font-medium text-fumaca transition-colors hover:text-porcelana">Entrar</Link>
            <a
              href="#planos"
              className="rounded-lg bg-latao px-4 py-2 text-sm font-bold uppercase tracking-wide text-breu transition-colors hover:bg-latao-claro"
            >
              Começar
            </a>
          </div>
        </nav>
        <ScrollProgress />
      </header>

      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:pt-32">
        {/* Luz baixa vindo de cima à esquerda, como a lâmpada em cima do
            espelho. Fica atrás de tudo e não intercepta clique. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-latao/[0.07] blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <Reveal>
              <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-latao">
                <span className="h-px w-8 bg-latao/50" />
                Sistema de gestão para barbearias
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 text-balance font-display text-[clamp(2.9rem,8vw,5rem)] font-bold uppercase leading-[0.92] text-porcelana">
                A agenda enche sozinha.
                <br />
                <span className="brass text-shimmer">Você só corta.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-fumaca">
                Agenda aberta 24 horas, lembrete automático que derruba a falta e assinatura mensal
                que garante receita todo mês. Um sistema só, feito para barbearia brasileira.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#planos"
                  className="inline-flex h-13 items-center gap-2 rounded-xl bg-latao px-7 text-sm font-bold uppercase tracking-wider text-breu transition-colors hover:bg-latao-claro"
                >
                  Criar minha conta <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#por-dentro"
                  className="inline-flex h-13 items-center rounded-xl border border-breu-3 px-6 text-sm font-bold uppercase tracking-wider text-porcelana transition-colors hover:border-fumaca/50 hover:bg-breu-2"
                >
                  Ver por dentro
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <dl className="mt-12 grid gap-6 border-t border-breu-3 pt-7 sm:grid-cols-3">
                {NUMEROS.map((n) => (
                  <div key={n.valor}>
                    <dt className="font-display text-3xl font-bold uppercase leading-none text-latao-claro">{n.valor}</dt>
                    <dd className="mt-1.5 text-xs leading-relaxed text-fumaca/80">{n.rotulo}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {/* Sem `justify-self`: um item de grid alinhado encolhe até o conteúdo,
              e aí o `absolute` do cartão passa a se medir pela largura do
              celular em vez da coluna — o cartão cobria o aparelho inteiro. */}
          <Reveal delay={200}>
            <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
              <div className="mx-auto w-[248px] rounded-[2.2rem] border-[10px] border-breu-3 bg-breu-2 shadow-2xl shadow-black/70 sm:w-[276px] lg:mr-2">
                <Image
                  src="/landing/produto/app-entrada.webp"
                  alt="Tela de entrada do app da barbearia, com a logo e a cor da própria marca"
                  width={560}
                  height={1212}
                  className="rounded-[1.6rem]"
                  priority
                />
              </div>
              {/* A agenda é o argumento; o celular é a prova de que ela existe.
                  Por isso ela vem na frente onde há espaço, e embaixo onde não há. */}
              <div className="mt-5 lg:absolute lg:-left-10 lg:bottom-4 lg:mt-0 lg:w-[18.5rem] xl:-left-16">
                <AgendaEnchendo />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Faixa corrida ----------------------------------------------------- */}
      <div className="overflow-hidden border-y border-breu-3 bg-breu-2 py-3.5">
        <div className="marquee-track flex w-max gap-8 whitespace-nowrap">
          {[...CORRIDA, ...CORRIDA].map((item, i) => (
            <span key={i} className="flex items-center gap-8 text-xs font-bold uppercase tracking-[0.18em] text-fumaca/70">
              {item}
              <Scissors className="h-3 w-3 shrink-0 text-latao" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>

      {/* Recursos ---------------------------------------------------------- */}
      <section id="recursos" className="scroll-mt-20 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-latao">
              <span className="h-px w-8 bg-latao/50" />
              O que ele resolve
            </p>
            <h2 className="mt-4 max-w-2xl text-balance font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold uppercase leading-[0.95] text-porcelana">
              Cada recurso nasceu de um problema que barbearia tem todo dia
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto, largo }, i) => (
              <Reveal key={titulo} delay={i * 60} className={largo ? "sm:col-span-2" : ""}>
                <div className="lift h-full rounded-2xl border border-breu-3 bg-breu-2/60 p-7 hover:border-latao/40 hover:bg-breu-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-latao/25 bg-latao/10">
                    <Icone className="h-5 w-5 text-latao" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-bold uppercase leading-tight text-porcelana">{titulo}</h3>
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-fumaca">{texto}</p>
                </div>
              </Reveal>
            ))}

            <Reveal delay={300} className="sm:col-span-2 lg:col-span-3">
              <div className="lift overflow-hidden rounded-2xl border border-latao/25 bg-gradient-to-br from-latao/[0.14] via-breu-2 to-breu-2 p-7 hover:border-latao/50 sm:p-9">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-latao/30 bg-latao/15">
                      <Smartphone className="h-5 w-5 text-latao-claro" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-display text-3xl font-bold uppercase leading-none text-porcelana sm:text-4xl">
                      App com a sua marca
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-fumaca">
                      No plano White Label o cliente instala o <em className="not-italic text-porcelana">seu</em> app,
                      com o seu nome, a sua logo e a sua cor. Não o nosso. Ele abre o ícone da sua
                      barbearia na tela de início e agenda dali.
                    </p>
                  </div>
                  <a
                    href="#planos"
                    className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-xl border border-latao/40 px-6 text-sm font-bold uppercase tracking-wider text-latao-claro transition-colors hover:bg-latao hover:text-breu sm:self-auto"
                  >
                    Ver o White Label <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Prova: as telas reais, em porcelana -------------------------------- */}
      <section id="por-dentro" className="scroll-mt-20 bg-porcelana px-4 py-24 text-breu">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-latao-escuro">
              <span className="h-px w-8 bg-latao-escuro/40" />
              Sem montagem
            </p>
            <h2 className="mt-4 max-w-2xl text-balance font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold uppercase leading-[0.95] text-breu">
              Isto é a tela de verdade
            </h2>
            <p className="mt-4 max-w-xl text-breu/60">
              As imagens abaixo são capturas do produto rodando. É exatamente o que você vê ao entrar.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <figure className="mt-12">
              <div className="overflow-hidden rounded-2xl border border-breu/10 shadow-2xl shadow-breu/10">
                <Image
                  src="/landing/produto/web-painel.webp"
                  alt="Painel do gestor mostrando receita do dia, agendamentos, clientes ativos e ranking de barbeiros"
                  width={1600}
                  height={1000}
                  className="w-full"
                />
              </div>
              <figcaption className="mt-4 text-sm text-breu/55">
                <span className="font-bold uppercase tracking-wider text-breu">Painel</span> — quanto entrou hoje,
                quantos agendamentos, quem mais atendeu e quanto sobrou no mês.
              </figcaption>
            </figure>
          </Reveal>

          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <Reveal delay={80}>
              <figure>
                <div className="overflow-hidden rounded-2xl border border-breu/10 shadow-xl shadow-breu/10">
                  <Image
                    src="/landing/produto/web-agenda.webp"
                    alt="Agenda mensal com os agendamentos de cada barbeiro em cores diferentes"
                    width={1600}
                    height={1000}
                    className="w-full"
                  />
                </div>
                <figcaption className="mt-4 text-sm text-breu/55">
                  <span className="font-bold uppercase tracking-wider text-breu">Agenda</span> — cada barbeiro numa
                  cor, com horário bloqueado e encaixe.
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={160}>
              <figure>
                <div className="overflow-hidden rounded-2xl border border-breu/10 shadow-xl shadow-breu/10">
                  <Image
                    src="/landing/produto/web-financeiro.webp"
                    alt="Tela de financeiro com entradas, saídas e resultado do período"
                    width={1600}
                    height={1000}
                    className="w-full"
                  />
                </div>
                <figcaption className="mt-4 text-sm text-breu/55">
                  <span className="font-bold uppercase tracking-wider text-breu">Financeiro</span> — entrada, saída e
                  o que sobrou, sem planilha.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Recorrência -------------------------------------------------------- */}
      <section className="px-4 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-latao">
              <span className="h-px w-8 bg-latao/50" />
              Assinatura de clientes
            </p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold uppercase leading-[0.95] text-porcelana">
              Pare de começar o mês do zero
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-fumaca">
              Você vende um plano mensal de cortes. O cliente paga todo mês, tendo vindo ou não —
              e vem mais, justamente porque já pagou. O seu mês para de depender do movimento da
              semana.
            </p>

            <div className="mt-8 max-w-md rounded-2xl border border-breu-3 bg-breu-2/50 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fumaca">
                O que entra no dia 1º
              </p>
              <dl className="mt-5 space-y-3">
                {CONTA.map((linha) => (
                  <div key={linha.rotulo} className="flex items-baseline gap-3">
                    <dt className="text-sm text-porcelana/80">{linha.rotulo}</dt>
                    <span aria-hidden="true" className="min-w-8 flex-1 -translate-y-[3px] border-b border-dotted border-breu-3" />
                    <dd className="font-display text-2xl font-bold tabular-nums text-porcelana">{linha.valor}</dd>
                  </div>
                ))}
                <div className="flex items-baseline gap-3 border-t border-breu-3 pt-4">
                  <dt className="text-sm font-semibold text-porcelana">Entra sem ninguém sentar</dt>
                  <span aria-hidden="true" className="min-w-8 flex-1 -translate-y-[3px] border-b border-dotted border-latao/30" />
                  <dd className="font-display text-4xl font-bold tabular-nums text-latao-claro">R$ 3.560</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-fumaca/70">
                Números de exemplo. Você define o preço e quantos cortes o plano dá; o sistema
                cobra e controla o uso de cada assinante.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="#planos"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-latao px-6 text-sm font-bold uppercase tracking-wider text-breu transition-colors hover:bg-latao-claro"
              >
                Quero vender assinatura <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs text-fumaca/70">Está no plano White Label.</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="overflow-hidden rounded-2xl border border-breu-3 shadow-2xl shadow-black/50">
              <Image
                src="/landing/produto/web-clientes.webp"
                alt="Lista de clientes da barbearia com histórico e informações de contato"
                width={1600}
                height={1000}
                className="w-full"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Como começa — sequência de verdade, por isso numerada --------------- */}
      <section className="border-t border-breu-3 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-balance font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold uppercase leading-none text-porcelana">
              Como começa
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {PASSOS.map((p, i) => (
              <Reveal key={p.n} delay={i * 90}>
                <div className="lift h-full rounded-2xl border border-breu-3 bg-breu-2/60 p-7 hover:border-latao/40">
                  <span className="font-display text-6xl font-bold leading-none text-latao/30">{p.n}</span>
                  <h3 className="mt-4 font-display text-2xl font-bold uppercase leading-tight text-porcelana">{p.titulo}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-fumaca">{p.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Planos — a decisão, em porcelana ----------------------------------- */}
      <section id="planos" className="scroll-mt-20 bg-porcelana px-4 py-24 text-breu">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 max-w-2xl">
              <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-latao-escuro">
                <span className="h-px w-8 bg-latao-escuro/40" />
                Planos
              </p>
              <h2 className="mt-4 text-balance font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold uppercase leading-[0.95] text-breu">
                Escolha o plano e comece agora
              </h2>
              <p className="mt-4 text-breu/60">
                Um preço só, por mês, com tudo dentro. Nada de módulo cobrado à parte depois.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <SignupInline />
          </Reveal>
        </div>
      </section>

      {/* Perguntas ---------------------------------------------------------- */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-balance font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold uppercase leading-none text-porcelana">
              Perguntas frequentes
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 divide-y divide-breu-3 border-y border-breu-3">
              {PERGUNTAS.map((f) => (
                <details key={f.p} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-porcelana transition-colors hover:text-latao-claro">
                    {f.p}
                    <span className="font-display text-2xl leading-none text-latao transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fumaca">{f.r}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Fecho -------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-breu-3 px-4 py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-latao/[0.08] blur-3xl"
        />
        <Reveal className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[clamp(2.4rem,6.5vw,4.2rem)] font-bold uppercase leading-[0.95] text-porcelana">
              Organize a barbearia <span className="brass text-shimmer">ainda hoje</span>
            </h2>
            <p className="mt-5 text-fumaca">
              Poucos minutos para criar a conta. Sem fidelidade e sem multa para sair.
            </p>
            <a
              href="#planos"
              className="mt-9 inline-flex h-13 items-center gap-2 rounded-xl bg-latao px-8 text-sm font-bold uppercase tracking-wider text-breu transition-colors hover:bg-latao-claro"
            >
              Criar minha conta <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-fumaca/60">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Dados protegidos conforme a LGPD
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-breu-3 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-latao-claro to-latao-escuro">
              <Scissors className="h-3.5 w-3.5 text-breu" />
            </span>
            <span className="font-display text-xl font-bold uppercase leading-none tracking-wide text-porcelana">
              Cort<span className="text-latao">ix</span>
            </span>
          </span>
          <div className="flex items-center gap-6 text-sm text-fumaca">
            <Link href="/termos" className="transition-colors hover:text-porcelana">Termos</Link>
            <Link href="/privacidade" className="transition-colors hover:text-porcelana">Privacidade</Link>
            <Link href="/login" className="transition-colors hover:text-porcelana">Entrar</Link>
          </div>
          <p className="text-xs text-fumaca/60">2026 CORTIX. Todos os direitos reservados.</p>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
