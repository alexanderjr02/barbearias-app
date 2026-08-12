"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { useTelaGrande } from "./telaGrande";

/**
 * A gravação do copiloto trabalhando, dentro do produto de verdade.
 *
 * Não é animação nem simulação: é a tela sendo usada, com a ordem digitada na
 * hora e o sistema respondendo. Para o dono que desconfia de demonstração
 * bonita, ver a resposta demorar os segundos que ela demora vale mais do que
 * qualquer print.
 *
 * São duas gravações, e não uma redimensionada, porque são dois produtos: no
 * computador o painel no navegador, no celular o aplicativo. Cada tela carrega
 * só o arquivo que vai mostrar; o outro nunca é montado.
 *
 * A moldura acompanha a origem. A gravação do app aparece dentro de um
 * telefone; a do navegador, dentro de uma janela com o endereço. Emoldurar
 * gravação de celular com barra de navegador seria mentir sobre onde aquilo
 * roda.
 *
 * A legenda corre por cima, sincronizada com o tempo. Vídeo de produto não tem
 * som, e sem alguém dizendo o que está acontecendo o dono vê texto subindo numa
 * tela e desiste antes do trecho que importa.
 */

type Fala = { em: number; texto: string };

// Tempos conferidos contra o arquivo, quadro a quadro.
const FALAS_COMPUTADOR: Fala[] = [
  { em: 0, texto: "O dono precisa fechar a agenda de amanhã depois das 15h" },
  { em: 7, texto: "Ele escreve o pedido em português, como falaria com a recepção" },
  { em: 12, texto: "O copiloto abre a agenda e procura quem tem horário naquela faixa" },
  { em: 15, texto: "Nome, hora, serviço e barbeiro de cada um, antes de mexer em nada" },
  { em: 19, texto: "Confirmado, ele bloqueia e avisa os nove pelo app e pelo WhatsApp" },
];

// Os tempos foram conferidos contra o arquivo, quadro a quadro. Legenda que
// chega depois da cena é pior do que legenda nenhuma: a pessoa lê uma coisa e
// vê outra, e desconfia das duas.
const FALAS_APP: Fala[] = [
  { em: 0, texto: "O copiloto abre com o resumo do dia e o botão que resolve cada coisa" },
  { em: 6, texto: "O dono pede a escala da semana" },
  { em: 9, texto: "Ele lê noventa dias de atendimento e conta a demanda de cada dia" },
  { em: 13, texto: "Sexta 493, sábado 473, terça 316: a folga vai para o meio da semana" },
  { em: 18, texto: "Agora o dono simula subir o corte em 10%" },
  { em: 23, texto: "R$ 437 a mais por mês, R$ 5.244 no ano, sem atender ninguém a mais" },
];

export function VideoCopiloto() {
  // Enquanto não souber o tamanho da tela, não monta vídeo nenhum: melhor um
  // espaço reservado por um instante do que baixar o arquivo errado.
  const ehComputador = useTelaGrande();

  if (ehComputador === null) {
    return <div className="aspect-[1280/800] w-full rounded-2xl border border-traco bg-carvao" />;
  }

  return ehComputador ? (
    <Quadro
      src="/landing/video/copiloto.webm"
      capa="/landing/video/copiloto-capa.webp"
      largura={1280}
      altura={800}
      falas={FALAS_COMPUTADOR}
      tocaSozinho
      descricao="Gravação do painel no navegador: o dono pede para fechar a agenda de amanhã depois das 15h, e o copiloto lista os nove clientes afetados, bloqueia o horário e dispara o pedido de remarcação"
      legenda="No computador: o dono avisa que vai fechar amanhã depois das 15h. O copiloto lista os nove clientes daquela faixa, bloqueia o horário e manda o pedido de remarcação. Gravação da tela, acelerada. O bloqueio entrou na agenda e os nove avisos saíram de verdade."
    />
  ) : (
    <Quadro
      src="/landing/video/copiloto-celular.webm"
      capa="/landing/video/copiloto-celular-capa.webp"
      largura={640}
      altura={1386}
      falas={FALAS_APP}
      telefone
      tocaSozinho={false}
      descricao="Gravação do aplicativo: o dono pede a escala da semana, o copiloto responde com a distribuição da equipe por dia calculada pela demanda de noventa dias, e depois simula o efeito de subir o preço do corte em 10%"
      legenda="No aplicativo, duas perguntas seguidas: a escala da semana, que ele monta lendo noventa dias de atendimento, e a simulação de subir o corte em 10%, que ele responde com o ganho no mês e no ano. Gravação da tela, acelerada. Os números são de uma barbearia de demonstração."
    />
  );
}

function Quadro({
  src,
  capa,
  largura,
  altura,
  falas,
  legenda,
  descricao,
  tocaSozinho,
  telefone = false,
}: {
  src: string;
  capa: string;
  largura: number;
  altura: number;
  falas: Fala[];
  legenda: string;
  descricao: string;
  tocaSozinho: boolean;
  telefone?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);
  const [começou, setComeçou] = useState(false);
  const [segundo, setSegundo] = useState(0);

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
    video.play().catch(() => {});
  };

  const alternar = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      setComeçou(true);
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const falaAtual = [...falas].reverse().find((f) => segundo >= f.em)?.texto ?? falas[0]?.texto;

  const tela = (
    <>
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
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onTimeUpdate={(e) => setSegundo(Math.floor(e.currentTarget.currentTime))}
        className="block w-full bg-carvao"
        style={{ aspectRatio: `${largura} / ${altura}` }}
        aria-label={descricao}
      />

      {/* A legenda mora sobre o vídeo, no rodapé, como legenda de filme. Fundo
          escuro atrás do texto porque a tela do produto também é escura e o
          branco puro sumiria em cima dela. */}
      {(tocando || começou) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <p className="mx-auto max-w-[44ch] rounded-lg bg-preto/85 px-3 py-2 text-center text-[13px] font-medium leading-snug text-neve backdrop-blur sm:text-[15px]">
            {falaAtual}
          </p>
        </div>
      )}

      {!tocaSozinho && !começou && (
        <button
          type="button"
          onClick={abrir}
          aria-label="Assistir ao copiloto trabalhando"
          className="absolute inset-0 flex items-center justify-center bg-preto/30 transition-colors active:bg-preto/10"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ouro text-preto shadow-2xl shadow-black/50">
            <Play className="h-7 w-7 translate-x-0.5 fill-preto" aria-hidden="true" />
          </span>
        </button>
      )}
    </>
  );

  return (
    <figure>
      {telefone ? (
        // Telefone: bezel escuro, cantos fundos e o risco do alto-falante em
        // cima. A gravação nasceu num celular, e a moldura diz isso sozinha.
        <div className="mx-auto w-full max-w-[19rem]">
          <div className="rounded-[2.5rem] border border-traco-forte bg-grafite p-2 shadow-2xl shadow-black/70">
            <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-traco-forte" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem]">{tela}</div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-traco bg-carvao shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 border-b border-traco px-4 py-2.5">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-traco-forte" />
              <span className="h-2 w-2 rounded-full bg-traco-forte" />
              <span className="h-2 w-2 rounded-full bg-traco-forte" />
            </span>
            <span className="tipo-dado mx-auto truncate rounded-md bg-grafite px-3 py-1 text-[11px] text-cinza-fraco">
              rukz.com.br/dashboard
            </span>
            <button
              type="button"
              onClick={alternar}
              aria-label={tocando ? "Pausar o vídeo" : "Tocar o vídeo"}
              className="text-cinza transition-colors hover:text-ouro"
            >
              {tocando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="relative">{tela}</div>
        </div>
      )}

      <figcaption className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-cinza">{legenda}</figcaption>
    </figure>
  );
}
