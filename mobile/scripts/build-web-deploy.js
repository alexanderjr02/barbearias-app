#!/usr/bin/env node
// Monta mobile/web-deploy/ — o que de fato sobe pro Vercel do app.
//
// Antes o `vercel deploy` rodava direto de mobile/build/web (puramente
// estático, sem servidor). Este script empacota os assets do Flutter
// (build/web, SEM o index.html) junto com a função que gera o HTML por
// barbearia (web-deploy-src/api/index.js): o index.html vira um molde que a
// função preenche a cada resposta, em vez de um arquivo servido direto.
//
// Rodar depois de `flutter build web --release --dart-define=...`:
//   node mobile/scripts/build-web-deploy.js
//
// Resultado: mobile/web-deploy/, pronto para `vercel deploy --prod --cwd
// mobile/web-deploy`. Esse diretório é gerado (git-ignorado), igual
// mobile/build/ — a fonte de verdade fica em mobile/web-deploy-src/.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUILD_WEB = path.join(ROOT, "build", "web");
const SRC = path.join(ROOT, "web-deploy-src");
const OUT = path.join(ROOT, "web-deploy");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (!fs.existsSync(BUILD_WEB)) {
    console.error(
      'mobile/build/web não existe — rode "flutter build web --release --dart-define=..." antes.'
    );
    process.exit(1);
  }
  if (!fs.existsSync(path.join(BUILD_WEB, "index.html"))) {
    console.error("mobile/build/web/index.html não existe — build do Flutter incompleto?");
    process.exit(1);
  }

  // Recomeça do zero pra nunca deixar lixo de um deploy anterior (ex.: um
  // asset que existia numa versão antiga e foi removido).
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 1. Assets estáticos do Flutter — tudo, MENOS index.html. Ele fica de
  // fora de propósito: se existisse no disco, o Vercel o serviria direto
  // pra "/" (filesystem tem prioridade sobre rewrites — ver vercel.json),
  // e a função dinâmica nunca rodaria.
  const SKIP = new Set(["index.html", ".vercel", "vercel.json", "appurl.tmp"]);
  for (const entry of fs.readdirSync(BUILD_WEB)) {
    if (SKIP.has(entry)) continue;
    copyRecursive(path.join(BUILD_WEB, entry), path.join(OUT, entry));
  }

  // 2. Fonte da função + vercel.json (versionados em git, mão).
  //
  // Sobre o cache declarado no vercel.json (o formato não aceita comentário):
  // o Flutter NÃO põe hash no nome do main.dart.js, então cache imutável
  // travaria todo mundo numa versão velha para sempre. Por isso max-age curto
  // + stale-while-revalidate: a abertura serve do cache na hora e a versão
  // nova desce em segundo plano, valendo na abertura seguinte. O canvaskit
  // ganha prazo maior porque só muda quando a versão do Flutter muda, e o
  // flutter_bootstrap.js fica sem cache de propósito — ele é a porta de
  // entrada por onde uma versão nova é descoberta.
  copyRecursive(SRC, OUT);

  // 3. index.html vira um molde embutido na função — não um arquivo servido.
  const indexHtml = fs.readFileSync(path.join(BUILD_WEB, "index.html"), "utf8");
  if (!indexHtml.includes("%%CORTIX_NAME%%")) {
    console.error(
      "build/web/index.html não tem os marcadores %%CORTIX_...%% — mobile/web/index.html foi editado corretamente?"
    );
    process.exit(1);
  }
  const templateModule =
    "// GERADO por scripts/build-web-deploy.js — não editar à mão.\n" +
    "// Molde extraído de build/web/index.html; os pontos %%CORTIX_...%% são\n" +
    "// preenchidos em api/index.js.\n" +
    "module.exports = " + JSON.stringify(indexHtml) + ";\n";
  fs.mkdirSync(path.join(OUT, "api"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "api", "_template.js"), templateModule);

  // 4. Mantém o deploy ligado ao MESMO projeto Vercel (cortix-app) já em
  // uso — sem isso o CLI acha que é um projeto novo e gera outro domínio,
  // invalidando todo QR/link já compartilhado com barbearias.
  const vercelLink = path.join(BUILD_WEB, ".vercel", "project.json");
  if (fs.existsSync(vercelLink)) {
    fs.mkdirSync(path.join(OUT, ".vercel"), { recursive: true });
    fs.copyFileSync(vercelLink, path.join(OUT, ".vercel", "project.json"));
  } else {
    console.warn(
      "Aviso: build/web/.vercel/project.json não encontrado — o deploy vai pedir pra linkar " +
        'o projeto (escolha o existente "cortix-app", NUNCA crie um novo).'
    );
  }

  console.log("mobile/web-deploy/ pronto.");
  console.log("Deploy: vercel deploy --prod --cwd mobile/web-deploy --token <TOKEN>");
}

main();
