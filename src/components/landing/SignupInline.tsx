"use client";

import { useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";

/**
 * Planos e cadastro na própria landing.
 *
 * Antes o botão levava para /register, e cada página a mais entre a decisão e
 * a conta é gente que some no caminho. Aqui a pessoa compara os planos, escolhe
 * um, deixa nome, e-mail e telefone, e cai já com tudo preenchido na etapa que
 * falta. Os dados da barbearia ficam para depois porque decidir e digitar CNPJ
 * são momentos diferentes.
 *
 * Isto mora dentro do painel amarelo, então tudo aqui é preto sobre amarelo, e
 * os cartões invertem para preto. É o contraste mais forte que a identidade
 * tem, e ele está reservado para o momento em que a pessoa escolhe.
 *
 * Os benefícios listados são os de verdade: saem de FEATURES_BY_PLAN
 * (src/context/PlanContext.tsx) e dos limites de DEFAULT_PLAN_PRICING. Se um
 * plano deixar de liberar algo lá, a lista aqui precisa mudar junto — prometer
 * na landing o que o sistema bloqueia depois é o jeito mais rápido de perder
 * um cliente que já pagou.
 */

type Plano = {
  valor: string;
  nome: string;
  preco: string;
  paraQuem: string;
  herda?: string;
  beneficios: string[];
  destaque?: boolean;
};

const PLANOS: Plano[] = [
  {
    valor: "starter",
    nome: "Essencial",
    preco: "50",
    paraQuem: "Para quem está organizando a casa",
    beneficios: [
      "Agenda online aberta 24 horas, com link próprio",
      "Até 3 barbeiros na equipe",
      "Agendamentos sem limite no mês",
      "Confirmação e lembrete automáticos",
      "Ficha do cliente com histórico de atendimento",
      "Fidelidade por pontos e gorjeta pelo app",
      "Página de agendamento com a sua identidade",
    ],
  },
  {
    valor: "pro",
    nome: "Pro",
    preco: "350",
    paraQuem: "Para a barbearia que quer crescer",
    herda: "Tudo do Essencial, mais:",
    destaque: true,
    beneficios: [
      "Até 10 barbeiros na equipe",
      "Copiloto com IA que chama o cliente sumido",
      "Financeiro completo: entrada, saída e resultado",
      "Comissão por barbeiro calculada sozinha",
      "Relatórios avançados e exportação dos dados",
      "Campanhas de marketing e recuperação de cliente",
      "Chatbot no WhatsApp, com as suas respostas",
      "Controle de estoque com alerta de reposição",
    ],
  },
  {
    valor: "white-label",
    nome: "White Label",
    preco: "897",
    paraQuem: "Para rede e marca própria",
    herda: "Tudo do Pro, mais:",
    beneficios: [
      "Barbeiros ilimitados",
      "App com o seu nome, a sua logo e a sua cor",
      "Assinatura de clientes: receita entrando todo mês",
      "Várias unidades na mesma conta, cada uma com seu caixa",
      "Sua marca em toda a experiência do cliente",
    ],
  },
];

export function SignupInline() {
  const [plano, setPlano] = useState("pro");
  const escolhido = PLANOS.find((p) => p.valor === plano) ?? PLANOS[1];

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANOS.map((p) => {
          const ativo = plano === p.valor;
          return (
            <div
              key={p.valor}
              className={`sobe relative flex flex-col rounded-2xl p-6 text-left transition-shadow ${
                ativo
                  ? "bg-preto text-neve shadow-2xl shadow-black/25"
                  : "bg-preto/[0.06] text-preto ring-1 ring-preto/15 hover:ring-preto/35"
              }`}
            >
              {p.destaque && (
                <span
                  className={`tipo-etiqueta absolute -top-3 left-6 rounded-full px-3 py-1 text-[0.6rem] ${
                    ativo ? "bg-ouro text-preto" : "bg-preto text-ouro"
                  }`}
                >
                  Mais escolhido
                </span>
              )}

              <h3 className="tipo-titulo text-3xl">{p.nome}</h3>
              <p className={`mt-1.5 text-[13px] ${ativo ? "text-cinza" : "text-preto/75"}`}>{p.paraQuem}</p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className={`text-lg font-semibold ${ativo ? "text-cinza" : "text-preto/65"}`}>R$</span>
                <span className="tipo-titulo-xl text-6xl tabular-nums">{p.preco}</span>
                <span className={`text-sm font-medium ${ativo ? "text-cinza" : "text-preto/65"}`}>/mês</span>
              </p>

              {p.herda && (
                <p
                  className={`tipo-etiqueta mt-5 border-t pt-4 text-[0.6rem] ${
                    ativo ? "border-traco text-ouro" : "border-preto/15 text-preto/75"
                  }`}
                >
                  {p.herda}
                </p>
              )}

              <ul
                className={`mb-8 space-y-2.5 ${
                  p.herda ? "mt-3" : `mt-5 border-t pt-5 ${ativo ? "border-traco" : "border-preto/15"}`
                }`}
              >
                {p.beneficios.map((b) => (
                  <li
                    key={b}
                    className={`flex gap-2.5 text-[13px] leading-relaxed ${ativo ? "text-cinza" : "text-preto/75"}`}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${ativo ? "text-ouro" : "text-preto/65"}`}
                      aria-hidden="true"
                    />
                    {b}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setPlano(p.valor)}
                aria-pressed={ativo}
                // `mt-auto` empurra o botão para a base: as listas têm tamanhos
                // diferentes, e sem isso os três botões ficam em alturas
                // diferentes, como se um plano estivesse desalinhado.
                className={`mt-auto h-11 w-full rounded-xl text-sm font-bold transition-colors ${
                  ativo
                    ? "bg-ouro text-preto hover:bg-ouro-claro"
                    : "bg-preto text-neve hover:bg-preto/85"
                }`}
              >
                {ativo ? "Plano escolhido" : `Escolher o ${p.nome}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs text-preto/75">
        Sem fidelidade e sem multa. Você troca de plano quando quiser, e leva os seus dados se decidir sair.
      </p>

      <Formulario plano={plano} nomePlano={escolhido.nome} />
    </div>
  );
}

function Formulario({ plano, nomePlano }: { plano: string; nomePlano: string }) {
  const [enviando, setEnviando] = useState(false);

  // O cadastro completo pede CNPJ e link da barbearia, que ninguém digita numa
  // landing. Aqui o formulário só junta o que já está decidido e leva para a
  // etapa final com tudo preenchido.
  const seguir = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    const dados = new FormData(e.currentTarget);
    const busca = new URLSearchParams({
      plan: plano,
      nome: String(dados.get("nome") ?? ""),
      email: String(dados.get("email") ?? ""),
      telefone: String(dados.get("telefone") ?? ""),
    });
    window.location.href = `/register?${busca.toString()}`;
  };

  return (
    <form
      onSubmit={seguir}
      className="mx-auto mt-12 max-w-xl rounded-2xl bg-preto p-6 text-neve shadow-2xl shadow-black/25 sm:p-8"
    >
      <p className="tipo-titulo text-3xl">Criar a conta</p>
      <p className="mt-2 text-sm text-cinza">
        Você escolheu o <span className="font-semibold text-ouro">{nomePlano}</span>. Leva menos de um minuto.
      </p>

      <div className="mt-6 space-y-3">
        <Campo nome="nome" rotulo="Seu nome" tipo="text" exemplo="João Silva" />
        <Campo nome="email" rotulo="E-mail" tipo="email" exemplo="seu@email.com" />
        <Campo nome="telefone" rotulo="WhatsApp" tipo="tel" exemplo="(11) 99999-9999" />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-ouro text-sm font-bold text-preto transition-colors hover:bg-ouro-claro disabled:opacity-60"
      >
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continuar com o {nomePlano}
        {!enviando && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-cinza-fraco">
        Na próxima etapa você informa os dados da barbearia. Nada é cobrado sem a sua confirmação.
      </p>
    </form>
  );
}

function Campo({ nome, rotulo, tipo, exemplo }: { nome: string; rotulo: string; tipo: string; exemplo: string }) {
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
        autoComplete={nome === "email" ? "email" : nome === "telefone" ? "tel" : "name"}
        className="h-12 w-full rounded-xl border border-traco-forte bg-grafite px-3.5 text-sm text-neve placeholder:text-cinza-fraco transition-colors focus:border-ouro focus:outline-none"
      />
    </div>
  );
}
