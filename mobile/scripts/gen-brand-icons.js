#!/usr/bin/env node
// Gera os ícones CORTIX de mobile/web/icons/ a partir do SVG oficial da marca
// (public/icons/icon.svg, o mesmo do dashboard).
//
// Existe porque esses PNGs são a identidade do app instalado para quem NÃO é
// ENTERPRISE — antes eram o logo azul padrão do Flutter, que não diz nada
// sobre a CORTIX. Ficam versionados em git; rode isto só quando o logo mudar:
//   node mobile/scripts/gen-brand-icons.js

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SVG = path.join(ROOT, "public", "icons", "icon.svg");
const OUT = path.join(ROOT, "mobile", "web", "icons");

async function main() {
  if (!fs.existsSync(SVG)) {
    console.error(`SVG da marca não encontrado: ${SVG}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const svg = fs.readFileSync(SVG);

  // density alto: o SVG é vetorial, mas o sharp rasteriza a partir de uma
  // resolução base — sem isso o 512 sai borrado.
  // 180 é o tamanho que o iOS pede no apple-touch-icon.
  for (const size of [180, 192, 512]) {
    await sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(OUT, `Icon-${size}.png`));
  }

  // "maskable": o sistema recorta até ~20% das bordas para encaixar o ícone na
  // forma do aparelho. A arte precisa de respiro, senão a tesoura perde as
  // pontas — fundo cheio na cor da marca com o logo reduzido ao centro.
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.62);
    const art = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#09090b" } })
      .composite([{ input: art, gravity: "center" }])
      .png()
      .toFile(path.join(OUT, `Icon-maskable-${size}.png`));
  }

  for (const f of fs.readdirSync(OUT).sort()) {
    console.log(" ", f, fs.statSync(path.join(OUT, f)).size, "bytes");
  }
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
