"use client";

import { useEffect, useState } from "react";

/**
 * A tira do dia: a terça-feira enchendo, hora a hora.
 *
 * É a assinatura do topo da página, e ela faz duas leituras de uma vez. No eixo
 * deitado está o dia de trabalho, do primeiro ao último horário. Na altura de
 * cada barra está o valor daquele atendimento, então o platinado das 14h30
 * aparece maior que o corte infantil das 16h. Quem olha por um segundo entende
 * "a agenda encheu"; quem olha por três entende "e o dia rendeu isto".
 *
 * Os horários não são preenchidos em ordem. Agenda de barbearia não enche da
 * esquerda para a direita, ela enche em salto, e mostrar isso é mais honesto do
 * que uma barra de progresso.
 *
 * Vai marcada como exemplo. O resto da página usa captura real do produto
 * justamente porque barbearia desconfia de tela bonita que não existe, e seria
 * incoerente deixar uma demonstração passar por dado de cliente.
 */

const HORARIOS = [
  { hora: "09:00", servico: "Corte + barba", cliente: "Rafael M.", valor: 70 },
  { hora: "09:45", servico: "Corte social", cliente: "Diego A.", valor: 45 },
  { hora: "10:30", servico: "Barba na navalha", cliente: "Marcos V.", valor: 50 },
  { hora: "11:15", servico: "Corte + sobrancelha", cliente: "Léo C.", valor: 55 },
  { hora: "13:00", servico: "Corte navalhado", cliente: "Bruno S.", valor: 60 },
  { hora: "13:45", servico: "Corte social", cliente: "Ivan P.", valor: 45 },
  { hora: "14:30", servico: "Platinado", cliente: "Kauã R.", valor: 180 },
  { hora: "15:15", servico: "Corte + barba", cliente: "Tiago F.", valor: 70 },
  { hora: "16:00", servico: "Corte infantil", cliente: "Enzo M.", valor: 40 },
  { hora: "17:30", servico: "Corte + barba", cliente: "Pedro H.", valor: 70 },
];

/** A ordem em que o dia foi vendido, e não a ordem do relógio. */
const ORDEM = [4, 0, 7, 2, 9, 1, 6, 3, 8, 5];

const MAIOR = Math.max(...HORARIOS.map((h) => h.valor));
const TOTAL = HORARIOS.reduce((soma, h) => soma + h.valor, 0);
const TODOS = ORDEM.length;

const PASSO_MS = 620;
const PAUSA_MS = 3200;

/** Altura da barra pelo valor do serviço, com piso para o menor não sumir.
 *
 * O piso é baixo de propósito: com ele alto, corte de R$ 35 e platinado de
 * R$ 180 saem quase do mesmo tamanho e a barra deixa de dizer qualquer coisa
 * sobre dinheiro, que é metade do que ela existe para mostrar. */
function altura(valor: number) {
  return `${Math.round(13 + (valor / MAIOR) * 87)}%`;
}

export function DiaNaCadeira() {
  // Começa com o dia inteiro vendido. É o estado que o HTML servido carrega,
  // então quem está sem JavaScript, ou pediu menos movimento, vê a agenda cheia,
  // que é a mensagem. A animação só existe para quem pode assistir a ela.
  const [vendidos, setVendidos] = useState(TODOS);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const avancar = (n: number) => {
      setVendidos(n);
      const cheio = n >= TODOS;
      timer = setTimeout(() => avancar(cheio ? 0 : n + 1), cheio ? PAUSA_MS : PASSO_MS);
    };
    timer = setTimeout(() => avancar(0), 500);
    return () => clearTimeout(timer);
  }, []);

  const ocupados = new Set(ORDEM.slice(0, vendidos));
  const caixa = HORARIOS.reduce((soma, h, i) => (ocupados.has(i) ? soma + h.valor : soma), 0);
  const ultimo = vendidos > 0 ? HORARIOS[ORDEM[vendidos - 1]] : null;

  return (
    <figure
      className="mt-14 border-y border-traco py-6 sm:mt-16 sm:py-8"
      aria-label={`Exemplo de uma terça-feira com os ${TODOS} horários vendidos, somando R$ ${TOTAL}`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="tipo-etiqueta text-[0.6rem] text-cinza-fraco">Terça-feira, um barbeiro</p>
          <p className="mt-1.5 text-sm text-cinza">
            <span className="tipo-dado font-semibold text-neve">{vendidos}</span> de{" "}
            <span className="tipo-dado">{TODOS}</span> horários vendidos
          </p>
        </div>
        <div className="text-right">
          <p className="tipo-etiqueta text-[0.6rem] text-cinza-fraco">Entrou na cadeira</p>
          <p className="tipo-dado mt-0.5 text-[clamp(1.6rem,4.5vw,2.4rem)] font-semibold leading-none text-ouro">
            R$ {caixa}
          </p>
        </div>
      </div>

      <div className="mt-6 flex h-28 items-end gap-1 sm:h-40 sm:gap-1.5" aria-hidden="true">
        {HORARIOS.map((h, i) => {
          const vendido = ocupados.has(i);
          return (
            <div key={h.hora} className="flex h-full flex-1 items-end">
              {vendido ? (
                // A barra nasce no instante em que o horário é vendido e só
                // desaparece quando o ciclo reinicia, então a animação de
                // entrada roda uma vez por barra, na montagem, sem precisar de
                // estado dizendo qual é a mais nova.
                <div className="slot-entra w-full rounded-[3px] bg-ouro" style={{ height: altura(h.valor) }} />
              ) : (
                <div className="h-[3px] w-full rounded-full bg-traco-forte" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1 border-t border-traco pt-2 sm:gap-1.5" aria-hidden="true">
        {HORARIOS.map((h) => (
          <span key={h.hora} className="tipo-dado flex-1 text-center text-[9px] text-cinza-fraco sm:text-[10px]">
            {h.hora}
          </span>
        ))}
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <span className="min-h-5 text-cinza">
          {ultimo ? (
            <>
              <span className="tipo-dado text-neve">{ultimo.hora}</span>{" "}
              <span className="text-neve">{ultimo.servico}</span>, {ultimo.cliente},{" "}
              <span className="tipo-dado text-ouro">R$ {ultimo.valor}</span>
            </>
          ) : (
            "Agenda aberta, nenhum horário vendido ainda."
          )}
        </span>
        <span className="tipo-etiqueta shrink-0 rounded border border-traco px-1.5 py-0.5 text-[0.55rem] text-cinza-fraco">
          exemplo
        </span>
      </figcaption>
    </figure>
  );
}
