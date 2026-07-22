"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * Cadastro na própria landing, como fazem as referências.
 *
 * Antes o botão levava para /register, e cada página a mais entre a decisão e
 * a conta é gente que some no caminho. Aqui a pessoa escolhe o plano, deixa
 * nome, e-mail e telefone, e cai já autenticada na etapa que falta. Os dados
 * da barbearia ficam para a etapa seguinte porque decidir e preencher CNPJ
 * são momentos diferentes.
 */

const PLANOS = [
  { valor: "starter", nome: "Essencial", preco: "R$ 50", ciclo: "/mês", resumo: "Agenda, gorjeta e fidelidade. Até 3 barbeiros." },
  { valor: "pro", nome: "Pro", preco: "R$ 250", ciclo: "/mês", resumo: "Copiloto com IA, financeiro completo e assinatura de clientes.", destaque: true },
  { valor: "white-label", nome: "White Label", preco: "R$ 897", ciclo: "/mês", resumo: "App com a sua marca na loja, seu nome e sua cor." },
];

export function SignupInline() {
  const [plano, setPlano] = useState("pro");
  const escolhido = PLANOS.find((p) => p.valor === plano);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Escolha o plano e comece agora</h2>
        <p className="mt-3 text-zinc-400">
          Sem fidelidade e sem multa. Você troca de plano quando quiser, e leva seus dados se decidir sair.
        </p>

        <div className="mt-6 space-y-2.5">
          {PLANOS.map((p) => {
            const ativo = plano === p.valor;
            return (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPlano(p.valor)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  ativo ? "border-amber-500 bg-amber-500/[0.07]" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{p.nome}</span>
                      {p.destaque && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-200">
                          mais escolhido
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{p.resumo}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-semibold text-white">{p.preco}</span>
                    <span className="text-xs text-zinc-500">{p.ciclo}</span>
                    {ativo && <Check className="ml-auto mt-1 h-4 w-4 text-amber-400" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Formulario plano={plano} nomePlano={escolhido?.nome ?? ""} />
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
    <form onSubmit={seguir} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <p className="text-sm font-semibold text-white">Seus dados</p>
      <p className="mt-1 text-xs text-zinc-500">Leva menos de um minuto.</p>

      <div className="mt-5 space-y-3">
        <Campo nome="nome" rotulo="Seu nome" tipo="text" exemplo="João Silva" />
        <Campo nome="email" rotulo="E-mail" tipo="email" exemplo="seu@email.com" />
        <Campo nome="telefone" rotulo="WhatsApp" tipo="tel" exemplo="(11) 99999-9999" />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
      >
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        Continuar com o {nomePlano}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-600">
        Na próxima etapa você informa os dados da barbearia. Nada é cobrado sem a sua confirmação.
      </p>
    </form>
  );
}

function Campo({ nome, rotulo, tipo, exemplo }: { nome: string; rotulo: string; tipo: string; exemplo: string }) {
  return (
    <div>
      <label htmlFor={`in-${nome}`} className="mb-1.5 block text-[13px] font-medium text-zinc-300">
        {rotulo}
      </label>
      <input
        id={`in-${nome}`}
        name={nome}
        type={tipo}
        required
        placeholder={exemplo}
        autoComplete={nome === "email" ? "email" : nome === "telefone" ? "tel" : "name"}
        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-amber-500/70 focus:outline-none"
      />
    </div>
  );
}
