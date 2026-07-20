// Implementação web da ponte de push: chama window.cortixPush (definido em
// web/index.html). Só é compilada no web (ver push_service.dart).
import 'dart:js_interop';

@JS('cortixPush')
external JSObject? get _bridge;

@JS('cortixPush.status')
external JSString _statusJS();

@JS('cortixPush.enable')
external JSPromise<JSString> _enableJS(JSString token, JSString apiBase);

@JS('cortixPush.disable')
external JSPromise<JSString> _disableJS(JSString token, JSString apiBase);

// Estados possíveis (mesmos que o JS devolve):
//   granted        — inscrito, vai receber push
//   denied         — usuário recusou a permissão
//   default        — ainda não decidiu
//   needs-install  — iPhone sem o app na tela de início (Apple só libera assim)
//   unsupported    — navegador sem suporte a push
//   error          — falhou no meio do caminho
String pushStatus() {
  if (_bridge == null) return 'unsupported';
  try {
    return _statusJS().toDart;
  } catch (_) {
    return 'unsupported';
  }
}

Future<String> pushEnable(String token, String apiBase) async {
  if (_bridge == null) return 'unsupported';
  try {
    final res = await _enableJS(token.toJS, apiBase.toJS).toDart;
    return res.toDart;
  } catch (_) {
    return 'error';
  }
}

Future<String> pushDisable(String token, String apiBase) async {
  if (_bridge == null) return 'unsupported';
  try {
    final res = await _disableJS(token.toJS, apiBase.toJS).toDart;
    return res.toDart;
  } catch (_) {
    return 'error';
  }
}
