"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTelaGrande } from "./telaGrande";
import { X, Maximize2 } from "lucide-react";

/**
 * As telas do sistema, trocadas por aba, nas duas versões que existem.
 *
 * Cada tela do rukz existe no navegador e no aplicativo, e nenhuma é versão
 * reduzida da outra. Mostrar as duas é o argumento: a barbearia não escolhe
 * entre ter sistema no balcão ou no bolso.
 *
 * O que aparece primeiro depende de onde a pessoa está lendo. No celular abre
 * a captura do app, que já nasceu no formato daquela tela e se lê inteira; no
 * computador abre a da web, que é onde ela cabe. A outra fica a um toque, no
 * seletor. Antes disso a captura de 1600px era espremida na coluna do celular
 * e virava borrão cinza, que é o oposto de mostrar o produto.
 *
 * Aba, e não carrossel, para a lista de telas ficar à vista em vez de escondida
 * atrás de um arrasto. As imagens ficam montadas e só trocam de opacidade,
 * então a segunda visita a uma aba é instantânea.
 */

export type Tela = {
  src: string;
  app: string;
  alt: string;
  aba: string;
  caminho: string;
  legenda: string;
};

type Onde = "web" | "app";

export function TelasDoSistema({ telas }: { telas: Tela[] }) {
  const [ativa, setAtiva] = useState(0);
  const [escolhido, setEscolhido] = useState<Onde | null>(null);
  const [ampliada, setAmpliada] = useState<Tela | null>(null);
  const abasRef = useRef<(HTMLButtonElement | null)[]>([]);

  // A versão que abre primeiro sai do tamanho da tela; a escolha de quem toca
  // no seletor manda mais que ela. No servidor `telaGrande` é nulo, e aí a
  // moldura vazia segura o lugar sem ninguém baixar a imagem errada.
  const telaGrande = useTelaGrande();
  const onde: Onde | null = escolhido ?? (telaGrande === null ? null : telaGrande ? "web" : "app");

  const pelaSeta = (e: React.KeyboardEvent) => {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = (ativa + passo + telas.length) % telas.length;
    setAtiva(proxima);
    abasRef.current[proxima]?.focus();
  };

  const tela = telas[ativa];
  const noApp = onde === "app";

  return (
    <div>
      <div
        role="tablist"
        aria-label="Telas do sistema"
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

      {/* Seletor de superfície. Fica junto da imagem, e não no topo da seção,
          porque ele muda o que está logo abaixo dele. */}
      <div className="mt-6 flex items-center gap-2">
        {(["web", "app"] as const).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setEscolhido(op)}
            aria-pressed={onde === op}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              onde === op
                ? "border-ouro bg-ouro text-preto"
                : "border-traco-forte text-cinza hover:border-cinza hover:text-neve"
            }`}
          >
            {op === "web" ? "No computador" : "No celular"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {onde === null ? (
          <div className="aspect-[16/10] w-full rounded-xl border border-traco bg-carvao" />
        ) : noApp ? (
          <figure className="mx-auto w-[16rem] sm:w-[19rem]">
            <div className="overflow-hidden rounded-[1.8rem] border-[8px] border-grafite bg-carvao shadow-2xl shadow-black/70">
              <Image
                key={tela.app}
                src={tela.app}
                alt={`${tela.alt} (tela do aplicativo)`}
                width={560}
                height={1212}
                className="w-full rounded-[1.2rem]"
                unoptimized
              />
            </div>
          </figure>
        ) : (
          <div className="overflow-hidden rounded-xl border border-traco bg-carvao">
            <div className="flex items-center gap-3 border-b border-traco px-4 py-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ouro" aria-hidden="true" />
              <span className="tipo-dado truncate text-[11px] text-cinza-fraco">rukz.com.br{tela.caminho}</span>
              <button
                type="button"
                onClick={() => setAmpliada(tela)}
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-traco px-2 py-1 text-[11px] font-semibold text-cinza transition-colors hover:border-ouro hover:text-ouro"
              >
                <Maximize2 className="h-3 w-3" aria-hidden="true" />
                Ampliar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAmpliada(tela)}
              aria-label={`Ampliar a tela ${tela.aba}`}
              className="block w-full cursor-zoom-in"
            >
              <Image
                key={tela.src}
                src={tela.src}
                alt={tela.alt}
                width={1600}
                height={1000}
                className="w-full"
                // As capturas já são webp leves e prontas no tamanho servido.
                // O otimizador do Next só faria uma segunda passada por cima.
                unoptimized
              />
            </button>
          </div>
        )}
      </div>

      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-cinza">{tela.legenda}</p>

      {ampliada && <Ampliada tela={ampliada} aoFechar={() => setAmpliada(null)} />}
    </div>
  );
}

/**
 * A captura da web em cima de tudo, no tamanho original, para arrastar e ler.
 *
 * Vai por portal, direto no `body`, e não é preciosismo: o `<Reveal>` que
 * embrulha a seção declara `will-change: transform`, e isso cria um bloco de
 * contenção que faz `position: fixed` medir a partir dele em vez da janela. Sem
 * o portal a lupa abria no meio da página.
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tela ${tela.aba} ampliada`}
      className="fixed inset-0 z-[70] bg-preto/95 backdrop-blur"
    >
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
