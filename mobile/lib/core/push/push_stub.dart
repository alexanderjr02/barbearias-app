// Stub para plataformas sem navegador (build nativo). Push web não existe aqui.
// Quando houver push nativo (APNs/FCM), é este arquivo que ganha uma
// implementação de verdade — a UI não muda.

String pushStatus() => 'unsupported';

Future<String> pushEnable(String token, String apiBase) async => 'unsupported';

Future<String> pushDisable(String token, String apiBase) async => 'unsupported';
