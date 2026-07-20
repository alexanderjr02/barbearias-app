// Service worker SÓ de push. De propósito não tem handler de `fetch`.
//
// O service worker de cache do Flutter foi desligado (ver web/index.html e
// web/flutter_bootstrap.js) porque ele guardava o index.html e servia a marca
// de OUTRA barbearia. Este aqui NÃO intercepta rede e NÃO guarda nada — só
// reage a push. Sem handler de fetch, ele é incapaz de servir HTML velho, então
// não reabre aquele bug. É o único jeito de ter push: o evento `push` só chega
// a um service worker.

// Recebe o aviso do servidor e mostra a notificação. Sem isto, um push que
// chega com o app fechado é descartado — pior, alguns navegadores mostram uma
// notificação genérica "site atualizado em segundo plano".
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // payload não-JSON: usa o texto cru como corpo
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Cortix';
  const options = {
    body: data.body || '',
    // Ícone do balão. Um caminho relativo resolve contra o escopo do SW (a
    // raiz do app), então funciona em qualquer barbearia.
    icon: data.icon || 'icons/Icon-192.png',
    badge: data.badge || 'icons/Icon-192.png',
    // `tag` agrupa: dois "novo agendamento" viram um balão só, não uma pilha.
    tag: data.tag || undefined,
    // Leva o dado do clique adiante (para onde abrir).
    data: { url: data.url || '/' },
    // No Android/desktop, vibra de leve — mesma sensação de mensagem chegando.
    vibrate: [80, 40, 80],
  };

  // waitUntil segura o service worker vivo até a notificação aparecer; sem
  // isso o navegador pode matar o worker antes de mostrar o balão.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tocar na notificação: foca uma aba já aberta do app (não abre uma segunda) ou
// abre uma nova na URL do aviso.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        // Já tem o app aberto? Traz para frente.
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && target !== '/') {
            try { client.navigate(target); } catch (e) { /* navegação bloqueada: só foca */ }
          }
          return;
        }
      }
      // Nenhuma aba aberta: abre uma.
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

// Assume o controle assim que instala, sem esperar todas as abas fecharem —
// para o push já valer na primeira ativação.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
