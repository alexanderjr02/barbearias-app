"use client";

import { useState } from "react";

/**
 * Os dezenove módulos, agrupados por assunto.
 *
 * A versão anterior empilhava as dezenove linhas de uma vez: quatro colunas de
 * nome e descrição que, no celular, viravam uma parede de texto de duas telas
 * de altura. Ninguém lê dezenove parágrafos para descobrir se o sistema tem
 * estoque.
 *
 * Aqui o assunto vem primeiro. Os quatro grupos ficam à vista com quantos
 * módulos cada um tem, e o conteúdo do grupo escolhido aparece em cartão curto.
 * A pessoa varre quatro palavras, escolhe a que importa para ela e lê cinco
 * linhas, em vez de dezenove. O total continua dito em voz alta, porque o
 * número é parte do argumento.
 */

export type Grupo = {
  grupo: string;
  itens: { nome: string; texto: string }[];
};

export function Modulos({ grupos }: { grupos: Grupo[] }) {
  const [ativo, setAtivo] = useState(0);
  const total = grupos.reduce((s, g) => s + g.itens.length, 0);

  return (
    <div>
      <div role="tablist" aria-label="Grupos de módulos" className="flex flex-wrap gap-2">
        {grupos.map((g, i) => (
          <button
            key={g.grupo}
            type="button"
            role="tab"
            aria-selected={i === ativo}
            onClick={() => setAtivo(i)}
            className={`flex items-baseline gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors ${
              i === ativo
                ? "border-ouro bg-ouro text-preto"
                : "border-traco-forte text-cinza hover:border-cinza hover:text-neve"
            }`}
          >
            {g.grupo}
            <span className={`tipo-dado text-[12px] ${i === ativo ? "text-preto/60" : "text-cinza-fraco"}`}>
              {g.itens.length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-traco bg-traco sm:grid-cols-2 lg:grid-cols-3">
        {grupos[ativo].itens.map((item) => (
          <div key={item.nome} className="bg-carvao p-5 transition-colors hover:bg-grafite">
            <p className="font-semibold text-neve">{item.nome}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-cinza">{item.texto}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[15px] text-cinza">
        <span className="tipo-dado font-semibold text-neve">{total}</span> módulos no total, todos na mesma
        assinatura.
      </p>
    </div>
  );
}
