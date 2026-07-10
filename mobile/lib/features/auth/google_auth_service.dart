import 'package:google_sign_in/google_sign_in.dart';

/// Thin wrapper around google_sign_in's v7 API (initialize once, then
/// authenticate()) — isolates the login screen from that API's shape so a
/// future google_sign_in major version only touches this file.
///
/// Needs real setup to actually work, none of which this code can provide:
/// - Web: a real Google OAuth Client ID passed via
///   `--dart-define=GOOGLE_CLIENT_ID=...` (same value as the backend's
///   GOOGLE_CLIENT_ID/NEXT_PUBLIC_GOOGLE_CLIENT_ID).
/// - Android: a `google-services.json` in `android/app/`, and the app's
///   release/debug SHA-1 fingerprint registered on that OAuth client.
/// - iOS: the reversed client ID URL scheme added to `Info.plist`.
/// Until that's done, [signInAndGetIdToken] surfaces a clear exception
/// rather than crashing.
class GoogleAuthService {
  GoogleAuthService._();

  static bool _initialized = false;

  static const _clientId = String.fromEnvironment('GOOGLE_CLIENT_ID');

  static Future<void> _ensureInitialized() async {
    if (_initialized) return;
    await GoogleSignIn.instance.initialize(clientId: _clientId.isEmpty ? null : _clientId);
    _initialized = true;
  }

  /// Runs the sign-in flow and returns a Google ID token ready to send to
  /// POST /auth/google. Returns null if the user cancels.
  static Future<String?> signInAndGetIdToken() async {
    await _ensureInitialized();
    final signIn = GoogleSignIn.instance;
    if (!signIn.supportsAuthenticate()) {
      throw Exception('Login com Google não é suportado nesta plataforma ainda.');
    }
    try {
      final account = await signIn.authenticate();
      return account.authentication.idToken;
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) return null;
      throw Exception('Não foi possível entrar com o Google (${e.code}).');
    }
  }
}
