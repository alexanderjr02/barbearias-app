// Molde customizado de flutter_bootstrap.js. O Flutter substitui os dois
// marcadores abaixo no build (mesmo mecanismo do $FLUTTER_BASE_HREF em
// web/index.html): o primeiro vira a biblioteca do loader, o segundo vira o
// JSON de configuração do build. Ver:
// https://docs.flutter.dev/platform-integration/web/initialization
//
// IMPORTANTE: os marcadores abaixo não podem aparecer em mais nenhum lugar
// deste arquivo (nem citados em comentário) — a substituição é uma troca de
// texto simples, sem noção de comentário, e troca TODAS as ocorrências.
//
// A única diferença do bootstrap que o Flutter geraria sozinho é não passar
// nada para _flutter.loader.load(): sem um objeto de configuração com
// serviceWorkerSettings, o loader nunca chama
// navigator.serviceWorker.register() e nenhuma instalação nova registra o
// service worker de cache offline do Flutter.
//
// Esse service worker cacheava o index.html — inclusive depois que ele
// passou a ter a marca de cada barbearia embutida pelo servidor. Sem
// desligar o registro, a primeira visita de cada aparelho ainda cacheia o
// HTML dessa visita e pode servir a marca errada (ou a de outra barbearia
// testada antes no mesmo navegador) nas visitas seguintes. Este app já
// depende de rede para tudo (agenda, fidelidade, chat) — não há experiência
// offline real que valha esse risco.
{{flutter_js}}
{{flutter_build_config}}

_flutter.loader.load();
