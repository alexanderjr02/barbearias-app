import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';
import 'session.dart';

class AuthRepository {
  Future<Session> login({required String email, required String password}) async {
    final data = await ApiClient.instance.post('/auth/login', data: {'email': email, 'password': password});
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
