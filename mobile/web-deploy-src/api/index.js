// HTML por barbearia — escrito pelo servidor, nos bytes da primeira resposta.
//
// Antes o index.html era um arquivo estático (uma marca pra todo mundo) e um
// <script> nele reescrevia manifesto/ícone/título DEPOIS que a página já
// tinha carregado. Duas coisas quebravam nesse meio-tempo:
//   1. "Adicionar à Tela de Início" lê as tags no instante do toque — quem
//      tocasse antes do script rodar pegava a marca genérica;
//   2. o service worker do Flutter guardava esse index.html em cache; a
//      próxima visita podia servir a marca de OUTRA barbearia aberta antes
//      no mesmo aparelho.
// Aqui não existe mais index.html no disco (ver vercel.json: tudo cai nesta
// função) — a resposta já sai com a marca certa, sem JS correndo atrás.
//
// O molde vem de ./_template.js, GERADO por scripts/build-web-deploy.js a
// partir do build/web/index.html real do Flutter. Isso significa que
// qualquer coisa que uma versão nova do Flutter mude nesse HTML (novo
// script, nova tag) chega aqui automaticamente — só os marcadores
// %%CORTIX_...%% definidos em mobile/web/index.html são preenchidos abaixo.
const template = require('./_template.js');

const DASHBOARD_ORIGIN = 'https://cortix-pied.vercel.app';
const DEFAULT_NAME = 'Cortix';
const DEFAULT_THEME_COLOR = '#0B0A0F';
const COOKIE_NAME = 'cortix_shop';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano — mesmo raciocínio do
// localStorage que isto substitui: guarda a barbearia pra quem volta sem
// ?shop= na URL (ex.: digitou o domínio de cabeça). Diferente do
// localStorage, um cookie é lido pelo SERVIDOR na primeira requisição, então
// funciona mesmo sem o JavaScript ainda ter rodado.

module.exports = async (req, res) => {
  const queryShop = typeof req.query.shop === "string" ? req.query.shop.trim() : "";
  const slug = queryShop || (req.cookies && req.cookies[COOKIE_NAME]) || "";

  const appOrigin = `https://${req.headers.host}`;
  let shop = null;

  if (slug) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const r = await fetch(
        `${DASHBOARD_ORIGIN}/api/v1/barbershop?slug=${encodeURIComponent(slug)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (r.ok) {
        const body = await r.json();
        shop = body && (body.data || body);
      }
    } catch {
      // Sem rede/timeout/barbearia removida: cai pra marca padrão em vez de
      // derrubar a página — é sempre melhor abrir o app com a marca genérica
      // do que não abrir.
    }
  }

  const name = (shop && shop.name) || DEFAULT_NAME;
  const themeColor = (shop && shop.primaryColor) || DEFAULT_THEME_COLOR;
  const iconUrl = slug
    ? `${DASHBOARD_ORIGIN}/api/brand/icon?slug=${encodeURIComponent(slug)}&size=180`
    : `${appOrigin}/brand-icon.jpg`;
  const manifestUrl = slug
    ? `${DASHBOARD_ORIGIN}/api/brand/manifest?slug=${encodeURIComponent(slug)}&app=${encodeURIComponent(appOrigin)}`
    : `${appOrigin}/manifest.json`;

  const html = template
    .split("%%CORTIX_THEME_COLOR%%").join(escapeHtml(themeColor))
    .split("%%CORTIX_NAME%%").join(escapeHtml(name))
    .split("%%CORTIX_ICON_URL%%").join(escapeHtml(iconUrl))
    .split("%%CORTIX_MANIFEST_URL%%").join(escapeHtml(manifestUrl));

  // Só grava o cookie quando o slug veio da URL — nunca "renova" a partir de
  // um cookie que ele mesmo gerou, e nunca grava a barbearia padrão quando
  // não há slug nenhum (isso apagaria a lembrança de uma visita anterior).
  if (queryShop) {
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${encodeURIComponent(queryShop)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
    );
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Sem cache de CDN: a MESMA url ("/") responde de um jeito diferente pra
  // cada barbearia dependendo do cookie — cachear por url no edge vazaria a
  // marca de uma barbearia pra visita de outra pessoa.
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).send(html);
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
