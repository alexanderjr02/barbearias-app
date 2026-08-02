/**
 * A marca rukz, desenhada.
 *
 * O símbolo e a palavra saem dos traçados do arquivo oficial (public/brand),
 * e não de uma fonte parecida. Wordmark é desenho: se um dia a Plus Jakarta
 * mudar de versão, ou não carregar, a palavra continua idêntica.
 *
 * O bigode e a palavra pintam com `currentColor`. Isso é o que deixa a mesma
 * marca funcionar nos três fundos da identidade sem trocar de arquivo: no
 * preto ela herda branco, no amarelo herda preto, no branco herda preto.
 *
 * O "r" é a única peça com cor fixa (#FFC300) porque ele é o acento da marca.
 * A exceção é o painel amarelo, onde amarelo sobre amarelo some, daí o
 * `tom="mono"`, que joga o "r" para currentColor junto com o resto.
 */

type Tom = "marca" | "mono";

// Recortes justos na tinta do desenho, calculados a partir do arquivo de 1024.
// Sem eles a marca vem com uma moldura de vazio em volta e nunca alinha com o
// texto ao lado.
const VB_SIMBOLO = "194.5 364.16 634.9 295.67"; // 2.147 : 1
const VB_PALAVRA = "0 0 290.69 110.53"; // 2.630 : 1

const OURO = "#FFC300";

const BIGODE =
  "M 0.0 5.5 L 35.0 20.5 L 57.0 27.5 L 77.0 31.5 L 93.0 31.5 L 106.0 25.5 L 115.0 15.5 L 124.0 -3.5 L 126.0 -14.5 L 128.0 -16.5 L 128.0 -26.5 L 125.0 -28.5 L 120.0 -26.5 L 117.0 -13.5 L 110.0 -3.5 L 101.0 1.5 L 91.0 2.5 L 77.0 -2.5 L 46.0 -27.5 L 36.0 -31.5 L 24.0 -31.5 L 9.0 -23.5 L 0.0 -12.5 Z";

const LETRA_R =
  "M 13.52 -0.00 L 13.52 -121.48 L 51.76 -121.48 L 51.76 -0.00 L 13.52 -0.00 Z M 51.76 -66.76 L 35.74 -79.26 Q 40.51 -100.51 51.76 -112.23 Q 63.01 -123.98 83.01 -123.98 Q 91.76 -123.98 98.36 -121.37 Q 105.00 -118.75 110.00 -113.24 L 87.27 -84.49 Q 84.77 -87.27 81.02 -88.75 Q 77.27 -90.23 72.50 -90.23 Q 63.01 -90.23 57.38 -84.38 Q 51.76 -78.52 51.76 -66.76 Z";

const PALAVRA =
  "M 8.11 -0.00 L 8.11 -72.89 L 31.05 -72.89 L 31.05 -0.00 L 8.11 -0.00 Z M 31.05 -40.05 L 21.45 -47.55 Q 24.30 -60.30 31.05 -67.34 Q 37.80 -74.39 49.80 -74.39 Q 55.05 -74.39 59.02 -72.82 Q 63.00 -71.25 66.00 -67.95 L 52.36 -50.70 Q 50.86 -52.36 48.61 -53.25 Q 46.36 -54.14 43.50 -54.14 Q 37.80 -54.14 34.43 -50.62 Q 31.05 -47.11 31.05 -40.05 Z M 107.60 1.64 Q 97.55 1.64 89.81 -2.48 Q 82.10 -6.61 77.74 -13.88 Q 73.40 -21.14 73.40 -30.61 L 73.40 -72.89 L 96.35 -72.89 L 96.35 -30.89 Q 96.35 -27.14 97.62 -24.45 Q 98.90 -21.75 101.44 -20.25 Q 103.99 -18.75 107.60 -18.75 Q 112.71 -18.75 115.71 -21.96 Q 118.71 -25.20 118.71 -30.89 L 118.71 -72.89 L 141.65 -72.89 L 141.65 -30.75 Q 141.65 -21.14 137.30 -13.88 Q 132.96 -6.61 125.30 -2.48 Q 117.65 1.64 107.60 1.64 Z M 203.20 -0.00 L 177.70 -37.80 L 203.06 -72.89 L 228.70 -72.89 L 198.09 -33.45 L 198.84 -42.89 L 230.20 -0.00 L 203.20 -0.00 Z M 156.56 -0.00 L 156.56 -108.89 L 179.50 -108.89 L 179.50 -0.00 L 156.56 -0.00 Z M 234.30 -13.50 L 270.90 -59.55 L 298.80 -59.55 L 262.21 -13.50 L 234.30 -13.50 Z M 234.30 -0.00 L 234.30 -13.50 L 250.65 -19.20 L 297.90 -19.20 L 297.90 -0.00 L 234.30 -0.00 Z M 236.99 -53.70 L 236.99 -72.89 L 298.80 -72.89 L 298.80 -59.55 L 282.60 -53.70 L 236.99 -53.70 Z";

/** O bigode com o "r". Sozinho, é a marca reduzida, ícone, favicon, avatar. */
export function RukzSimbolo({ className = "", tom = "marca" }: { className?: string; tom?: Tom }) {
  return (
    <svg viewBox={VB_SIMBOLO} fill="none" aria-hidden="true" className={className}>
      <g transform="translate(440.8,636.1) scale(2.1934)">
        <g transform="translate(32.44,-24.80) scale(-1.1307,1.1307)">
          <path d={BIGODE} fill="currentColor" />
        </g>
        <g transform="translate(32.44,-24.80) scale(1.1307)">
          <path d={BIGODE} fill="currentColor" />
        </g>
        <path d={LETRA_R} fill={tom === "mono" ? "currentColor" : OURO} />
      </g>
    </svg>
  );
}

/** Só a palavra. Serve onde o símbolo já apareceu e repetir seria gagueira. */
/**
 * Só o "r", recortado justo. Para espaços pequenos e redondos onde o bigode
 * não caberia, o avatar do Copiloto, por exemplo. Herda `currentColor`, então
 * dentro de um círculo amarelo ele sai preto sem precisar de variante.
 */
const VB_LETRA = "470.45 364.16 211.6 271.9";

export function RukzLetraR({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={VB_LETRA} fill="none" aria-hidden="true" className={className}>
      <g transform="translate(440.8,636.1) scale(2.1934)">
        <path d={LETRA_R} fill="currentColor" />
      </g>
    </svg>
  );
}

export function RukzPalavra({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={VB_PALAVRA} fill="none" aria-hidden="true" className={className}>
      <g transform="translate(-8.11,108.89)">
        <path d={PALAVRA} fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * O conjunto.
 *
 * `deitado` é o da barra de navegação, onde a altura é curta e a largura sobra.
 * Ali o símbolo vale 0,47 da palavra, que é a relação do arquivo de assinatura
 * oficial, deitado, o bigode acompanha a palavra sem levantar a linha.
 *
 * `empilhado` é o do anúncio, e a relação é outra: com o bigode em cima ele
 * vira a figura principal, quase da altura da palavra inteira. Reduzido à
 * proporção do deitado, como estava, ele encolhia num risquinho em cima do
 * texto e a marca perdia justamente o que tem de reconhecível.
 */
export function RukzLogo({
  className = "",
  orientacao = "deitado",
  tom = "marca",
  titulo = "rukz",
}: {
  className?: string;
  orientacao?: "deitado" | "empilhado";
  tom?: Tom;
  titulo?: string | null;
}) {
  const rotulo = titulo
    ? { role: "img" as const, "aria-label": titulo }
    : { "aria-hidden": true as const };

  if (orientacao === "empilhado") {
    return (
      <span {...rotulo} className={`inline-flex flex-col items-center ${className}`}>
        <RukzSimbolo tom={tom} className="h-[0.95em] w-auto" />
        <RukzPalavra className="mt-[0.22em] h-[1em] w-auto" />
      </span>
    );
  }

  return (
    <span {...rotulo} className={`inline-flex items-center ${className}`}>
      <RukzSimbolo tom={tom} className="h-[0.47em] w-auto" />
      <RukzPalavra className="ml-[0.30em] h-[1em] w-auto" />
    </span>
  );
}
