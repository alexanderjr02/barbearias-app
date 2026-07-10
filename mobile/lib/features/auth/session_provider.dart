import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';
import '../profile/profile_repository.dart';
import 'auth_repository.dart';
import 'session.dart';

enum SessionStatus { unknown, authenticated, unauthenticated }

class SessionProvider extends ChangeNotifier {
  final _repository = AuthRepository();
  final _profileRepository = ProfileRepository();

  SessionStatus status = SessionStatus.unknown;
  Session? session;
  String? error;
  bool isBusy = false;

  /// The barbershop's brand color (from `primaryColor`), used to seed the
  /// app's ColorScheme once known. Null until loaded or if it fails to load —
  /// callers should fall back to the default brand color.
  Color? brandColor;

  Future<void> restore() async {
    try {
      final token = await TokenStorage.instance.accessToken.timeout(
        const Duration(seconds: 5),
        onTimeout: () => null,
      );
      if (token == null) {
        status = SessionStatus.unauthenticated;
        return;
      }
      session = await _repository.me();
      status = SessionStatus.authenticated;
      _loadBrandColor();
    } catch (_) {
      await TokenStorage.instance.clear().catchError((_) {});
      status = SessionStatus.unauthenticated;
    } finally {
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    isBusy = true;
    error = null;
    notifyListeners();
    try {
      await _repository.login(email: email, password: password);
      // The login response's user object doesn't include staffId (only /me
      // does) — fetch the full session so a freshly-logged-in barber has it
      // right away, same as a restored session does.
      session = await _repository.me();
      status = SessionStatus.authenticated;
      _loadBrandColor();
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      isBusy = false;
      notifyListeners();
    }
  }

  Future<bool> registerClient({
    required String name,
    required String email,
    required String password,
    required String phone,
    required String dateOfBirth,
  }) async {
    isBusy = true;
    error = null;
    notifyListeners();
    try {
      await _repository.registerClient(name: name, email: email, password: password, phone: phone, dateOfBirth: dateOfBirth);
      session = await _repository.me();
      status = SessionStatus.authenticated;
      _loadBrandColor();
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      isBusy = false;
      notifyListeners();
    }
  }

  Future<bool> loginWithGoogle(String idToken) async {
    isBusy = true;
    error = null;
    notifyListeners();
    try {
      await _repository.loginWithGoogle(idToken);
      session = await _repository.me();
      status = SessionStatus.authenticated;
      _loadBrandColor();
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      isBusy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    session = null;
    brandColor = null;
    status = SessionStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> updateProfile({String? name, String? phone, String? avatar}) async {
    try {
      final data = await _profileRepository.updateProfile(name: name, phone: phone, avatar: avatar);
      session = session?.copyWith(
        name: data['name'] as String?,
        phone: data['phone'] as String?,
        avatar: data['avatar'] as String?,
      );
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _loadBrandColor() async {
    try {
      final current = session;
      if (current == null) return;
      Map<String, dynamic>? data;
      if (current.isBarber || current.isManager) {
        data = await ApiClient.instance.get('/barbershop') as Map<String, dynamic>?;
      } else if (current.isClient) {
        final list = await ApiClient.instance.get('/client/barbershops') as List;
        if (list.isNotEmpty) data = list.first as Map<String, dynamic>;
      }
      final hex = data?['primaryColor'] as String?;
      final parsed = hex == null ? null : _parseHexColor(hex);
      if (parsed != null) {
        brandColor = parsed;
        notifyListeners();
      }
    } catch (_) {
      // keep the default brand color on failure
    }
  }

  Color? _parseHexColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    if (cleaned.length != 6) return null;
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return null;
    return Color(0xFF000000 | value);
  }
}
