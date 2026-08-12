"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * As telas do painel, trocadas por aba.
 *
 * Aqui não existe ilustração nem mock: cada imagem é uma captura do painel
 * rodando, e a barra em cima mostra o endereço de verdade daquela tela. Quem
 * está decidindo quer conferir se a tela existe, e o caminho na barra é a
 * prova mais barata disso.
 *
 * Aba, e não carrossel. Carrossel esconde o que tem dentro e obriga a arrastar
 * até achar; a aba mostra as quatro telas de uma vez e deixa a pessoa ir direto
 * na que interessa. As quatro imagens ficam montadas e só trocam de opacidade,
 * então a segunda visita a uma aba é instantânea.
 */

export type Tela = {
  src: string;
  alt: string;
  aba: string;
  caminho: string;
  legenda: string;
};

export function TelasDoSistema({ telas }: { telas: Tela[] }) {
  const [ativa, setAtiva] = useState(0);
  const abasRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Padrão de aba do teclado: seta anda entre as abas e já leva o foco junto,
  // então quem navega sem mouse troca de tela no mesmo gesto de quem clica.
  const pelaSeta = (e: React.KeyboardEvent) => {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = (ativa + passo + telas.length) % telas.length;
    setAtiva(proxima);
    abasRef.current[proxima]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Telas do painel" onKeyDown={pelaSeta} className="flex flex-wrap gap-x-6 gap-y-1 border-b border-traco">
        {telas.map((t, i) => (
          <button
            key={t.src}
            ref={(el) => {
              abasRef.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`aba-${i}`}
            aria-selected={i === ativa}
            aria-controls={`painel-${i}`}
            tabIndex={i === ativa ? 0 : -1}
            onClick={() => setAtiva(i)}
            className={`-mb-px border-b-2 pb-3 pt-1 text-[15px] font-semibold transition-colors ${
              i === ativa ? "border-ouro text-neve" : "border-transparent text-cinza hover:text-neve"
            }`}
          >
            {t.aba}
          </button>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-traco bg-carvao">
        <div className="flex items-center gap-3 border-b border-traco px-4 py-2.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ouro" aria-hidden="true" />
          <span className="tipo-dado truncate text-[11px] text-cinza-fraco">
            rukz.com.br{telas[ativa].caminho}
          </span>
        </div>
        <div className="grid">
          {telas.map((t, i) => (
            <div
              key={t.src}
              role="tabpanel"
              id={`painel-${i}`}
              aria-labelledby={`aba-${i}`}
              // As quatro capturas ocupam a mesma célula da grade, então a
              // altura do bloco não pula quando a aba muda. A inativa sai por
              // `invisible`, que a tira da árvore de acessibilidade e do foco
              // sem tirar a caixa do layout, e é isso que mantém as imagens
              // carregando de uma vez, deixando a troca de aba instantânea.
              className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                i === ativa ? "opacity-100" : "invisible opacity-0"
              }`}
            >
              <Image
                src={t.src}
                alt={t.alt}
                width={1600}
                height={1000}
                className="w-full"
                // As capturas já são webp leves e prontas no tamanho servido.
                // O otimizador do Next só faria uma segunda passada por cima.
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-cinza">{telas[ativa].legenda}</p>
    </div>
  );
}
