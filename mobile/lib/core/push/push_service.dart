// Ponte para o Web Push do navegador (ver web/index.html → window.cortixPush).
//
// A implementação real usa dart:js_interop e só existe no web; no build nativo
// entra o stub, que responde "unsupported" — assim o app compila em qualquer
// plataforma e a UI simplesmente esconde o botão fora do web.
export 'push_stub.dart' if (dart.library.js_interop) 'push_web.dart';
