"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

/**
 * Os planos, a tabela de comparação e o cadastro, no mesmo bloco.
 *
 * A página inteira desce até aqui, então aqui a pessoa precisa poder decidir
 * sem abrir outra aba. Os três cartões dão o preço, a tabela dá a diferença
 * linha a linha, e o formulário fecha. Escolher um plano acende a coluna dele
 * na tabela: a comparação passa a ser sempre contra o que a pessoa já escolheu,
 * em vez de uma grade morta de três colunas iguais.
 *
 * Isto mora dentro do painel amarelo, o único da página. É o contraste mais
 * forte que a identidade tem, e está reservado para o momento da decisão.
 *
 * O que a tabela promete é o que o sistema libera de verdade: as linhas saem de
 * FEATURES_BY_PLAN e dos limites de PLAN_INFO (src/context/PlanContext.tsx). Se
 * um plano deixar de liberar algo lá, a linha aqui muda junto. Prometer na
 * landing o que a tela bloqueia depois é o jeito mais rápido de perder um
 * cliente que já pagou.
 */

type Valor = boolean | string;

const PLANOS = [
  {
    valor: "starter",
    nome: "Essencial",
    preco: "50",
    paraQuem: "Para a barbearia que está botando a casa em ordem",
    limite: "Até 3 barbeiros",
    tag: null as string | null,
  },
  {
    valor: "pro",
    nome: "Pro",
    preco: "350",
    paraQuem: "Para quem já tem equipe e quer crescer com número na mão",
    limite: "Até 10 barbeiros",
    tag: "Copiloto com IA incluso",
  },
  {
    valor: "white-label",
    nome: "White Label",
    preco: "897",
    paraQuem: "Para rede, marca própria e receita recorrente",
    limite: "Barbeiros ilimitados",
    tag: "App com a sua marca",
  },
];

const GRUPOS: { titulo: string; linhas: { nome: string; valores: [Valor, Valor, Valor] }[] }[] = [
  {
    titulo: "Agenda e atendimento",
    linhas: [
      { nome: "Agenda online com link próprio", valores: [true, true, true] },
      { nome: "Agendamentos por mês", valores: ["Ilimitado", "Ilimitado", "Ilimitado"] },
      { nome: "Barbeiros na equipe", valores: ["3", "10", "Ilimitado"] },
      { nome: "Confirmação e lembrete automáticos", valores: [true, true, true] },
      { nome: "Fila de espera e encaixe", valores: [true, true, true] },
      { nome: "Avaliação depois do atendimento", valores: [true, true, true] },
    ],
  },
  {
    titulo: "O seu cliente",
    linhas: [
      { nome: "Ficha com histórico e preferência", valores: [true, true, true] },
      { nome: "Fidelidade por pontos e cartela", valores: [true, true, true] },
      { nome: "App do cliente e app do barbeiro", valores: [true, true, true] },
      { nome: "Carteira de cortes com antes e depois", valores: [true, true, true] },
      { nome: "Receita do corte salva por cliente", valores: [true, true, true] },
      { nome: "Gorjeta por PIX", valores: [true, true, true] },
    ],
  },
  {
    titulo: "Dinheiro",
    linhas: [
      { nome: "Caixa do dia", valores: [true, true, true] },
      { nome: "Nota fiscal de serviço", valores: [true, true, true] },
      { nome: "Financeiro completo, entrada e saída", valores: [false, true, true] },
      { nome: "Comissão por barbeiro", valores: [false, true, true] },
      { nome: "Relatórios avançados e exportação", valores: [false, true, true] },
      { nome: "Estoque com alerta de reposição", valores: [false, true, true] },
    ],
  },
  {
    titulo: "Trazer o cliente de volta",
    linhas: [
      { nome: "Campanhas de retorno e aniversário", valores: [false, true, true] },
      { nome: "Copiloto com IA", valores: [false, "40 conversas por dia", "80 conversas por dia"] },
      { nome: "WhatsApp com as suas respostas", valores: [false, true, true] },
    ],
  },
  {
    titulo: "Marca e rede",
    linhas: [
      { nome: "Assinatura de clientes", valores: [false, false, true] },
      { nome: "App com o seu nome, logo e cor", valores: [false, false, true] },
      { nome: "Várias unidades na mesma conta", valores: [false, false, true] },
    ],
  },
];

export function Planos() {
  const [escolhido, setEscolhido] = useState(1);

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANOS.map((p, i) => {
          const ativo = i === escolhido;
          return (
            <button
              key={p.valor}
              type="button"
              onClick={() => setEscolhido(i)}
              aria-pressed={ativo}
              className={`sobe flex flex-col items-start rounded-xl p-6 text-left sm:p-7 ${
                ativo
                  ? "bg-preto text-neve shadow-2xl shadow-black/25"
                  : "border border-preto/20 bg-preto/[0.04] text-preto hover:border-preto/45"
              }`}
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="tipo-titulo text-3xl">{p.nome}</span>
                {ativo && (
                  <span className="tipo-etiqueta shrink-0 text-[0.55rem] text-ouro">escolhido</span>
                )}
              </span>

              <span className={`mt-2 text-[13px] leading-relaxed ${ativo ? "text-cinza" : "text-preto/70"}`}>
                {p.paraQuem}
              </span>

              <span className="mt-6 flex items-baseline gap-1.5">
                <span className={`text-base font-semibold ${ativo ? "text-cinza" : "text-preto/60"}`}>R$</span>
                <span className="tipo-dado text-[3.4rem] font-bold leading-none">{p.preco}</span>
                <span className={`text-sm font-medium ${ativo ? "text-cinza" : "text-preto/60"}`}>por mês</span>
              </span>

              <span
                className={`mt-6 w-full border-t pt-4 text-[13px] font-semibold ${
                  ativo ? "border-traco text-neve" : "border-preto/15 text-preto"
                }`}
              >
                {p.limite}
              </span>
              {p.tag && (
                <span className={`mt-1 text-[13px] ${ativo ? "text-ouro" : "text-preto/70"}`}>{p.tag}</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[13px] text-preto/70">
        Preço fechado, sem taxa de adesão e sem fidelidade. Você troca de plano ou cancela pelo próprio painel.
      </p>

      <Tabela escolhido={escolhido} aoEscolher={setEscolhido} />
      <Cadastro plano={PLANOS[escolhido]} />
    </div>
  );
}

function Tabela({ escolhido, aoEscolher }: { escolhido: number; aoEscolher: (i: number) => void }) {
  return (
    <div className="mt-16">
      <h3 className="tipo-titulo text-[clamp(1.5rem,3vw,2rem)]">O que muda entre eles</h3>

      {/* A tabela é larga por natureza. No celular ela rola de lado com a coluna
          do recurso presa à esquerda, senão a pessoa perde de vista o que está
          comparando na terceira coluna. */}
      <div className="mt-6 overflow-x-auto">
        {/* `border-separate` e não `border-collapse`: com as bordas juntadas, o
            canto arredondado do pé da coluna escolhida some em boa parte dos
            navegadores. Aqui o filete de cada linha é a borda de cima das
            próprias células. */}
        <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-left">
          <caption className="sr-only">Comparação dos recursos entre os planos Essencial, Pro e White Label</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[38%] pb-3 align-bottom">
                <span className="tipo-etiqueta text-[0.6rem] text-preto/60">Recurso</span>
              </th>
              {PLANOS.map((p, i) => (
                <th key={p.valor} scope="col" className="w-[20.6%] px-3 pb-3 align-bottom sm:px-4">
                  <button
                    type="button"
                    onClick={() => aoEscolher(i)}
                    aria-pressed={i === escolhido}
                    className={`block w-full rounded-t-lg px-2 pb-3 pt-4 text-center transition-colors ${
                      i === escolhido ? "bg-preto text-neve" : "text-preto hover:bg-preto/[0.06]"
                    }`}
                  >
                    <span className="tipo-titulo block text-lg">{p.nome}</span>
                    <span className={`tipo-dado mt-1 block text-[13px] ${i === escolhido ? "text-ouro" : "text-preto/70"}`}>
                      R$ {p.preco}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          {GRUPOS.map((grupo, g) => {
            const ultimoGrupo = g === GRUPOS.length - 1;
            return (
              <tbody key={grupo.titulo}>
                {/* A faixa preta da coluna escolhida atravessa também a linha de
                    título do grupo, senão ela se parte em cinco pedaços e deixa
                    de ler como uma coluna só. */}
                <tr>
                  <th scope="rowgroup" className="pb-2 pt-7 text-left">
                    <span className="tipo-etiqueta text-[0.6rem] text-preto/60">{grupo.titulo}</span>
                  </th>
                  {PLANOS.map((p, i) => (
                    <td key={p.valor} className={i === escolhido ? "bg-preto" : ""} />
                  ))}
                </tr>

                {grupo.linhas.map((linha, l) => {
                  const ultimaLinha = ultimoGrupo && l === grupo.linhas.length - 1;
                  return (
                    <tr key={linha.nome}>
                      <th scope="row" className="border-t border-preto/15 py-3.5 pr-5 text-[15px] font-medium">
                        {linha.nome}
                      </th>
                      {linha.valores.map((v, i) => (
                        <td
                          key={PLANOS[i].valor}
                          className={`border-t border-preto/15 px-3 py-3.5 text-center align-middle sm:px-4 ${
                            i === escolhido ? "bg-preto" : ""
                          } ${ultimaLinha && i === escolhido ? "rounded-b-lg" : ""}`}
                        >
                          <span className="flex items-center justify-center">
                            <Marca valor={v} aceso={i === escolhido} />
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

/**
 * O que a célula mostra: presença, ausência ou medida.
 *
 * A ausência é um traço desenhado, e não o caractere de travessão: no meio de
 * uma coluna de checks, um risco curto e centralizado lê como "não tem" mais
 * rápido do que qualquer sinal de pontuação.
 */
function Marca({ valor, aceso }: { valor: Valor; aceso: boolean }) {
  if (valor === true) {
    return (
      <>
        <Check className={`h-[18px] w-[18px] ${aceso ? "text-ouro" : "text-preto"}`} aria-hidden="true" />
        <span className="sr-only">Incluído</span>
      </>
    );
  }
  if (valor === false) {
    return (
      <>
        <span className={`block h-px w-3.5 ${aceso ? "bg-cinza-fraco" : "bg-preto/30"}`} aria-hidden="true" />
        <span className="sr-only">Não incluído</span>
      </>
    );
  }
  return (
    <span className={`tipo-dado text-[13px] font-medium ${aceso ? "text-neve" : "text-preto"}`}>{valor}</span>
  );
}

function Cadastro({ plano }: { plano: (typeof PLANOS)[number] }) {
  const [enviando, setEnviando] = useState(false);

  // O cadastro completo pede CNPJ, endereço e link da barbearia, e ninguém
  // digita isso numa landing. Aqui o formulário só junta o que já está decidido
  // e entrega a etapa final com os campos preenchidos.
  const seguir = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    const dados = new FormData(e.currentTarget);
    const busca = new URLSearchParams({
      plan: plano.valor,
      nome: String(dados.get("nome") ?? ""),
      email: String(dados.get("email") ?? ""),
      telefone: String(dados.get("telefone") ?? ""),
    });
    window.location.href = `/register?${busca.toString()}`;
  };

  return (
    <form
      onSubmit={seguir}
      className="mt-16 grid gap-8 rounded-xl bg-preto p-6 text-neve shadow-2xl shadow-black/25 sm:p-9 lg:grid-cols-[1fr_1.15fr] lg:gap-14"
    >
      <div>
        <h3 className="tipo-titulo text-[clamp(1.8rem,3.4vw,2.5rem)]">Criar a conta</h3>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-cinza">
          Você está levando o{" "}
          <span className="font-semibold text-ouro">{plano.nome}</span>, por{" "}
          <span className="tipo-dado font-semibold text-ouro">R$ {plano.preco}</span> por mês. Na etapa
          seguinte entram os dados da barbearia, e nada é cobrado antes da sua confirmação.
        </p>
        <p className="mt-6 border-t border-traco pt-5 text-[13px] leading-relaxed text-cinza-fraco">
          Depois de criar a conta você cadastra equipe, serviços e horário de funcionamento, e o link de
          agendamento já fica pronto para mandar no Instagram e no WhatsApp.
        </p>
      </div>

      <div>
        <div className="space-y-3">
          <Campo nome="nome" rotulo="Seu nome" tipo="text" exemplo="João Silva" auto="name" />
          <Campo nome="email" rotulo="E-mail" tipo="email" exemplo="joao@barbearia.com.br" auto="email" />
          <Campo nome="telefone" rotulo="WhatsApp" tipo="tel" exemplo="(11) 99999-9999" auto="tel" />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-ouro text-[15px] font-bold text-preto transition-colors hover:bg-ouro-claro disabled:opacity-60"
        >
          {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Continuar com o {plano.nome}
          {!enviando && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

function Campo({
  nome,
  rotulo,
  tipo,
  exemplo,
  auto,
}: {
  nome: string;
  rotulo: string;
  tipo: string;
  exemplo: string;
  auto: string;
}) {
  return (
    <div>
      <label htmlFor={`in-${nome}`} className="mb-1.5 block text-[13px] font-semibold text-cinza">
        {rotulo}
      </label>
      <input
        id={`in-${nome}`}
        name={nome}
        type={tipo}
        required
        placeholder={exemplo}
        autoComplete={auto}
        className="h-12 w-full rounded-xl border border-traco-forte bg-grafite px-3.5 text-[15px] text-neve transition-colors placeholder:text-cinza-fraco focus:border-ouro focus:outline-none"
      />
    </div>
  );
}
