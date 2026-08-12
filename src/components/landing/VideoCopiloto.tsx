"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A gravação do copiloto respondendo, dentro do painel de verdade.
 *
 * Não é animação nem simulação: é a tela sendo usada, com a pergunta digitada
 * na hora e a resposta saindo dos dados daquela barbearia. Para o dono que
 * desconfia de demonstração bonita, ver o cursor digitando e a resposta
 * demorando os segundos que ela demora vale mais do que qualquer print.
 *
 * Toca sozinho, sem som e em laço, quando entra na tela, que é o
 * comportamento que a pessoa espera de uma demonstração curta de produto. Sai
 * do ar assim que a seção sai da tela, para não deixar vídeo rodando escondido
 * gastando bateria. Quem pediu menos movimento no sistema recebe a capa
 * parada, e o controle de tocar continua ali.
 *
 * `preload="none"`: o arquivo só desce quando a seção chega perto, então quem
 * abre a página e decide nos planos nunca paga o megabyte do vídeo.
 */
export function VideoCopiloto() {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
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
  }, []);

  const alternar = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <figure>
      <div className="overflow-hidden rounded-xl border border-traco bg-carvao">
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
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="max-w-2xl text-sm leading-relaxed text-cinza">
          Gravação da tela, acelerada para caber em meio minuto. Nada foi montado: o bloqueio entrou na agenda
          e os nove avisos saíram de verdade. Os números são de uma barbearia de demonstração.
        </span>
        <button
          type="button"
          onClick={alternar}
          className="tipo-etiqueta shrink-0 rounded border border-traco px-2 py-1 text-[0.55rem] text-cinza transition-colors hover:border-ouro hover:text-ouro"
        >
          {tocando ? "pausar" : "tocar"}
        </button>
      </figcaption>
    </figure>
  );
}
