import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, Wallet, Bell, Sparkles, Smartphone,
  ShieldCheck, ArrowRight, Boxes, Minus,
} from "lucide-react";
import { RukzLogo } from "@/components/brand/RukzLogo";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { SignupInline } from "@/components/landing/SignupInline";
import { Reveal } from "@/components/landing/Reveal";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { AgendaEnchendo } from "@/components/landing/AgendaEnchendo";
import { CarrosselCartazes, type Cartaz } from "@/components/landing/CarrosselCartazes";

// Landing da rukz.
//
// A página tem um objetivo só: fechar assinatura. Por isso os planos e o
// cadastro moram aqui dentro, e não atrás de um link. Cada página entre a
// decisão e a conta é gente que some no caminho.
//
// A construção visual não foi inventada aqui: ela já existia nos anúncios da
// marca. Painel cheio, preto ou amarelo, etiqueta miúda em caixa alta, título
// enorme com uma frase em amarelo, corpo cinza e um fio no rodapé com @rukzapp
// de um lado e o assunto do outro. A landing é esse formato desenrolado na
// vertical, e o carrossel do meio é ele por inteiro, arrastável, como no
// Instagram. Quem viu o anúncio e abriu o site reconhece a mesma peça.
//
// O amarelo aparece três vezes, e nunca por enfeite: no carrossel, na conta da
// assinatura e nos planos. São os três momentos em que a pessoa precisa parar.
//
// As imagens são capturas do produto rodando, não ilustração. Barbearia
// desconfia de tela bonita que não existe, e com razão.

export const metadata = {
  title: "rukz | Gestão para barbearia",
  description:
    "Agenda aberta 24 horas, lembrete automático que derruba a falta, financeiro sem planilha e assinatura de clientes. O sistema que organiza a sua barbearia e traz o cliente de volta.",
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

// Os cartazes são os anúncios da marca, com o texto que já foi publicado. A
// ordem conta a história na sequência em que ela dói: primeiro a cadeira
// vazia, depois o que resolve, e por último o que faz o mês parar de começar
// do zero. Os dois amarelos caem nos recursos que mais vendem.
const CARTAZES: Cartaz[] = [
  {
    etiqueta: "A conta da falta",
    titulo: "Cada cadeira vazia é dinheiro saindo pela porta.",
    destaque: "dinheiro saindo pela porta",
    corpo: "Na maioria das vezes é só um cliente que esqueceu o horário. E isso dá para resolver.",
    rodape: "O problema de todo dia",
    tom: "preto",
  },
  {
    etiqueta: "Lembrete automático",
    titulo: "Quem esquece, o sistema lembra.",
    destaque: "o sistema lembra",
    corpo: "Confirmação e aviso automáticos antes do horário. A agenda para de ter buraco no meio do dia.",
    rodape: "Recurso",
    tom: "preto",
  },
  {
    etiqueta: "Financeiro",
    titulo: "Abra o sistema e já sabe quanto sobrou.",
    destaque: "quanto sobrou",
    corpo: "Entrada, saída, comissão por barbeiro e ticket médio calculados sozinhos. Sem planilha, sem caderno.",
    rodape: "Recurso",
    tom: "ouro",
  },
  {
    etiqueta: "Agenda",
    titulo: "Cada barbeiro com a sua agenda, e ninguém fura.",
    destaque: "e ninguém fura",
    corpo: "Horário bloqueado, encaixe e arrastar para remarcar. Acabou o caderno com rasura na régua.",
    rodape: "Recurso",
    tom: "preto",
  },
  {
    etiqueta: "Assinatura de clientes",
    titulo: "Pare de começar o mês do zero.",
    destaque: "do zero",
    corpo: "Um plano mensal de cortes que entra todo mês, mesmo na semana fraca. E o cliente volta sem você precisar pedir.",
    rodape: "Receita recorrente",
    tom: "preto",
  },
  {
    etiqueta: "White Label",
    titulo: "O cliente instala o seu app, não o nosso.",
    destaque: "o seu app",
    corpo: "Seu nome, sua logo e sua cor na tela de início do celular dele. Ele abre o ícone da sua barbearia e agenda dali.",
    rodape: "Plano White Label",
    tom: "ouro",
  },
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
// recorrente", compra saber quanto cai na conta no dia 1º sem ninguém sentar
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

/** A etiqueta miúda que abre toda seção, igual à dos anúncios. */
function Etiqueta({ children, escuro = false }: { children: React.ReactNode; escuro?: boolean }) {
  return (
    <p className={`tipo-etiqueta flex items-center gap-3 text-[0.63rem] ${escuro ? "text-preto/70" : "text-ouro"}`}>
      <span className={`h-px w-8 ${escuro ? "bg-preto/40" : "bg-ouro/50"}`} />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-preto">
      {/* Sem JavaScript o .reveal esconderia a página inteira, e o título
          ficaria empurrado para fora do próprio recorte. Animação nunca pode
          ser condição para o conteúdo existir. */}
      <noscript>
        <style>{`.reveal{opacity:1 !important;transform:none !important}.linha-sobe{transform:none !important}`}</style>
      </noscript>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-traco bg-preto/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="rukz, início" className="text-neve">
            <RukzLogo titulo={null} className="text-[1.35rem]" />
          </Link>
          <div className="flex items-center gap-6">
            <a href="#recursos" className="hidden text-sm font-medium text-cinza transition-colors hover:text-neve sm:block">Recursos</a>
            <a href="#planos" className="hidden text-sm font-medium text-cinza transition-colors hover:text-neve sm:block">Planos</a>
            <Link href="/login" className="text-sm font-medium text-cinza transition-colors hover:text-neve">Entrar</Link>
            <a
              href="#planos"
              className="rounded-lg bg-ouro px-4 py-2 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
            >
              Começar
            </a>
          </div>
        </nav>
        <ScrollProgress />
      </header>

      {/* Hero, o cartaz de abertura --------------------------------------- */}
      <section className="px-4 pb-20 pt-28 sm:pt-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <Reveal>
              <Etiqueta>Gestão para barbearia</Etiqueta>
            </Reveal>

            {/* O título sobe linha por linha, de dentro de um recorte. É o
                único movimento coreografado da página, e está no primeiro
                lugar em que o olho cai. */}
            <Reveal apenasMarcar>
              <h1 className="tipo-titulo-xl mt-5 text-balance text-[clamp(2.7rem,7.5vw,4.6rem)] text-neve">
                {["Organiza a sua barbearia", "e traz o cliente"].map((linha, i) => (
                  <span key={linha} className="linha-recorte">
                    <span className="linha-sobe" style={{ transitionDelay: `${i * 90}ms` }}>
                      {linha}
                    </span>
                  </span>
                ))}
                <span className="linha-recorte">
                  <span className="linha-sobe text-ouro" style={{ transitionDelay: "180ms" }}>
                    de volta.
                  </span>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-cinza">
                Agenda aberta 24 horas, lembrete automático que derruba a falta e assinatura mensal
                que garante receita todo mês. Um sistema só, feito para barbearia brasileira.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#planos"
                  className="inline-flex h-13 items-center gap-2 rounded-xl bg-ouro px-7 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
                >
                  Criar minha conta <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#por-dentro"
                  className="inline-flex h-13 items-center rounded-xl border border-traco-forte px-6 text-sm font-bold text-neve transition-colors hover:border-ouro hover:text-ouro"
                >
                  Ver por dentro
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <dl className="mt-12 grid gap-6 border-t border-traco pt-7 sm:grid-cols-3">
                {NUMEROS.map((n) => (
                  <div key={n.valor}>
                    <dt className="tipo-titulo text-3xl text-ouro">{n.valor}</dt>
                    <dd className="mt-1.5 text-xs leading-relaxed text-cinza-fraco">{n.rotulo}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {/* Sem `justify-self`: um item de grid alinhado encolhe até o conteúdo,
              e aí o `absolute` do cartão passa a se medir pela largura do
              celular em vez da coluna, o cartão cobria o aparelho inteiro. */}
          <Reveal delay={200}>
            <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
              <div className="mx-auto w-[248px] rounded-[2.2rem] border-[10px] border-grafite bg-carvao shadow-2xl shadow-black/70 sm:w-[276px] lg:mr-2">
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

      {/* Faixa corrida ------------------------------------------------------ */}
      <div className="overflow-hidden border-y border-traco py-3.5">
        <div className="faixa-corre flex w-max gap-8 whitespace-nowrap">
          {[...CORRIDA, ...CORRIDA].map((item, i) => (
            <span key={i} className="tipo-etiqueta flex items-center gap-8 text-[0.63rem] text-cinza-fraco">
              {item}
              <Minus className="h-3 w-3 shrink-0 text-ouro" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>

      {/* Carrossel de cartazes, o formato dos anúncios, arrastável --------- */}
      <section className="py-24">
        <div className="mx-auto mb-12 max-w-6xl px-4">
          <Reveal>
            <Etiqueta>Os anúncios, por dentro</Etiqueta>
            <h2 className="tipo-titulo mt-4 max-w-2xl text-balance text-[clamp(2.1rem,5.2vw,3.4rem)] text-neve">
              Cada recurso nasceu de um problema que barbearia tem <span className="text-ouro">todo dia</span>
            </h2>
            <p className="mt-4 max-w-xl text-cinza">Arraste para o lado, como no Instagram.</p>
          </Reveal>
        </div>

        <Reveal delay={80}>
          <CarrosselCartazes cartazes={CARTAZES} />
        </Reveal>
      </section>

      {/* Recursos, em lista ------------------------------------------------- */}
      <section id="recursos" className="scroll-mt-20 border-t border-traco px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Etiqueta>O que vem junto</Etiqueta>
            <h2 className="tipo-titulo mt-4 max-w-2xl text-balance text-[clamp(2.1rem,5.2vw,3.4rem)] text-neve">
              Tudo num sistema só, sem módulo cobrado à parte
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto, largo }, i) => (
              <Reveal key={titulo} delay={i * 60} className={largo ? "sm:col-span-2" : ""}>
                <div className="sobe h-full rounded-2xl border border-traco bg-carvao p-7 hover:border-ouro/40">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-ouro/25 bg-ouro/10">
                    <Icone className="h-5 w-5 text-ouro" aria-hidden="true" />
                  </span>
                  <h3 className="tipo-titulo mt-5 text-2xl text-neve">{titulo}</h3>
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-cinza">{texto}</p>
                </div>
              </Reveal>
            ))}

            <Reveal delay={300} className="sm:col-span-2 lg:col-span-3">
              <div className="sobe overflow-hidden rounded-2xl border border-ouro/25 bg-carvao p-7 hover:border-ouro/60 sm:p-9">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-ouro/30 bg-ouro/15">
                      <Smartphone className="h-5 w-5 text-ouro" aria-hidden="true" />
                    </span>
                    <h3 className="tipo-titulo mt-5 text-3xl text-neve sm:text-4xl">
                      App com a sua marca
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-cinza">
                      No plano White Label o cliente instala o <em className="not-italic text-neve">seu</em> app,
                      com o seu nome, a sua logo e a sua cor. Não o nosso. Ele abre o ícone da sua
                      barbearia na tela de início e agenda dali.
                    </p>
                  </div>
                  <a
                    href="#planos"
                    className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-xl border border-ouro/40 px-6 text-sm font-bold text-ouro transition-colors hover:bg-ouro hover:text-preto sm:self-auto"
                  >
                    Ver o White Label <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Prova: as telas de verdade ----------------------------------------- */}
      <section id="por-dentro" className="scroll-mt-20 border-t border-traco px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Etiqueta>Sem montagem</Etiqueta>
            <h2 className="tipo-titulo mt-4 max-w-2xl text-balance text-[clamp(2.1rem,5.2vw,3.4rem)] text-neve">
              Isto é a tela de verdade
            </h2>
            <p className="mt-4 max-w-xl text-cinza">
              As imagens abaixo são capturas do produto rodando. É exatamente o que você vê ao entrar.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <figure className="mt-12">
              <div className="overflow-hidden rounded-2xl border border-traco">
                <Image
                  src="/landing/produto/web-painel.webp"
                  alt="Painel do gestor mostrando receita do dia, agendamentos, clientes ativos e ranking de barbeiros"
                  width={1600}
                  height={1000}
                  className="w-full"
                />
              </div>
              <figcaption className="mt-4 text-sm text-cinza">
                <span className="font-bold text-neve">Painel</span>. Quanto entrou hoje, quantos
                agendamentos, quem mais atendeu e quanto sobrou no mês.
              </figcaption>
            </figure>
          </Reveal>

          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <Reveal delay={80}>
              <figure>
                <div className="overflow-hidden rounded-2xl border border-traco">
                  <Image
                    src="/landing/produto/web-agenda.webp"
                    alt="Agenda mensal com os agendamentos de cada barbeiro em cores diferentes"
                    width={1600}
                    height={1000}
                    className="w-full"
                  />
                </div>
                <figcaption className="mt-4 text-sm text-cinza">
                  <span className="font-bold text-neve">Agenda</span>. Cada barbeiro numa cor, com
                  horário bloqueado e encaixe.
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={160}>
              <figure>
                <div className="overflow-hidden rounded-2xl border border-traco">
                  <Image
                    src="/landing/produto/web-financeiro.webp"
                    alt="Tela de financeiro com entradas, saídas e resultado do período"
                    width={1600}
                    height={1000}
                    className="w-full"
                  />
                </div>
                <figcaption className="mt-4 text-sm text-cinza">
                  <span className="font-bold text-neve">Financeiro</span>. Entrada, saída e o que
                  sobrou, sem planilha.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Recorrência, painel amarelo --------------------------------------- */}
      <section className="bg-painel-ouro px-4 py-24 text-preto">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <Etiqueta escuro>Assinatura de clientes</Etiqueta>
            {/* Sem destaque em branco: sobre o amarelo da marca ele fica em
                menos de 2:1 de contraste e some. No painel invertido quem
                grita é o próprio fundo. */}
            <h2 className="tipo-titulo mt-4 text-balance text-[clamp(2.1rem,5.2vw,3.4rem)]">
              Pare de começar o mês do zero
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-preto/80">
              Você vende um plano mensal de cortes. O cliente paga todo mês, tendo vindo ou não,
              e vem mais justamente porque já pagou. O seu mês para de depender do movimento da
              semana.
            </p>

            <div className="mt-8 max-w-md rounded-2xl bg-preto p-6 text-neve">
              <p className="tipo-etiqueta text-[0.6rem] text-cinza">O que entra no dia 1º</p>
              <dl className="mt-5 space-y-3">
                {CONTA.map((linha) => (
                  <div key={linha.rotulo} className="flex items-baseline gap-3">
                    <dt className="text-sm text-cinza">{linha.rotulo}</dt>
                    <span aria-hidden="true" className="min-w-8 flex-1 -translate-y-[3px] border-b border-dotted border-traco-forte" />
                    <dd className="tipo-titulo text-2xl tabular-nums text-neve">{linha.valor}</dd>
                  </div>
                ))}
                <div className="flex items-baseline gap-3 border-t border-traco pt-4">
                  <dt className="text-sm font-semibold text-neve">Entra sem ninguém sentar</dt>
                  <span aria-hidden="true" className="min-w-8 flex-1 -translate-y-[3px] border-b border-dotted border-ouro/40" />
                  <dd className="tipo-titulo-xl text-4xl tabular-nums text-ouro">R$ 3.560</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-cinza-fraco">
                Números de exemplo. Você define o preço e quantos cortes o plano dá; o sistema
                cobra e controla o uso de cada assinante.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="#planos"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-preto px-6 text-sm font-bold text-neve transition-colors hover:bg-preto/85"
              >
                Quero vender assinatura <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs text-preto/75">Está no plano White Label.</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="overflow-hidden rounded-2xl border border-preto/15">
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

      {/* Como começa, sequência de verdade, por isso numerada -------------- */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="tipo-titulo text-balance text-[clamp(2.1rem,5.2vw,3.4rem)] text-neve">
              Como começa
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {PASSOS.map((p, i) => (
              <Reveal key={p.n} delay={i * 90}>
                <div className="sobe h-full rounded-2xl border border-traco bg-carvao p-7 hover:border-ouro/40">
                  {/* O número é marcador de sequência de verdade: montar a
                      barbearia tem ordem. Em 30% de opacidade ele sumia no
                      preto (1:1) e virava enfeite invisível; aqui ele lê. */}
                  <span className="tipo-titulo-xl text-6xl text-ouro/55">{p.n}</span>
                  <h3 className="tipo-titulo mt-4 text-2xl text-neve">{p.titulo}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-cinza">{p.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Planos, painel amarelo, a decisão --------------------------------- */}
      <section id="planos" className="scroll-mt-20 bg-painel-ouro px-4 py-24 text-preto">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 max-w-2xl">
              <Etiqueta escuro>Planos</Etiqueta>
              <h2 className="tipo-titulo mt-4 text-balance text-[clamp(2.1rem,5.2vw,3.4rem)]">
                Escolha o plano e comece agora
              </h2>
              <p className="mt-4 text-preto/70">
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
            <h2 className="tipo-titulo text-balance text-[clamp(2.1rem,5.2vw,3.4rem)] text-neve">
              Perguntas frequentes
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 divide-y divide-traco border-y border-traco">
              {PERGUNTAS.map((f) => (
                <details key={f.p} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-neve transition-colors hover:text-ouro">
                    {f.p}
                    <span className="text-2xl leading-none text-ouro transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cinza">{f.r}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Fecho -------------------------------------------------------------- */}
      <section className="border-t border-traco px-4 py-24">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <RukzLogo orientacao="empilhado" titulo={null} className="mx-auto mb-10 text-[2.4rem] text-neve" />
            <h2 className="tipo-titulo-xl text-[clamp(2.2rem,6vw,3.8rem)] text-neve">
              Organize a barbearia <span className="text-ouro">ainda hoje</span>
            </h2>
            <p className="mt-5 text-cinza">
              Poucos minutos para criar a conta. Sem fidelidade e sem multa para sair.
            </p>
            <a
              href="#planos"
              className="mt-9 inline-flex h-13 items-center gap-2 rounded-xl bg-ouro px-8 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
            >
              Criar minha conta <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-cinza-fraco">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Dados protegidos conforme a LGPD
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-traco px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <RukzLogo className="text-[1.15rem] text-neve" />
          <div className="flex items-center gap-6 text-sm text-cinza">
            <Link href="/termos" className="transition-colors hover:text-neve">Termos</Link>
            <Link href="/privacidade" className="transition-colors hover:text-neve">Privacidade</Link>
            <Link href="/login" className="transition-colors hover:text-neve">Entrar</Link>
          </div>
          <p className="text-xs text-cinza-fraco">2026 rukz. Todos os direitos reservados.</p>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
