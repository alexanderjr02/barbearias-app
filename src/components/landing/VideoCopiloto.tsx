"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

/**
 * A gravação do copiloto trabalhando, dentro do painel de verdade.
 *
 * Não é animação nem simulação: é a tela sendo usada, com a ordem digitada na
 * hora e o sistema executando. Para o dono que desconfia de demonstração
 * bonita, ver a resposta demorar os segundos que ela demora vale mais do que
 * qualquer print.
 *
 * Dois comportamentos, porque são dois jeitos de assistir. No computador ele
 * toca sozinho, sem som e em laço, assim que entra na tela, e para quando sai,
 * que é o que se espera de uma demonstração curta de produto. No celular, não:
 * ali autoplay come dado de quem está no 4G, o vídeo é pequeno demais para se
 * ler nada e a pessoa não pediu nada. O celular mostra a capa com um botão de
 * tocar, e o toque abre em tela cheia, onde a letra do painel finalmente cabe.
 *
 * `preload="none"`: o arquivo só desce quando alguém decide ver.
 */
export function VideoCopiloto() {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);
  const [começou, setComeçou] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Só o computador ganha o laço automático. O corte é o mesmo do layout
    // (`sm` do Tailwind), para o comportamento bater com o que se vê.
    const noCelular = !window.matchMedia("(min-width: 640px)").matches;
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noCelular || semMovimento) return;

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
  }, []);

  const abrir = () => {
    const video = ref.current;
    if (!video) return;
    setComeçou(true);
    video.controls = true;
    // Tela cheia é o que resolve a legibilidade no celular. Onde o navegador
    // não deixa (iPhone só abre em tela cheia pelo player nativo), o vídeo
    // segue tocando embutido, com os controles ligados.
    const pedirTela = video.requestFullscreen?.bind(video) ?? (video as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.bind(video);
    try {
      pedirTela?.();
    } catch {
      // Sem tela cheia, toca embutido mesmo.
    }
    video.play().catch(() => {});
  };

  const alternar = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <figure>
      <div className="relative overflow-hidden rounded-xl border border-traco bg-carvao">
        <div className="flex items-center gap-3 border-b border-traco px-4 py-2.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ouro" aria-hidden="true" />
          <span className="tipo-dado truncate text-[11px] text-cinza-fraco">rukz.com.br/dashboard</span>
        </div>
        <video
          ref={ref}
          src="/landing/video/copiloto.webm"
          poster="/landing/video/copiloto-capa.webp"
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setTocando(true)}
          onPause={() => setTocando(false)}
          className="block w-full"
          aria-label="Gravação do painel: o dono pede para fechar a agenda de amanhã depois das 15h, e o copiloto lista os nove clientes afetados, bloqueia o horário e dispara o pedido de remarcação para eles"
        />

        {/* O botão só existe enquanto ninguém tocou, e some depois. Cobre o
            vídeo inteiro para o alvo do dedo ser a tela toda, não um ícone. */}
        {!começou && (
          <button
            type="button"
            onClick={abrir}
            aria-label="Assistir ao copiloto fechando a agenda"
            className="absolute inset-x-0 bottom-0 top-11 flex items-center justify-center bg-preto/35 transition-colors hover:bg-preto/20 sm:hidden"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ouro text-preto shadow-2xl shadow-black/50">
              <Play className="h-7 w-7 translate-x-0.5 fill-preto" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="max-w-2xl text-sm leading-relaxed text-cinza">
          Gravação da tela, acelerada para caber em meio minuto. Nada foi montado: o bloqueio entrou na agenda
          e os nove avisos saíram de verdade. Os números são de uma barbearia de demonstração.
        </span>
        <button
          type="button"
          onClick={alternar}
          className="tipo-etiqueta hidden shrink-0 rounded border border-traco px-2 py-1 text-[0.55rem] text-cinza transition-colors hover:border-ouro hover:text-ouro sm:block"
        >
          {tocando ? "pausar" : "tocar"}
        </button>
      </figcaption>
    </figure>
  );
}
