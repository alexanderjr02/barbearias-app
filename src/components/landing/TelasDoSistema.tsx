"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Maximize2 } from "lucide-react";

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
 *
 * A captura de um painel inteiro tem 1600px de largura. Espremida na coluna de
 * um celular ela vira um borrão cinza, e é onde a maior parte das pessoas vai
 * abrir esta página. Por isso um toque abre a tela em cima de tudo, no tamanho
 * de verdade, para arrastar e ler número por número.
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
  const [ampliada, setAmpliada] = useState<Tela | null>(null);
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
      <div
        role="tablist"
        aria-label="Telas do painel"
        onKeyDown={pelaSeta}
        className="flex flex-wrap gap-x-6 gap-y-1 border-b border-traco"
      >
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
          <button
            type="button"
            onClick={() => setAmpliada(telas[ativa])}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-traco px-2 py-1 text-[11px] font-semibold text-cinza transition-colors hover:border-ouro hover:text-ouro"
          >
            <Maximize2 className="h-3 w-3" aria-hidden="true" />
            Ampliar
          </button>
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
              {/* No celular a captura inteira caberia em 350px de largura e
                  viraria borrão. Em vez de encolher tudo, a moldura corta:
                  mostra o miolo do painel em tamanho legível, sem a barra
                  lateral, e quem quiser ver a tela toda toca para ampliar. No
                  computador a largura sobra e a captura aparece inteira. */}
              <button
                type="button"
                onClick={() => setAmpliada(t)}
                aria-label={`Ampliar a tela ${t.aba}`}
                className="block aspect-[4/3] w-full cursor-zoom-in overflow-hidden sm:aspect-auto"
              >
                <Image
                  src={t.src}
                  alt={t.alt}
                  width={1600}
                  height={1000}
                  className="w-[215%] max-w-none -translate-x-[14%] sm:w-full sm:translate-x-0"
                  // As capturas já são webp leves e prontas no tamanho servido.
                  // O otimizador do Next só faria uma segunda passada por cima.
                  unoptimized
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-cinza">{telas[ativa].legenda}</p>
      <p className="tipo-etiqueta mt-3 text-[0.55rem] text-cinza-fraco sm:hidden">
        toque na tela para ampliar e ler os números
      </p>

      {ampliada && <Ampliada tela={ampliada} aoFechar={() => setAmpliada(null)} />}
    </div>
  );
}

/**
 * A captura em cima de tudo, no tamanho original, para arrastar e ler.
 *
 * A largura fixa de 1100px é o ponto em que o texto do painel volta a ser
 * legível num celular: menos que isso continua borrão, mais que isso obriga a
 * arrastar demais para achar o começo da linha.
 *
 * Vai por portal, direto no `body`, e não é preciosismo: o `<Reveal>` que
 * embrulha a seção declara `will-change: transform`, e isso cria um bloco de
 * contenção que faz `position: fixed` medir a partir dele em vez da janela. Sem
 * o portal a lupa abria no meio da página, cobrindo parte do que devia cobrir.
 */
function Ampliada({ tela, aoFechar }: { tela: Tela; aoFechar: () => void }) {
  useEffect(() => {
    const porTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", porTecla);
    // Trava a rolagem de trás: sem isso o dedo arrasta a página por baixo da
    // imagem e a pessoa perde o lugar onde estava lendo.
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", porTecla);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  // Sem guarda de montagem: este componente só nasce a partir de um toque, ou
  // seja, sempre no cliente e sempre com `document` disponível.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Tela ${tela.aba} ampliada`} className="fixed inset-0 z-[70] bg-preto/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 border-b border-traco px-4">
        <span className="tipo-dado truncate text-[11px] text-cinza-fraco">rukz.com.br{tela.caminho}</span>
        <button
          type="button"
          onClick={aoFechar}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-traco-forte text-neve transition-colors hover:border-ouro hover:text-ouro"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-[calc(100%-3.5rem)] overflow-auto overscroll-contain p-4">
        <Image
          src={tela.src}
          alt={tela.alt}
          width={1600}
          height={1000}
          className="max-w-none rounded-lg border border-traco"
          style={{ width: "1100px" }}
          unoptimized
        />
        <p className="tipo-etiqueta mt-4 pb-4 text-[0.55rem] text-cinza-fraco">arraste para explorar a tela</p>
      </div>
    </div>,
    document.body
  );
}
