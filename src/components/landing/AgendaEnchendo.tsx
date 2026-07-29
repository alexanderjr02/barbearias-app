"use client";

import { useEffect, useState } from "react";

/**
 * A terça-feira enchendo sozinha.
 *
 * Toda barbearia sabe qual é o dia fraco, e quase sempre é a terça. Em vez de
 * afirmar "sua agenda vai encher", a página mostra: os horários vagos viram
 * nome de cliente, um a um, e o valor do dia sobe junto. É a promessa da
 * landing acontecendo na frente de quem lê.
 *
 * Vai marcado como exemplo. O resto da página usa captura real do produto
 * justamente porque barbearia desconfia de tela bonita que não existe — seria
 * incoerente deixar uma ilustração passar por dado real.
 */

const HORARIOS = [
  { hora: "09:00", servico: "Corte + barba", cliente: "Rafael M.", valor: 70 },
  { hora: "09:45", servico: "Corte social", cliente: "Diego A.", valor: 45 },
  { hora: "10:30", servico: "Barba na navalha", cliente: "Marcos V.", valor: 50 },
  { hora: "11:15", servico: "Corte + sobrancelha", cliente: "Léo C.", valor: 55 },
  { hora: "13:00", servico: "Corte navalhado", cliente: "Bruno S.", valor: 60 },
];

const PASSO_MS = 950;
const PAUSA_MS = 2800;

export function AgendaEnchendo() {
  // Começa cheia, e não vazia. Assim o HTML servido já mostra a agenda lotada —
  // que é a mensagem — em vez de "0 de 5 horários, R$ 0", que é o contrário
  // dela. Quem pediu menos movimento no sistema, ou está sem JavaScript, fica
  // com esse estado. A animação só existe para quem pode vê-la.
  const [cheios, setCheios] = useState(HORARIOS.length);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const avancar = (n: number) => {
      setCheios(n);
      const cheia = n >= HORARIOS.length;
      timer = setTimeout(() => avancar(cheia ? 0 : n + 1), cheia ? PAUSA_MS : PASSO_MS);
    };
    timer = setTimeout(() => avancar(0), 400);
    return () => clearTimeout(timer);
  }, []);

  const total = HORARIOS.slice(0, cheios).reduce((soma, h) => soma + h.valor, 0);

  return (
    <div className="w-full rounded-2xl border border-traco bg-carvao/95 p-4 shadow-2xl shadow-black/60 backdrop-blur sm:p-5">
      <div className="flex items-end justify-between gap-3 border-b border-traco pb-3">
        <div>
          <p className="tipo-etiqueta text-[0.6rem] text-cinza">Terça-feira</p>
          <p className="tipo-titulo mt-1.5 text-2xl text-neve">
            {cheios} de {HORARIOS.length} horários
          </p>
        </div>
        <div className="text-right">
          <p className="tipo-etiqueta text-[0.6rem] text-cinza">Na cadeira</p>
          <p className="tipo-titulo mt-1.5 text-2xl tabular-nums text-ouro">R$ {total}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {HORARIOS.map((h, i) => {
          const ocupado = i < cheios;
          return (
            <li
              key={h.hora}
              className={`flex items-center gap-3 rounded-lg border-l-2 py-1.5 pl-2.5 pr-2 text-sm ${
                ocupado ? "entra-lado border-ouro bg-ouro/[0.07]" : "border-traco bg-transparent"
              }`}
            >
              <span className={`text-base font-bold tabular-nums ${ocupado ? "text-neve" : "text-cinza-fraco"}`}>
                {h.hora}
              </span>
              {ocupado ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neve">{h.cliente}</span>
                  <span className="hidden shrink-0 text-[11px] text-cinza sm:block">{h.servico}</span>
                </>
              ) : (
                <span className="flex-1 text-[13px] text-cinza-fraco">livre</span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 flex items-center justify-between gap-2 text-[10px] text-cinza-fraco">
        <span>Terça era o dia fraco.</span>
        <span className="rounded border border-traco px-1.5 py-0.5 uppercase tracking-wider">exemplo</span>
      </p>
    </div>
  );
}
