import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, Wallet, Bell, Sparkles, Smartphone,
  Repeat, Star, ShieldCheck, ArrowRight, Scissors,
} from "lucide-react";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { SignupInline } from "@/components/landing/SignupInline";

// Landing do CORTIX.
//
// A página tem um objetivo só: fechar assinatura. Por isso o cadastro mora
// aqui dentro, e não atrás de um link. Cada página entre a decisão e a conta é
// gente que some no caminho.
//
// As imagens são capturas do produto rodando, não ilustração. Barbearia
// desconfia de tela bonita que não existe, e com razão.

export const metadata = {
  title: "CORTIX | Sistema de gestão para barbearias",
  description:
    "Agenda online, lembrete automático, financeiro e app com a sua marca. O sistema que organiza sua barbearia e traz o cliente de volta.",
};

const NUMEROS = [
  { valor: "24 horas", rotulo: "agenda aberta, mesmo com a barbearia fechada" },
  { valor: "1 toque", rotulo: "para o cliente remarcar sem precisar ligar" },
  { valor: "Automático", rotulo: "lembrete de horário e retorno de quem sumiu" },
];

const RECURSOS = [
  {
    icone: CalendarDays,
    titulo: "Agenda que ninguém fura",
    texto: "Cada barbeiro tem a própria agenda, com horário bloqueado, encaixe e arrastar para remarcar. Acabou o caderno com rasura.",
  },
  {
    icone: Bell,
    titulo: "Lembrete que derruba a falta",
    texto: "Confirmação e aviso automáticos antes do horário. Quem esquece é lembrado, e a cadeira não fica vazia.",
  },
  {
    icone: Repeat,
    titulo: "Assinatura de clientes",
    texto: "Venda um plano mensal de cortes. Receita que entra todo mês, mesmo na semana fraca, e cliente que volta sem você pedir.",
  },
  {
    icone: Wallet,
    titulo: "Financeiro sem planilha",
    texto: "Entrada, saída, comissão por barbeiro e ticket médio calculados sozinhos. Você abre e já sabe quanto sobrou.",
  },
  {
    icone: Sparkles,
    titulo: "Copiloto que age",
    texto: "Ele acha o horário parado e o cliente sumido, e chama de volta. Você aprova, ou deixa no automático.",
  },
  {
    icone: Smartphone,
    titulo: "App com a sua marca",
    texto: "No plano White Label o cliente instala o seu app, com o seu nome, a sua logo e a sua cor. Não o nosso.",
  },
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
    r: "Sim. Um dono pode ter várias unidades na mesma conta, cada uma com sua agenda, sua equipe e seu caixa.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-900/80 bg-zinc-950/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <Scissors className="h-4 w-4 text-zinc-950" />
            </span>
            <span className="text-lg font-black tracking-tight text-white">CORTIX</span>
          </span>
          <div className="flex items-center gap-5">
            <a href="#recursos" className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block">Recursos</a>
            <a href="#cadastro" className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block">Planos</a>
            <Link href="/login" className="text-sm text-zinc-400 transition-colors hover:text-white">Entrar</Link>
            <a href="#cadastro" className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400">
              Começar
            </a>
          </div>
        </nav>
      </header>

      <section className="px-4 pb-16 pt-32 sm:pt-36">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Sua barbearia cheia, sem você correr atrás
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
              Agenda aberta 24 horas, lembrete automático que derruba a falta e assinatura mensal
              que traz receita todo mês. Tudo num sistema só, feito para barbearia.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#cadastro" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400">
                Criar minha conta <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#por-dentro" className="inline-flex h-12 items-center rounded-xl border border-zinc-800 px-6 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white">
                Ver o sistema por dentro
              </a>
            </div>
            <dl className="mt-10 grid gap-5 border-t border-zinc-900 pt-6 sm:grid-cols-3">
              {NUMEROS.map((n) => (
                <div key={n.valor}>
                  <dt className="text-lg font-semibold text-white">{n.valor}</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-zinc-500">{n.rotulo}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-[248px] rounded-[2.2rem] border-[10px] border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/60 sm:w-[276px]">
              <Image
                src="/landing/produto/app-entrada.webp"
                alt="Tela de entrada do app da barbearia, com a logo e a cor da própria marca"
                width={560}
                height={1212}
                className="rounded-[1.6rem]"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section id="por-dentro" className="scroll-mt-20 border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">O sistema por dentro</h2>
            <p className="mt-3 text-zinc-400">
              As imagens abaixo são do produto rodando, sem montagem. É o que você vê ao entrar.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800">
            <Image
              src="/landing/produto/web-painel.webp"
              alt="Painel do gestor mostrando receita do dia, agendamentos, clientes ativos e ranking de barbeiros"
              width={1600}
              height={1000}
              className="w-full"
            />
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Painel: quanto entrou hoje, quantos agendamentos, quem mais atendeu e quanto sobrou no mês.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <figure>
              <div className="overflow-hidden rounded-2xl border border-zinc-800">
                <Image
                  src="/landing/produto/web-agenda.webp"
                  alt="Agenda mensal com os agendamentos de cada barbeiro em cores diferentes"
                  width={1600}
                  height={1000}
                  className="w-full"
                />
              </div>
              <figcaption className="mt-3 text-sm text-zinc-500">
                Agenda: cada barbeiro numa cor, com horário bloqueado e encaixe.
              </figcaption>
            </figure>
            <figure>
              <div className="overflow-hidden rounded-2xl border border-zinc-800">
                <Image
                  src="/landing/produto/web-financeiro.webp"
                  alt="Tela de financeiro com entradas, saídas e resultado do período"
                  width={1600}
                  height={1000}
                  className="w-full"
                />
              </div>
              <figcaption className="mt-3 text-sm text-zinc-500">
                Financeiro: entrada, saída e o que sobrou, sem planilha.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="recursos" className="scroll-mt-20 border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">O que ele resolve</h2>
            <p className="mt-3 text-zinc-400">Cada recurso nasceu de um problema que barbearia tem todo dia.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Icone className="h-5 w-5 text-amber-400" />
                </span>
                <h3 className="mt-4 font-semibold text-white">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
              <Repeat className="h-3.5 w-3.5" /> Receita recorrente
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pare de começar o mês do zero
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-400">
              Com a assinatura de clientes você vende um plano mensal de cortes. O cliente paga
              todo mês e vem com mais frequência, porque já pagou. Você troca a montanha-russa do
              movimento por uma base que entra sozinha.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Você define quantos cortes o plano dá por mês e o preço",
                "O cliente assina pelo app e o sistema controla o uso",
                "Quem assina volta mais, e sai menos para o concorrente",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
            <a href="#cadastro" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400">
              Quero vender assinatura <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <Image
              src="/landing/produto/web-clientes.webp"
              alt="Lista de clientes da barbearia com histórico e informações de contato"
              width={1600}
              height={1000}
              className="w-full"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Como começa</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PASSOS.map((p) => (
              <div key={p.n} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-zinc-950">
                  {p.n}
                </span>
                <h3 className="mt-4 font-semibold text-white">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cadastro" className="scroll-mt-20 border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <SignupInline />
        </div>
      </section>

      <section className="border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Perguntas frequentes</h2>
          <div className="mt-8 divide-y divide-zinc-900 border-y border-zinc-900">
            {PERGUNTAS.map((f) => (
              <details key={f.p} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">
                  {f.p}
                  <span className="text-lg text-zinc-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Organize a barbearia ainda hoje
          </h2>
          <p className="mt-4 text-zinc-400">
            Poucos minutos para criar a conta. Sem fidelidade e sem multa para sair.
          </p>
          <a href="#cadastro" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-7 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400">
            Criar minha conta <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Dados protegidos conforme a LGPD
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-900 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
              <Scissors className="h-3.5 w-3.5 text-zinc-950" />
            </span>
            <span className="font-bold tracking-tight text-white">CORTIX</span>
          </span>
          <div className="flex items-center gap-5 text-sm text-zinc-500">
            <Link href="/termos" className="transition-colors hover:text-zinc-300">Termos</Link>
            <Link href="/privacidade" className="transition-colors hover:text-zinc-300">Privacidade</Link>
            <Link href="/login" className="transition-colors hover:text-zinc-300">Entrar</Link>
          </div>
          <p className="text-xs text-zinc-600">2026 CORTIX. Todos os direitos reservados.</p>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
