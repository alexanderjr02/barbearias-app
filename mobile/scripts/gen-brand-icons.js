#!/usr/bin/env node
// Gera os ícones do app Flutter (mobile/web/icons/) a partir do símbolo rukz.
//
// A marca é preto + amarelo #FFC300. O ícone "any" é o símbolo sobre o fundo
// preto da marca; o maskable ganha respiro nas bordas (o sistema recorta ~20%
// para encaixar na forma do aparelho).
//
// Fonte da verdade: o pacote de marca em Downloads/Rukz-Marca. Rode quando o
// símbolo mudar: node mobile/scripts/gen-brand-icons.js

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MARCA = "C:/Users/alexa/Downloads/Rukz-Marca/SVG-Editaveis";
const QUADRADO = path.join(MARCA, "rukz-icone-quadrado.svg"); // símbolo sobre preto
const SIMBOLO = path.join(MARCA, "rukz-simbolo.svg"); // só o símbolo, fundo transparente
const OUT = path.join(ROOT, "web", "icons");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const quadrado = fs.readFileSync(QUADRADO);
  const simbolo = fs.readFileSync(SIMBOLO);

  // "any": o ícone quadrado da marca (preto + símbolo), cantos arredondados
  // pelo próprio sistema.
  //
  // .flatten() é o detalhe que importa pro iOS: sem ele o PNG sai com canal
  // alfa (RGBA), e o "Adicionar à Tela de Início" do iPhone às vezes recusa
  // ícone com transparência e mostra um quadrado em branco. Achatando no preto
  // da marca o ícone fica 100% opaco (RGB), do jeito que o iOS espera.
  for (const size of [180, 192, 512]) {
    await sharp(quadrado, { density: 384 }).resize(size, size).flatten({ background: "#000000" }).png().toFile(path.join(OUT, `Icon-${size}.png`));
  }

  // "maskable": fundo preto cheio + símbolo reduzido ao centro, com respiro.
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.6);
    const art = await sharp(simbolo, { density: 384 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#000000" } })
      .composite([{ input: art, gravity: "center" }])
      .flatten({ background: "#000000" })
      .png()
      .toFile(path.join(OUT, `Icon-maskable-${size}.png`));
  }

  // Favicon do app.
  await sharp(quadrado, { density: 384 }).resize(64, 64).flatten({ background: "#000000" }).png().toFile(path.join(ROOT, "web", "favicon.png"));

  for (const f of fs.readdirSync(OUT).sort()) {
    console.log("  ", f, fs.statSync(path.join(OUT, f)).size, "bytes");
  }
  console.log("   favicon.png atualizado");
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
