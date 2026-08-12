import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { RukzLogo } from "@/components/brand/RukzLogo";
import { Reveal } from "@/components/landing/Reveal";
import { DiaNaCadeira } from "@/components/landing/DiaNaCadeira";
import { TelasDoSistema, type Tela } from "@/components/landing/TelasDoSistema";
import { VideoCopiloto } from "@/components/landing/VideoCopiloto";
import { Planos } from "@/components/landing/Planos";
import { BotaoPreferenciasCookies } from "@/components/landing/CookieConsent";

/**
 * A landing do rukz.
 *
 * A página tem um alvo só: fechar assinatura. Por isso a decisão inteira mora
 * aqui dentro, planos, comparação e cadastro, sem mandar ninguém para outra
 * aba no momento em que já disse sim.
 *
 * A identidade é a da marca, e ela é seca: preto, branco e o amarelo da logo,
 * sem gradiente em lugar nenhum. Duas regras dão o resto do desenho.
 *
 * A primeira é tipográfica: letra é Outfit, número é fonte de dado. Hora,
 * preço, valor e limite saem em `tipo-dado`, com dígito de largura fixa. É a
 * mesma separação que a barbearia já faz no papel, o serviço escrito à mão e o
 * valor na coluna, e é o que dá textura à página sem precisar de enfeite.
 *
 * A segunda é de superfície: existe um único bloco amarelo em cheio, o dos
 * planos. Amarelo é o gesto mais forte da identidade, e ele fica guardado para
 * o momento em que a pessoa escolhe. Todo o resto se separa por filete.
 *
 * As imagens são captura do produto rodando, não ilustração, e o que é
 * demonstração está marcado como exemplo na cara do bloco. Barbearia desconfia
 * de tela bonita que não existe, e com razão.
 */

export const metadata = {
  title: "rukz | Sistema de gestão para barbearia",
  description:
    "Agenda, caixa, equipe e retorno do cliente no mesmo sistema. Painel na web, app do barbeiro e app do cliente, copiloto com IA e assinatura de clientes. A partir de R$ 50 por mês, sem fidelidade.",
};

const TELAS: Tela[] = [
  {
    src: "/landing/produto/web-painel.webp",
    alt: "Painel do gestor com receita do dia, agendamentos, clientes ativos e ranking de barbeiros",
    aba: "Painel",
    caminho: "/dashboard",
    legenda:
      "Quanto entrou hoje, quantos agendamentos, quem mais atendeu e como o mês está fechando, tudo na primeira tela que abre.",
  },
  {
    src: "/landing/produto/web-agenda.webp",
    alt: "Agenda mensal com os agendamentos de cada barbeiro em cores diferentes",
    aba: "Agenda",
    caminho: "/dashboard/appointments",
    legenda:
      "Cada barbeiro numa cor, com horário bloqueado, encaixe e remarcação arrastando o atendimento para o novo horário.",
  },
  {
    src: "/landing/produto/web-financeiro.webp",
    alt: "Tela de financeiro com entradas, saídas e resultado do período",
    aba: "Financeiro",
    caminho: "/dashboard/finance",
    legenda:
      "Entrada, saída, forma de pagamento e o que sobrou no período, somados sozinhos. Nenhuma planilha paralela.",
  },
  {
    src: "/landing/produto/web-clientes.webp",
    alt: "Lista de clientes da barbearia com histórico e informações de contato",
    aba: "Clientes",
    caminho: "/dashboard/clients",
    legenda:
      "Ficha com histórico, frequência e contato, para você perceber quem está sumindo antes de perder o cliente.",
  },
];

// Os dezenove módulos que a barbearia encontra no menu do painel. A lista é a
// do produto, na ordem em que ela faz sentido para quem compra, e não na ordem
// em que foi construída.
const MODULOS = [
  {
    grupo: "Agenda e atendimento",
    itens: [
      { nome: "Agendamentos", texto: "Agenda por barbeiro, com bloqueio de horário, encaixe e remarcação arrastando." },
      { nome: "Fila de espera", texto: "Quem ficou sem horário entra na fila e é chamado quando abre uma vaga." },
      { nome: "Serviços", texto: "Preço, duração e comissão de cada corte, barba e combo." },
      { nome: "Equipe", texto: "Cada barbeiro com login próprio, horário de trabalho e regra de comissão." },
      { nome: "Avaliações", texto: "Nota e comentário depois do atendimento, reunidos num lugar só." },
    ],
  },
  {
    grupo: "Dinheiro",
    itens: [
      { nome: "Financeiro", texto: "Entrada, saída, forma de pagamento e resultado do período." },
      { nome: "Relatórios", texto: "Ticket médio, serviço mais vendido, desempenho por barbeiro e exportação." },
      { nome: "Nota fiscal", texto: "Emissão da nota do serviço a partir do atendimento já fechado." },
      { nome: "Estoque", texto: "Saldo de pomada, lâmina e talco, com alerta antes de acabar." },
      { nome: "Assinaturas", texto: "Plano mensal de cortes vendido ao cliente, cobrado e controlado sozinho." },
    ],
  },
  {
    grupo: "O cliente e o retorno",
    itens: [
      { nome: "Clientes", texto: "Ficha com histórico, preferência, frequência e contato." },
      { nome: "Fidelidade", texto: "Pontos por atendimento, cartela e prêmio por indicação." },
      { nome: "Marketing", texto: "Campanha de aniversário, de retorno e de recuperação de quem sumiu." },
      { nome: "WhatsApp", texto: "Atendimento, confirmação e agendamento pelo número da barbearia." },
      { nome: "Divulgação", texto: "Link e QR code de agendamento, com a origem de cada cliente novo." },
    ],
  },
  {
    grupo: "Marca e rede",
    itens: [
      { nome: "Painel", texto: "O dia da barbearia resumido: caixa, agenda e equipe na abertura." },
      { nome: "Aparência do app", texto: "Nome, logo, cor e fonte do aplicativo que o seu cliente abre." },
      { nome: "Unidades", texto: "Mais de uma loja na mesma conta, cada uma com o próprio caixa." },
      { nome: "Suporte", texto: "Chamado aberto direto do painel, com o histórico da conversa." },
    ],
  },
];

// O mesmo aplicativo, os três papéis que entram nele. São capturas do app
// rodando, cada uma na conta de quem usa aquela tela todo dia.
const TELAS_APP = [
  {
    src: "/landing/produto/app-gestor.webp",
    alt: "Tela inicial do dono no aplicativo, com o que já entrou hoje, o que ainda entra, a ocupação da agenda e o faturamento do mês contra a meta",
    quem: "O dono",
    legenda: "Abre o caixa do dia e a meta do mês de onde estiver.",
  },
  {
    src: "/landing/produto/app-barbeiro.webp",
    alt: "Tela inicial do barbeiro no aplicativo, com a comissão do mês, os atendimentos concluídos, a avaliação média e o próximo cliente",
    quem: "O barbeiro",
    legenda: "Vê a própria comissão e fecha o atendimento na cadeira.",
  },
  {
    src: "/landing/produto/app-cliente.webp",
    alt: "Tela inicial do cliente no aplicativo, com o próximo atendimento marcado, o barbeiro, o horário e o saldo de pontos de fidelidade",
    quem: "O cliente",
    legenda: "Vê o próximo corte, remarca sozinho e acompanha os pontos.",
  },
];

// A sequência de um atendimento no celular, na ordem em que ela acontece. É
// numerada porque a ordem carrega informação: cada passo depende do anterior.
const ATENDIMENTO = [
  "O cliente manda a foto do corte que quer, e a IA devolve a leitura técnica antes de você ligar a máquina.",
  "Ele acompanha a fila ao vivo, com a posição dele e quanto falta para sentar na cadeira.",
  "No fechamento você registra a receita do corte: máquina, acabamento, produto e observação.",
  "A foto do resultado cai sozinha na carteira de cortes do cliente, em antes e depois.",
  "Se ele quiser agradecer, a gorjeta vai por PIX e entra direto no ganho do barbeiro.",
];

const PERGUNTAS = [
  {
    p: "Preciso ter CNPJ?",
    r: "Sim. O cadastro exige CNPJ válido, e cada CNPJ abre uma barbearia. É o que garante que do outro lado existe um negócio de verdade.",
  },
  {
    p: "Tem período de teste grátis?",
    r: "Não. O preço é o mesmo desde o primeiro dia e a saída é livre: sem fidelidade, sem carência e sem multa. Preferimos isso a teste que vira cobrança esquecida.",
  },
  {
    p: "Meu cliente precisa baixar aplicativo?",
    r: "Não. Ele agenda pelo link, direto do navegador, sem instalar nada. Se quiser, coloca o app na tela de início do celular em dois toques.",
  },
  {
    p: "E o barbeiro, como usa?",
    r: "Pelo app do barbeiro, no celular dele. Vê a agenda do dia, muda o status do atendimento, registra a receita do corte, tira a foto do resultado e acompanha os próprios ganhos e gorjetas.",
  },
  {
    p: "Consigo trocar de plano depois?",
    r: "Sim, a qualquer momento e pelo próprio painel. Você sobe quando a equipe crescer e desce se precisar, sem perder nada do que já está cadastrado.",
  },
  {
    p: "A inteligência artificial está inclusa no preço?",
    r: "Está, nos planos Pro e White Label, com teto diário para o custo não fugir do controle: 40 conversas por dia no Pro e 80 no White Label. No Essencial o copiloto não é liberado.",
  },
  {
    p: "E a nota fiscal?",
    r: "O sistema emite a nota do serviço a partir do atendimento já fechado, usando a conta que a sua barbearia tem na Focus NFe ou na NFE.io. Enquanto não houver provedor conectado, a emissão fica em modo de teste.",
  },
  {
    p: "Serve para mais de uma unidade?",
    r: "Serve, no plano White Label. Um dono tem várias unidades na mesma conta, cada uma com a própria agenda, equipe e caixa, e compara o desempenho lado a lado.",
  },
  {
    p: "E se eu quiser sair?",
    r: "Você cancela pelo painel, sem ligação de retenção. Os dados continuam seus, e a exportação está liberada nos planos Pro e White Label.",
  },
];

const NAVEGACAO = [
  { rotulo: "Painel", alvo: "#painel" },
  { rotulo: "Módulos", alvo: "#modulos" },
  { rotulo: "No celular", alvo: "#celular" },
  { rotulo: "Planos", alvo: "#planos" },
  { rotulo: "Dúvidas", alvo: "#duvidas" },
];

/**
 * A coluna estreita que abre cada seção.
 *
 * Ela carrega duas informações de verdade, o assunto da seção e uma medida
 * dele, e não um enfeite numerado. Fica presa no alto enquanto a seção passa,
 * então em qualquer ponto da rolagem dá para saber onde se está.
 */
function Trilho({ rotulo, medida }: { rotulo: string; medida: string }) {
  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <p className="tipo-etiqueta text-[0.6rem] text-ouro">{rotulo}</p>
      <p className="tipo-dado mt-2 text-[13px] text-cinza-fraco">{medida}</p>
    </div>
  );
}

export default function Home() {
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-preto">
      {/* Sem JavaScript o .reveal esconderia a página inteira. Animação nunca
          pode ser condição para o conteúdo existir. */}
      <noscript>
        <style>{`.reveal{opacity:1 !important;transform:none !important}.linha-sobe{transform:none !important}`}</style>
      </noscript>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-traco bg-preto/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-[76rem] items-center gap-8 px-5 sm:px-8">
          <Link href="/" aria-label="rukz, início" className="shrink-0 text-neve">
            <RukzLogo titulo={null} className="text-[1.3rem]" />
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {NAVEGACAO.map((n) => (
              <a
                key={n.alvo}
                href={n.alvo}
                className="text-sm font-medium text-cinza transition-colors hover:text-neve"
              >
                {n.rotulo}
              </a>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-5">
            <Link href="/login" className="text-sm font-medium text-cinza transition-colors hover:text-neve">
              Entrar
            </Link>
            <a
              href="#planos"
              className="rounded-lg bg-ouro px-4 py-2 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
            >
              Criar conta
            </a>
          </div>
        </nav>
      </header>

      {/* Topo --------------------------------------------------------------- */}
      <section className="mx-auto max-w-[76rem] px-5 pb-20 pt-32 sm:px-8 sm:pt-40">
        <Reveal>
          <p className="tipo-etiqueta flex items-center gap-3 text-[0.62rem] text-ouro">
            <span className="h-px w-8 bg-ouro/50" />
            Sistema de gestão para barbearia
          </p>
        </Reveal>

        <Reveal apenasMarcar>
          {/* Sem limite de largura: a primeira linha tem 22 caracteres e, no
              corpo máximo, pede 1003px. Presa em `max-w-4xl` ela quebrava em
              duas, e a quebra dentro do recorte estraga a subida da linha. O
              corpo cresce por `vw`, na mesma proporção do container, então a
              linha continua inteira em qualquer largura de tela. */}
          <h1 className="tipo-titulo-xl mt-6 text-[clamp(2.9rem,8.4vw,6rem)] text-neve">
            <span className="linha-recorte">
              <span className="linha-sobe">Quem controla a agenda</span>
            </span>
            <span className="linha-recorte">
              <span className="linha-sobe text-ouro" style={{ transitionDelay: "110ms" }}>
                controla o mês.
              </span>
            </span>
          </h1>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <Reveal delay={160}>
            <p className="max-w-xl text-[1.15rem] leading-relaxed text-cinza">
              O rukz junta agenda, caixa, equipe e retorno do cliente no mesmo lugar. Você abre o celular e já
              sabe quanto entrou hoje, quem vem amanhã e quem parou de aparecer.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="lg:text-right">
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <a
                  href="#planos"
                  className="inline-flex h-13 items-center gap-2 rounded-xl bg-ouro px-7 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
                >
                  Escolher meu plano <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="#painel"
                  className="inline-flex h-13 items-center rounded-xl border border-traco-forte px-6 text-sm font-bold text-neve transition-colors hover:border-ouro hover:text-ouro"
                >
                  Ver o painel
                </a>
              </div>
              <p className="mt-4 text-[13px] text-cinza-fraco">
                Sem fidelidade e sem taxa de adesão. O cancelamento é pelo próprio painel.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={320}>
          <DiaNaCadeira />
        </Reveal>
      </section>

      {/* O painel por dentro ------------------------------------------------ */}
      <section id="painel" className="scroll-mt-16 border-t border-traco">
        <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <Trilho rotulo="O painel" medida="4 telas" />
          <div>
            <Reveal>
              <h2 className="tipo-titulo max-w-2xl text-[clamp(2rem,5vw,3.2rem)] text-neve">
                O painel é este. Sem montagem.
              </h2>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-cinza">
                Cada imagem é uma captura do sistema rodando, com o endereço real da tela na barra de cima. É
                o que abre depois de você criar a conta, e não uma arte feita para a propaganda.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-12">
                <TelasDoSistema telas={TELAS} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Os módulos --------------------------------------------------------- */}
      <section id="modulos" className="scroll-mt-16 border-t border-traco">
        <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <Trilho rotulo="O que vem junto" medida="19 módulos" />
          <div>
            <Reveal>
              <h2 className="tipo-titulo max-w-2xl text-[clamp(2rem,5vw,3.2rem)] text-neve">
                Dezenove módulos, uma assinatura só.
              </h2>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-cinza">
                Nada cobrado à parte depois de assinar. O que muda entre os planos é o tamanho da equipe e o
                que fica liberado, e isso está aberto linha a linha na tabela dos planos.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-x-14 gap-y-12 sm:grid-cols-2">
              {MODULOS.map((bloco, i) => (
                <Reveal key={bloco.grupo} delay={i * 70}>
                  <h3 className="tipo-etiqueta border-b border-traco pb-3 text-[0.6rem] text-cinza">
                    {bloco.grupo}
                  </h3>
                  <ul className="divide-y divide-traco">
                    {bloco.itens.map((item) => (
                      <li key={item.nome} className="py-4">
                        <p className="font-semibold text-neve">{item.nome}</p>
                        <p className="mt-1 text-[14px] leading-relaxed text-cinza">{item.texto}</p>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Copiloto ----------------------------------------------------------- */}
      <section className="border-t border-traco">
        <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <Trilho rotulo="Copiloto" medida="Pro e White Label" />
          <div>
            <Reveal>
              <h2 className="tipo-titulo max-w-3xl text-[clamp(2rem,5vw,3.2rem)] text-neve">
                Fale como você falaria com a recepção.
              </h2>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-cinza">
                No vídeo, o dono avisa que vai fechar amanhã depois das 15h. O copiloto abre a agenda, lista
                os nove clientes marcados naquela faixa com nome, serviço e barbeiro, avisa quanto isso custa,
                pede confirmação, bloqueia o horário e manda o pedido de remarcação para os nove. Quem tinha
                horário de manhã não recebe nada, porque não foi afetado.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-12">
                <VideoCopiloto />
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="mt-10 grid max-w-3xl gap-x-12 gap-y-6 sm:grid-cols-2">
                <p className="text-[15px] leading-relaxed text-cinza">
                  Ele não devolve conselho, ele executa: bloqueia horário, remarca, avisa cliente por cliente,
                  confirma a agenda de amanhã, chama a fila de espera e dispara a mensagem para quem sumiu.
                  Sempre perguntando antes, e sempre dizendo depois o que fez e para quem.
                </p>
                <p className="text-[15px] leading-relaxed text-cinza">
                  Nas outras perguntas ele responde com o seu número: fecha o meu mês, monta a escala da
                  semana pela demanda, mostra onde o dinheiro está parado, simula o que muda se eu subir o
                  preço em 10%. É a sua base respondendo, não conselho solto da internet.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* No celular --------------------------------------------------------- */}
      <section id="celular" className="scroll-mt-16 border-t border-traco">
        <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <Trilho rotulo="No celular" medida="cliente, barbeiro e dono" />
          <div>
            <Reveal>
              <h2 className="tipo-titulo max-w-2xl text-[clamp(2rem,5vw,3.2rem)] text-neve">
                O corte tem ficha técnica.
              </h2>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-cinza">
                O cliente marca pelo link, direto do navegador, sem instalar nada. Quem quiser entra no app,
                que abre pelo endereço e fica na tela de início em dois toques, sem depender de loja de
                aplicativo. É um app só, com três entradas: a sua, a do barbeiro e a do cliente.
              </p>
            </Reveal>

            <div className="mt-14">
              <Reveal>
                {/* No celular, três telas lado a lado dariam 110px cada, onde
                    nada se lê. Vira carrossel de arrastar, com o próximo
                    espiando na borda para avisar que tem mais; a partir de `sm`
                    volta a ser grade, que é quando as três cabem inteiras. */}
                <div className="arrasta -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
                  {TELAS_APP.map((t) => (
                    <figure key={t.src} className="w-[72%] shrink-0 snap-center sm:w-auto">
                      <div className="overflow-hidden rounded-[1.6rem] border-[7px] border-grafite bg-carvao shadow-2xl shadow-black/70 sm:rounded-[2rem] sm:border-[9px]">
                        <Image
                          src={t.src}
                          alt={t.alt}
                          width={520}
                          height={1125}
                          className="w-full rounded-[1.1rem] sm:rounded-[1.4rem]"
                          unoptimized
                        />
                      </div>
                      <figcaption className="mt-3">
                        <span className="block text-sm font-semibold text-neve">{t.quem}</span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-cinza-fraco">
                          {t.legenda}
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <p className="tipo-etiqueta mt-3 text-[0.55rem] text-cinza-fraco sm:hidden">
                  arraste para ver as três
                </p>
              </Reveal>

              <Reveal delay={120}>
                <div className="mt-16 max-w-3xl">
                  <h3 className="tipo-etiqueta text-[0.6rem] text-ouro">Um atendimento, do começo ao fim</h3>
                  <ol className="mt-5 divide-y divide-traco border-y border-traco">
                    {ATENDIMENTO.map((passo, i) => (
                      <li key={passo} className="flex gap-5 py-5">
                        <span className="tipo-dado shrink-0 pt-0.5 text-[13px] text-ouro">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="text-[15px] leading-relaxed text-neve">{passo}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-cinza">
                    Na visita seguinte o barbeiro abre a última receita daquele cliente e repete o corte
                    igual, sem depender de memória nem de foto perdida na galeria.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Recorrência -------------------------------------------------------- */}
      <section className="border-t border-traco">
        <div className="mx-auto grid max-w-[76rem] items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:gap-20">
          <Reveal>
            <p className="tipo-etiqueta text-[0.6rem] text-ouro">Assinatura de clientes</p>
            <h2 className="tipo-titulo mt-4 max-w-lg text-[clamp(1.8rem,4vw,2.6rem)] text-neve">
              Comece o mês com dinheiro já dentro.
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-cinza">
              Você monta um plano mensal de cortes, define o preço e quantos atendimentos ele dá. O sistema
              cobra, controla o uso de cada assinante e avisa quando um deles para de aparecer. O cliente vem
              mais justamente porque já pagou, e o seu mês deixa de depender do movimento da semana.
            </p>
            <p className="tipo-dado mt-6 text-[13px] text-cinza-fraco">Disponível no plano White Label</p>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-xl border border-traco bg-carvao p-6 sm:p-8">
              <p className="tipo-etiqueta text-[0.6rem] text-cinza">O que cai todo dia 1º</p>
              <dl className="mt-6 space-y-4">
                <div className="flex items-baseline gap-3 text-cinza">
                  <dt className="text-sm">Assinantes</dt>
                  <span aria-hidden="true" className="guia" />
                  <dd className="tipo-dado text-xl font-semibold text-neve">40</dd>
                </div>
                <div className="flex items-baseline gap-3 text-cinza">
                  <dt className="text-sm">Mensalidade do plano</dt>
                  <span aria-hidden="true" className="guia" />
                  <dd className="tipo-dado text-xl font-semibold text-neve">R$ 89</dd>
                </div>
                <div className="flex items-baseline gap-3 border-t border-traco pt-4 text-ouro">
                  <dt className="text-sm font-semibold text-neve">Entra sem ninguém sentar</dt>
                  <span aria-hidden="true" className="guia" />
                  <dd className="tipo-dado text-3xl font-bold text-ouro">R$ 3.560</dd>
                </div>
              </dl>
              <p className="mt-6 border-t border-traco pt-4 text-xs leading-relaxed text-cinza-fraco">
                Números de exemplo. Quem define o preço e o tamanho do plano é você.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Planos, o único bloco amarelo da página ---------------------------- */}
      <section id="planos" className="scroll-mt-16 bg-painel-ouro text-preto">
        <div className="mx-auto max-w-[76rem] px-5 py-24 sm:px-8 sm:py-32">
          <Reveal>
            <p className="tipo-etiqueta flex items-center gap-3 text-[0.62rem] text-preto/70">
              <span className="h-px w-8 bg-preto/40" />
              Planos
            </p>
            <h2 className="tipo-titulo mt-5 max-w-3xl text-[clamp(2.2rem,5.6vw,3.6rem)]">
              Três planos, e o preço não muda depois.
            </h2>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-preto/75">
              Escolha um e a tabela compara ele com os outros dois, linha a linha. A coluna que acende é
              sempre a do plano que você escolheu.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-14">
              <Planos />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dúvidas ------------------------------------------------------------ */}
      <section id="duvidas" className="scroll-mt-16">
        <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <Trilho rotulo="Dúvidas" medida={`${PERGUNTAS.length} perguntas`} />
          <div className="max-w-3xl">
            <Reveal>
              <h2 className="tipo-titulo text-[clamp(2rem,5vw,3.2rem)] text-neve">
                O que todo dono pergunta antes de assinar
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-10 divide-y divide-traco border-y border-traco">
                {PERGUNTAS.map((f) => (
                  <details key={f.p} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.05rem] font-semibold text-neve transition-colors hover:text-ouro">
                      {f.p}
                      <span
                        aria-hidden="true"
                        className="text-2xl leading-none text-ouro transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cinza">{f.r}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Fecho -------------------------------------------------------------- */}
      <section className="border-t border-traco">
        <div className="mx-auto max-w-[76rem] px-5 py-24 sm:px-8 sm:py-32">
          <Reveal>
            <h2 className="tipo-titulo-xl max-w-3xl text-[clamp(2.4rem,6.5vw,4.6rem)] text-neve">
              A próxima terça pode ser <span className="text-ouro">diferente</span>.
            </h2>
            <p className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-cinza">
              Criar a conta leva poucos minutos. Você escolhe o plano, cadastra equipe e serviços, e sai com o
              link de agendamento pronto para mandar no Instagram e no WhatsApp.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#planos"
                className="inline-flex h-13 items-center gap-2 rounded-xl bg-ouro px-8 text-sm font-bold text-preto transition-colors hover:bg-ouro-claro"
              >
                Escolher meu plano <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <p className="text-[13px] text-cinza-fraco">Dados tratados conforme a LGPD.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-traco">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <RukzLogo className="text-[1.2rem] text-neve" />
              <p className="mt-4 max-w-[16rem] text-[13px] leading-relaxed text-cinza">
                Sistema de gestão para barbearia. Painel na web, app do barbeiro e app do cliente.
              </p>
            </div>

            <nav aria-label="Sistema">
              <p className="tipo-etiqueta text-[0.55rem] text-cinza-fraco">Sistema</p>
              <ul className="mt-4 space-y-2.5">
                {NAVEGACAO.map((n) => (
                  <li key={n.alvo}>
                    <a href={n.alvo} className="text-sm text-cinza transition-colors hover:text-neve">
                      {n.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Conta">
              <p className="tipo-etiqueta text-[0.55rem] text-cinza-fraco">Conta</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link href="/login" className="text-sm text-cinza transition-colors hover:text-neve">
                    Entrar
                  </Link>
                </li>
                <li>
                  <a href="#planos" className="text-sm text-cinza transition-colors hover:text-neve">
                    Criar conta
                  </a>
                </li>
                {whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                        "Olá! Vi o rukz e quero saber mais sobre os planos."
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cinza transition-colors hover:text-neve"
                    >
                      Falar no WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </nav>

            <nav aria-label="Legal">
              <p className="tipo-etiqueta text-[0.55rem] text-cinza-fraco">Legal</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link href="/termos" className="text-sm text-cinza transition-colors hover:text-neve">
                    Termos de uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacidade" className="text-sm text-cinza transition-colors hover:text-neve">
                    Política de privacidade
                  </Link>
                </li>
                <li>
                  <BotaoPreferenciasCookies className="text-sm text-cinza transition-colors hover:text-neve" />
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-traco pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="tipo-dado text-xs text-cinza-fraco">rukz.com.br</p>
            <p className="text-xs text-cinza-fraco">2026 rukz. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
