"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Gauge } from "lucide-react";
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
 * só o arquivo que vai mostrar. A moldura acompanha a origem: telefone para o
 * app, janela com endereço para o navegador.
 *
 * Quem manda no vídeo é quem assiste. Tem barra de tempo arrastável, pausa,
 * recomeço e um controle de velocidade, porque a gravação é acelerada e nem
 * todo mundo lê no mesmo ritmo. E tem narração opcional, desligada por padrão:
 * som que começa sozinho é motivo para fechar a aba.
 *
 * A narração é falada pelo próprio aparelho, com a voz de português que ele
 * tiver instalada, dando preferência a uma voz feminina. Não é áudio embutido
 * no arquivo: assim ela acompanha a legenda mesmo se alguém arrastar a barra,
 * e não pesa um byte no download.
 */

type Fala = { em: number; texto: string };

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
  { em: 7, texto: "O dono avisa que vai fechar amanhã depois das 15h" },
  { em: 13, texto: "Ele acha os doze clientes daquela faixa: nome, hora, serviço e barbeiro" },
  { em: 22, texto: "Autorizado, bloqueia a agenda e avisa os doze pelo app e pelo WhatsApp" },
  { em: 33, texto: "E se o dono se arrepender? Um toque em desfazer" },
  { em: 39, texto: "A agenda volta ao que era, e os seis barbeiros são liberados" },
  { em: 44, texto: "Agora as perguntas que nenhum outro sistema responde" },
  { em: 48, texto: "Qual serviço rende mais por hora de cadeira, e não por preço de tabela" },
  { em: 55, texto: "Quem tem histórico de furar e está marcado para amanhã" },
  { em: 63, texto: "E se vale a pena contratar mais um barbeiro, com o número da casa" },
];

export function VideoCopiloto() {
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
      largura={390}
      altura={844}
      falas={FALAS_APP}
      telefone
      tocaSozinho={false}
      descricao="Gravação do aplicativo: o dono fecha a agenda de amanhã depois das 15h e o copiloto avisa os doze clientes afetados, o dono desfaz e a agenda volta, e depois ele responde qual serviço rende mais por hora de cadeira, quem tem risco de furar amanhã e se vale a pena contratar mais um barbeiro"
      legenda="Uma conversa só, no aplicativo: fechar a agenda de amanhã avisando os doze clientes da faixa, desfazer tudo com um toque, e três perguntas que nenhum outro sistema responde. Gravação da tela, acelerada. O bloqueio, os avisos e o desfazer aconteceram de verdade."
    />
  );
}

/** Nomes de voz feminina de português que os sistemas costumam instalar. */
const VOZES_FEMININAS = ["luciana", "francisca", "maria", "fernanda", "helo", "vitoria", "vitória", "female", "mulher"];

/** Escolhe a melhor voz de português disponível no aparelho. */
function escolherVoz(vozes: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const emPortugues = vozes.filter((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (emPortugues.length === 0) return null;
  const brasileiras = emPortugues.filter((v) => v.lang.toLowerCase().includes("br"));
  const candidatas = brasileiras.length ? brasileiras : emPortugues;
  return candidatas.find((v) => VOZES_FEMININAS.some((n) => v.name.toLowerCase().includes(n))) ?? candidatas[0];
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
  const [duracao, setDuracao] = useState(0);
  const [devagar, setDevagar] = useState(false);
  const [narrando, setNarrando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  const vozRef = useRef<SpeechSynthesisVoice | null>(null);
  const ultimaFalaRef = useRef<string>("");

  // Vozes chegam de forma assíncrona em boa parte dos navegadores, então o
  // botão de narração só aparece depois que existe uma voz de português.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const ler = () => {
      const voz = escolherVoz(window.speechSynthesis.getVoices());
      vozRef.current = voz;
      setTemVoz(Boolean(voz));
    };
    ler();
    window.speechSynthesis.addEventListener("voiceschanged", ler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", ler);
  }, []);

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

  const falaAtual = [...falas].reverse().find((f) => segundo >= f.em)?.texto ?? falas[0]?.texto ?? "";

  // Fala a legenda quando ela muda. `cancel` antes de cada fala evita fila:
  // quem arrasta a barra quer ouvir o trecho novo, não a fila do anterior.
  useEffect(() => {
    if (!narrando || !falaAtual || falaAtual === ultimaFalaRef.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    ultimaFalaRef.current = falaAtual;
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(falaAtual);
    if (vozRef.current) fala.voice = vozRef.current;
    fala.lang = vozRef.current?.lang ?? "pt-BR";
    fala.rate = 1;
    fala.pitch = 1.05;
    window.speechSynthesis.speak(fala);
  }, [falaAtual, narrando]);

  // Silêncio ao sair da tela, ao pausar e ao desmontar. Voz que continua
  // falando depois que a pessoa saiu do vídeo é assombração.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!narrando || !tocando) window.speechSynthesis.cancel();
  }, [narrando, tocando]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const alternar = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      setComeçou(true);
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const recomeçar = () => {
    const video = ref.current;
    if (!video) return;
    video.currentTime = 0;
    ultimaFalaRef.current = "";
    setComeçou(true);
    video.play().catch(() => {});
  };

  const trocarVelocidade = () => {
    const video = ref.current;
    if (!video) return;
    const novo = !devagar;
    setDevagar(novo);
    video.playbackRate = novo ? 0.6 : 1;
  };

  const trocarNarracao = () => {
    const video = ref.current;
    const ligando = !narrando;
    setNarrando(ligando);
    ultimaFalaRef.current = "";
    if (ligando && video) {
      // Com voz, o vídeo desacelera sozinho: a legenda precisa durar o tempo
      // de ser falada, senão a narração fica sempre um passo atrás da imagem.
      setDevagar(true);
      video.playbackRate = 0.6;
      if (video.paused) {
        setComeçou(true);
        video.play().catch(() => {});
      }
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const irPara = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = ref.current;
    if (!video) return;
    video.currentTime = Number(e.target.value);
    ultimaFalaRef.current = "";
    setSegundo(Math.floor(Number(e.target.value)));
  };

  const relogio = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
        onLoadedMetadata={(e) => setDuracao(e.currentTarget.duration || 0)}
        onClick={alternar}
        className="block w-full cursor-pointer bg-carvao"
        style={{ aspectRatio: `${largura} / ${altura}` }}
        aria-label={descricao}
      />

      {/* A legenda mora no alto: embaixo é onde a resposta do copiloto chega e
          onde fica o campo de digitar, ou seja, o que a pessoa precisa ver. */}
      {(tocando || começou) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
          <p className="mx-auto max-w-[44ch] rounded-lg bg-preto/85 px-3 py-2 text-center text-[13px] font-medium leading-snug text-neve backdrop-blur sm:text-[15px]">
            {falaAtual}
          </p>
        </div>
      )}

      {!começou && !tocando && (
        <button
          type="button"
          onClick={alternar}
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

  const controles = (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? "Pausar" : "Tocar"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ouro text-preto transition-colors hover:bg-ouro-claro"
      >
        {tocando ? <Pause className="h-4 w-4 fill-preto" /> : <Play className="h-4 w-4 translate-x-px fill-preto" />}
      </button>

      <button
        type="button"
        onClick={recomeçar}
        aria-label="Ver de novo desde o começo"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-traco-forte text-cinza transition-colors hover:border-ouro hover:text-ouro"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>

      <label className="flex min-w-[8rem] flex-1 items-center gap-2">
        <span className="sr-only">Posição do vídeo</span>
        <input
          type="range"
          min={0}
          max={duracao || 1}
          step={0.1}
          value={Math.min(segundo, duracao || 1)}
          onChange={irPara}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-traco-forte accent-ouro"
        />
      </label>

      <span className="tipo-dado shrink-0 text-[11px] text-cinza-fraco">
        {relogio(segundo)} / {relogio(duracao)}
      </span>

      <button
        type="button"
        onClick={trocarVelocidade}
        aria-pressed={devagar}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
          devagar ? "border-ouro text-ouro" : "border-traco-forte text-cinza hover:border-cinza hover:text-neve"
        }`}
      >
        <Gauge className="h-3 w-3" aria-hidden="true" />
        {devagar ? "devagar" : "normal"}
      </button>

      {temVoz && (
        <button
          type="button"
          onClick={trocarNarracao}
          aria-pressed={narrando}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
            narrando ? "border-ouro text-ouro" : "border-traco-forte text-cinza hover:border-cinza hover:text-neve"
          }`}
        >
          {narrando ? <Volume2 className="h-3 w-3" aria-hidden="true" /> : <VolumeX className="h-3 w-3" aria-hidden="true" />}
          narração
        </button>
      )}
    </div>
  );

  return (
    <figure>
      {telefone ? (
        <div className="mx-auto w-full max-w-[19rem]">
          <div className="rounded-[2.5rem] border border-traco-forte bg-grafite p-2 shadow-2xl shadow-black/70">
            <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-traco-forte" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem]">{tela}</div>
          </div>
          {controles}
        </div>
      ) : (
        <div>
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
            </div>
            <div className="relative">{tela}</div>
          </div>
          {controles}
        </div>
      )}

      <figcaption className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-cinza">{legenda}</figcaption>
    </figure>
  );
}
