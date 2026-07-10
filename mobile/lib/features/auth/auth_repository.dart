import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';
import 'session.dart';

class AuthRepository {
  Future<Session> login({required String email, required String password}) async {
    final data = await ApiClient.instance.post('/auth/login', data: {'email': email, 'password': password});
    await TokenStorage.instance.save(accessToken: data['accessToken'], refreshToken: data['refreshToken']);
    return Session.fromJson(data['user']);
  }

  /// Client self-signup — see POST /api/auth/register/client on the backend.
  /// dateOfBirth must be "YYYY-MM-DD".
  Future<Session> registerClient({
    required String name,
    required String email,
    required String password,
    required String phone,
    required String dateOfBirth,
  }) async {
    final data = await ApiClient.instance.post(
      '/auth/register/client',
      data: {'name': name, 'email': email, 'password': password, 'phone': phone, 'dateOfBirth': dateOfBirth},
    );
    await TokenStorage.instance.save(accessToken: data['accessToken'], refreshToken: data['refreshToken']);
    return Session.fromJson(data['user']);
  }

  /// Logs in (or, for a brand-new email, creates a CLIENT account) using a
  /// Google ID token obtained via GoogleAuthService.
  Future<Session> loginWithGoogle(String idToken) async {
    final data = await ApiClient.instance.post('/auth/google', data: {'idToken': idToken});
    await TokenStorage.instance.save(accessToken: data['accessToken'], refreshToken: data['refreshToken']);
    return Session.fromJson(data['user']);
  }

  Future<Session> me() async {
    final data = await ApiClient.instance.get('/me');
    return Session.fromJson(data);
  }

  Future<void> logout() async {
    try {
      final refreshToken = await TokenStorage.instance.refreshToken;
      await ApiClient.instance.post('/auth/logout', data: {'refreshToken': refreshToken});
    } catch (_) {
      // ignore network errors on logout — clearing local tokens still logs the user out
    }
    await TokenStorage.instance.clear();
  }
}
