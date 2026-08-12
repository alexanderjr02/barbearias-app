"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useTelaGrande } from "./telaGrande";

/**
 * A gravação do copiloto trabalhando, dentro do painel de verdade.
 *
 * Não é animação nem simulação: é a tela sendo usada, com a ordem digitada na
 * hora e o sistema executando. Para o dono que desconfia de demonstração
 * bonita, ver a resposta demorar os segundos que ela demora vale mais do que
 * qualquer print.
 *
 * São dois arquivos, e não um redimensionado. A maior parte das visitas chega
 * pelo celular, e um vídeo de painel deitado, espremido na largura de um
 * telefone, vira letra ilegível. Então existe uma gravação em pé, feita no
 * painel aberto no próprio celular, e uma deitada para o computador. Cada
 * tela carrega só o arquivo que vai mostrar, porque o outro nunca é montado.
 *
 * No computador toca sozinho, sem som e em laço, quando entra na tela. No
 * celular não: ali autoplay come dado de quem está no 4G, e quem não pediu
 * nada não deve receber vídeo rodando. Aparece a capa com um botão de tocar, e
 * o toque abre em tela cheia.
 */

export function VideoCopiloto() {
  // Enquanto não souber o tamanho da tela, não monta vídeo nenhum: melhor um
  // espaço reservado por um instante do que baixar um megabyte do arquivo
  // errado.
  const ehComputador = useTelaGrande();

  return (
    <figure>
      {ehComputador === null ? (
        <div className="aspect-[1280/800] w-full rounded-xl border border-traco bg-carvao sm:aspect-[1280/800]" />
      ) : ehComputador ? (
        <>
          <Quadro
            src="/landing/video/copiloto.webm"
            capa="/landing/video/copiloto-capa.webp"
            largura={1280}
            altura={800}
            tocaSozinho
            descricao="Gravação do painel no navegador: o dono pede para fechar a agenda de amanhã depois das 15h, e o copiloto lista os nove clientes afetados, bloqueia o horário e dispara o pedido de remarcação"
          />
          <figcaption className="mt-4 max-w-2xl text-sm leading-relaxed text-cinza">
            No computador: o dono avisa que vai fechar amanhã depois das 15h. O copiloto lista os nove
            clientes daquela faixa, bloqueia o horário e manda o pedido de remarcação. Gravação da tela,
            acelerada. O bloqueio entrou na agenda e os nove avisos saíram de verdade.
          </figcaption>
        </>
      ) : (
        <>
          <Quadro
            src="/landing/video/copiloto-celular.webm"
            capa="/landing/video/copiloto-celular-capa.webp"
            largura={640}
            altura={1386}
            tocaSozinho={false}
            descricao="Gravação do aplicativo: o dono pede a escala da semana e o copiloto responde com a distribuição da equipe por dia, calculada pela demanda dos últimos noventa dias"
          />
          <figcaption className="mt-4 max-w-2xl text-sm leading-relaxed text-cinza">
            No aplicativo: o dono pede a escala da semana e o copiloto lê noventa dias de atendimento para
            dizer quantos barbeiros deixar em cada dia, com o número de cada um. Gravação da tela, acelerada.
            Os números são de uma barbearia de demonstração.
          </figcaption>
        </>
      )}
    </figure>
  );
}

function Quadro({
  src,
  capa,
  largura,
  altura,
  tocaSozinho,
  descricao,
}: {
  src: string;
  capa: string;
  largura: number;
  altura: number;
  tocaSozinho: boolean;
  descricao: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [começou, setComeçou] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || !tocaSozinho) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          // play() devolve promessa rejeitada quando o navegador barra o
          // autoplay. Sem o catch isso vira erro solto no console.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );
    observador.observe(video);
    return () => observador.disconnect();
  }, [tocaSozinho]);

  const abrir = () => {
    const video = ref.current;
    if (!video) return;
    setComeçou(true);
    video.controls = true;
    // Tela cheia é o que resolve a leitura no celular. Onde o navegador não
    // deixa (iPhone só abre pelo player nativo), o vídeo segue tocando
    // embutido, com os controles ligados.
    const emTelaCheia =
      video.requestFullscreen?.bind(video) ??
      (video as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.bind(video);
    try {
      emTelaCheia?.();
    } catch {
      // Sem tela cheia, toca embutido mesmo.
    }
    video.play().catch(() => {});
  };

  return (
    <div className="relative mx-auto overflow-hidden rounded-xl border border-traco bg-carvao" style={{ maxWidth: largura }}>
      <div className="flex items-center gap-3 border-b border-traco px-4 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ouro" aria-hidden="true" />
        <span className="tipo-dado truncate text-[11px] text-cinza-fraco">rukz.com.br/dashboard</span>
      </div>

      <video
        ref={ref}
        src={src}
        poster={capa}
        // Largura e altura reais do arquivo, mais a proporção no CSS: sem isso
        // o elemento nasce em 300x150 e clareia até a capa carregar, o que na
        // tela do celular lê como um piscar branco antes do vídeo.
        width={largura}
        height={altura}
        muted
        loop
        playsInline
        preload="none"
        className="block w-full bg-carvao"
        style={{ aspectRatio: `${largura} / ${altura}` }}
        aria-label={descricao}
      />

      {/* Cobre o vídeo inteiro enquanto ninguém tocou, para o alvo do dedo ser
          a tela toda e não um ícone. Some depois do primeiro toque. */}
      {!tocaSozinho && !começou && (
        <button
          type="button"
          onClick={abrir}
          aria-label="Assistir ao copiloto fechando a agenda"
          className="absolute inset-x-0 bottom-0 top-11 flex items-center justify-center bg-preto/30 transition-colors active:bg-preto/10"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ouro text-preto shadow-2xl shadow-black/50">
            <Play className="h-7 w-7 translate-x-0.5 fill-preto" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
