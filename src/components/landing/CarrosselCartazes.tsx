"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RukzLogo } from "@/components/brand/RukzLogo";

/**
 * O carrossel de cartazes.
 *
 * A rukz já tem uma linguagem visual pronta, e ela não é de site: é de post.
 * Painel 4:5, etiqueta miúda em caixa alta, título gigante com uma frase em
 * amarelo, corpo cinza, e um rodapé com fio, @rukzapp de um lado e o assunto
 * do outro. Em vez de traduzir isso para "cards de recurso", a landing traz o
 * formato inteiro e deixa a pessoa arrastar, do mesmo jeito que arrastaria no
 * Instagram. Quem vê o anúncio e depois abre o site reconhece a mesma peça.
 *
 * A alternância preto/amarelo não é enfeite: ela separa o que dói (preto) do
 * que resolve (amarelo), que é a ordem em que o argumento é feito.
 *
 * Rolagem nativa com `scroll-snap` é a base, assim funciona no toque, com
 * inércia, e continua rolável se o JavaScript falhar. O arrasto com o mouse é
 * o que se acrescenta por cima, porque no desktop não existe gesto de deslizar.
 */

export type Cartaz = {
  etiqueta: string;
  titulo: string;
  /** O trecho do título que vai em destaque. Precisa existir dentro de `titulo`. */
  destaque: string;
  corpo: string;
  rodape: string;
  /** Amarelo inverte o painel: fundo da marca, tipografia preta. */
  tom: "preto" | "ouro";
};

export function CarrosselCartazes({ cartazes }: { cartazes: Cartaz[] }) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  // Qual cartaz encosta na margem esquerda. Ler a posição da rolagem em vez de
  // guardar um índice mantém os pontinhos certos mesmo quando a pessoa
  // arrasta com o dedo, gira a tela ou pula de cartaz pelo teclado.
  const indicePelaRolagem = (trilha: HTMLElement) => {
    const borda = trilha.scrollLeft;
    let maisPerto = 0;
    let menorDistancia = Infinity;
    Array.from(trilha.children).forEach((filho, i) => {
      const el = filho as HTMLElement;
      const d = Math.abs(el.offsetLeft - trilha.offsetLeft - borda);
      if (d < menorDistancia) {
        menorDistancia = d;
        maisPerto = i;
      }
    });
    return maisPerto;
  };

  const aoRolar = useCallback(() => {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    setAtivo(indicePelaRolagem(trilha));
  }, []);

  const irPara = useCallback((i: number) => {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const alvo = trilha.children[i] as HTMLElement | undefined;
    if (!alvo) return;
    const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trilha.scrollTo({
      left: alvo.offsetLeft - trilha.offsetLeft,
      behavior: semAnimacao ? "auto" : "smooth",
    });
  }, []);

  // Arrastar com o mouse.
  //
  // Enquanto arrasta, o encaixe é desligado: com `scroll-snap` ligado o painel
  // fica se puxando de volta para o centro e o movimento sai aos trancos. Ele
  // volta ao soltar, e aí o encaixe acontece uma vez só, no lugar certo.
  useEffect(() => {
    const trilha = trilhaRef.current;
    if (!trilha) return;

    let arrastando = false;
    let xInicial = 0;
    let rolagemInicial = 0;
    let andou = 0;

    const comecar = (e: PointerEvent) => {
      // Toque e caneta já têm gesto nativo, e duplicar dá conflito.
      if (e.pointerType !== "mouse") return;
      arrastando = true;
      andou = 0;
      xInicial = e.clientX;
      rolagemInicial = trilha.scrollLeft;
      trilha.classList.add("carrossel-arrastando");
    };

    const mover = (e: PointerEvent) => {
      if (!arrastando) return;
      const delta = e.clientX - xInicial;
      andou = Math.max(andou, Math.abs(delta));
      trilha.scrollLeft = rolagemInicial - delta;
    };

    const soltar = () => {
      if (!arrastando) return;
      arrastando = false;
      trilha.classList.remove("carrossel-arrastando");
      // Encaixa no cartaz mais próximo agora que o encaixe voltou a valer.
      irPara(indicePelaRolagem(trilha));
    };

    // Um arrasto que passou por cima de um link não pode virar clique: a
    // pessoa queria deslizar o painel, não navegar.
    const talvezClique = (e: MouseEvent) => {
      if (andou > 8) {
        e.preventDefault();
        e.stopPropagation();
      }
      andou = 0;
    };

    trilha.addEventListener("pointerdown", comecar);
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    trilha.addEventListener("click", talvezClique, true);
    return () => {
      trilha.removeEventListener("pointerdown", comecar);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      trilha.removeEventListener("click", talvezClique, true);
    };
  }, [irPara]);

  const pelaSeta = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      irPara(Math.min(ativo + 1, cartazes.length - 1));
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      irPara(Math.max(ativo - 1, 0));
    }
  };

  return (
    <div
      role="group"
      aria-roledescription="carrossel"
      aria-label="Os recursos da rukz, em cartazes"
      className="relative"
    >
      <div
        ref={trilhaRef}
        onScroll={aoRolar}
        onKeyDown={pelaSeta}
        tabIndex={0}
        className="carrossel gap-4 py-1 sm:gap-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ouro"
      >
        {cartazes.map((c, i) => (
          <Cartaz key={c.titulo} {...c} posicao={i + 1} total={cartazes.length} />
        ))}
      </div>

      {/* Controles embaixo: os pontinhos dizem onde a pessoa está e quanto
          falta, e as setas atendem quem não arrasta nem usa teclado. */}
      <div className="mt-8 flex items-center justify-center gap-6 px-4">
        <button
          type="button"
          onClick={() => irPara(Math.max(ativo - 1, 0))}
          disabled={ativo === 0}
          aria-label="Cartaz anterior"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-traco text-neve transition-colors hover:border-ouro hover:text-ouro disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {cartazes.map((c, i) => (
            <button
              key={c.titulo}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ir para o cartaz ${i + 1}: ${c.etiqueta}`}
              aria-current={i === ativo}
              className="group flex h-6 items-center px-0.5"
            >
              <span
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  i === ativo ? "w-8 bg-ouro" : "w-3 bg-traco-forte group-hover:bg-cinza"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => irPara(Math.min(ativo + 1, cartazes.length - 1))}
          disabled={ativo === cartazes.length - 1}
          aria-label="Próximo cartaz"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-traco text-neve transition-colors hover:border-ouro hover:text-ouro disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Um cartaz.
 *
 * A proporção 4:5 é a do post, e é ela que faz o painel parecer recortado do
 * Instagram em vez de desenhado para caber numa fileira de site.
 */
function Cartaz({
  etiqueta,
  titulo,
  destaque,
  corpo,
  rodape,
  tom,
  posicao,
  total,
}: Cartaz & { posicao: number; total: number }) {
  const ouro = tom === "ouro";

  // O destaque sai do próprio título para o texto continuar sendo uma frase só
  //, para quem lê com leitor de tela, e para quem copia e cola.
  //
  // No cartaz amarelo o destaque some, e isso é de propósito: o amarelo já é a
  // cor de chamar atenção, e no anúncio impresso esse título vai todo preto.
  // Branco sobre #FFC300 dá menos de 2:1 de contraste, some ao sol, no
  // celular, que é onde essa página é lida.
  const corte = ouro ? -1 : titulo.indexOf(destaque);
  const antes = corte >= 0 ? titulo.slice(0, corte) : titulo;
  const depois = corte >= 0 ? titulo.slice(corte + destaque.length) : "";

  return (
    <article
      aria-roledescription="cartaz"
      aria-label={`${posicao} de ${total}`}
      className={`flex aspect-[4/5] w-[85vw] max-w-[30rem] select-none flex-col justify-between rounded-2xl p-7 sm:w-[26rem] sm:p-9 ${
        ouro ? "bg-painel-ouro text-preto" : "border border-traco bg-carvao text-neve"
      }`}
    >
      <RukzLogo
        titulo={null}
        tom={ouro ? "mono" : "marca"}
        className="text-[1.15rem]"
      />

      <div>
        <p className={`tipo-etiqueta text-[0.63rem] ${ouro ? "text-preto/70" : "text-ouro"}`}>
          {etiqueta}
        </p>
        <h3 className="tipo-titulo mt-4 text-[clamp(1.9rem,5.2vw,2.7rem)] text-balance">
          {antes}
          {corte >= 0 && <span className="text-ouro">{destaque}</span>}
          {depois}
        </h3>
        <p className={`mt-4 text-[0.95rem] leading-relaxed ${ouro ? "text-preto/80" : "text-cinza"}`}>
          {corpo}
        </p>
      </div>

      <div
        className={`flex items-center justify-between gap-4 border-t pt-4 text-[0.72rem] ${
          ouro ? "border-preto/15" : "border-traco"
        }`}
      >
        <span className="font-bold">@rukzapp</span>
        <span className={ouro ? "text-preto/70" : "text-cinza-fraco"}>{rodape}</span>
      </div>
    </article>
  );
}
