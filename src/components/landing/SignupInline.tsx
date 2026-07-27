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
    preco: "250",
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
              className={`lift relative flex flex-col rounded-2xl border-2 p-6 text-left ${
                ativo
                  ? "border-latao bg-white shadow-xl shadow-latao-escuro/15"
                  : "border-porcelana-2 bg-white/60 hover:border-fumaca/50"
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-3 left-6 rounded-full bg-vinho px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-porcelana">
                  Mais escolhido
                </span>
              )}

              <h3 className="font-display text-3xl font-bold uppercase leading-none text-breu">{p.nome}</h3>
              <p className="mt-1.5 text-[13px] text-breu/60">{p.paraQuem}</p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-lg font-semibold text-breu/50">R$</span>
                <span className="font-display text-6xl font-bold leading-none tabular-nums text-breu">{p.preco}</span>
                <span className="text-sm font-medium text-breu/50">/mês</span>
              </p>

              {p.herda && (
                <p className="mt-5 border-t border-porcelana-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-latao-escuro">
                  {p.herda}
                </p>
              )}

              <ul className={`mb-8 space-y-2.5 ${p.herda ? "mt-3" : "mt-5 border-t border-porcelana-2 pt-5"}`}>
                {p.beneficios.map((b) => (
                  <li key={b} className="flex gap-2.5 text-[13px] leading-relaxed text-breu/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-latao-escuro" aria-hidden="true" />
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
                className={`mt-auto h-11 w-full rounded-xl pt-px text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-latao-escuro ${
                  ativo
                    ? "bg-breu text-porcelana"
                    : "border border-breu/20 text-breu hover:border-breu/50 hover:bg-breu/5"
                }`}
              >
                {ativo ? "Plano escolhido" : `Escolher o ${p.nome}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs text-breu/50">
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
      className="mx-auto mt-12 max-w-xl rounded-2xl border-2 border-breu/10 bg-white p-6 shadow-xl shadow-breu/5 sm:p-8"
    >
      <p className="font-display text-3xl font-bold uppercase leading-none text-breu">Criar a conta</p>
      <p className="mt-2 text-sm text-breu/60">
        Você escolheu o <span className="font-semibold text-breu">{nomePlano}</span>. Leva menos de um minuto.
      </p>

      <div className="mt-6 space-y-3">
        <Campo nome="nome" rotulo="Seu nome" tipo="text" exemplo="João Silva" />
        <Campo nome="email" rotulo="E-mail" tipo="email" exemplo="seu@email.com" />
        <Campo nome="telefone" rotulo="WhatsApp" tipo="tel" exemplo="(11) 99999-9999" />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-breu text-sm font-bold uppercase tracking-wider text-porcelana transition-colors hover:bg-breu-3 disabled:opacity-60"
      >
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continuar com o {nomePlano}
        {!enviando && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-breu/50">
        Na próxima etapa você informa os dados da barbearia. Nada é cobrado sem a sua confirmação.
      </p>
    </form>
  );
}

function Campo({ nome, rotulo, tipo, exemplo }: { nome: string; rotulo: string; tipo: string; exemplo: string }) {
  return (
    <div>
      <label htmlFor={`in-${nome}`} className="mb-1.5 block text-[13px] font-semibold text-breu/70">
        {rotulo}
      </label>
      <input
        id={`in-${nome}`}
        name={nome}
        type={tipo}
        required
        placeholder={exemplo}
        autoComplete={nome === "email" ? "email" : nome === "telefone" ? "tel" : "name"}
        className="h-12 w-full rounded-xl border border-breu/15 bg-porcelana/60 px-3.5 text-sm text-breu placeholder:text-breu/35 transition-colors focus:border-latao-escuro focus:bg-white focus:outline-none"
      />
    </div>
  );
}
