import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Wraps the access/refresh token pair issued by POST /api/v1/auth/login
/// (see docs/api-v1.md in the main repo).
///
/// flutter_secure_storage's web implementation needs a secure browsing
/// context (HTTPS or localhost) — it throws on a plain http LAN address,
/// which is how this app gets tested on a phone before native builds exist.
/// Native platforms (the real publish target) keep real secure storage; web
/// falls back to SharedPreferences.
///
/// Every request in ApiClient reads the access token, so the underlying
/// store is hit constantly. On web that store has also shown itself to be
/// occasionally slow/unreliable in practice, and a failure there must never
/// take down an unrelated API call. So reads are served from an in-memory
/// cache after the first successful (or failed) hydration — the persistent
/// store is only touched once per app session, plus on explicit save/clear.
class TokenStorage {
  TokenStorage._();
  static final TokenStorage instance = TokenStorage._();

  final _secureStorage = const FlutterSecureStorage();

  static const _accessKey = 'cortix_access_token';
  static const _refreshKey = 'cortix_refresh_token';

  bool _hydrated = false;
  String? _cachedAccess;
  String? _cachedRefresh;
  Future<void>? _hydration;

  Future<void> _ensureHydrated() {
    if (_hydrated) return Future.value();
    return _hydration ??= _hydrate();
  }

  Future<void> _hydrate() async {
    try {
      if (kIsWeb) {
        final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
        _cachedAccess = prefs.getString(_accessKey);
        _cachedRefresh = prefs.getString(_refreshKey);
      } else {
        _cachedAccess = await _secureStorage.read(key: _accessKey);
        _cachedRefresh = await _secureStorage.read(key: _refreshKey);
      }
    } catch (_) {
      _cachedAccess = null;
      _cachedRefresh = null;
    } finally {
      _hydrated = true;
    }
  }

  Future<void> save({required String accessToken, required String refreshToken}) async {
    _cachedAccess = accessToken;
    _cachedRefresh = refreshToken;
    _hydrated = true;
    try {
      if (kIsWeb) {
        final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
        await prefs.setString(_accessKey, accessToken);
        await prefs.setString(_refreshKey, refreshToken);
      } else {
        await _secureStorage.write(key: _accessKey, value: accessToken);
        await _secureStorage.write(key: _refreshKey, value: refreshToken);
      }
    } catch (_) {
      // Session still works for the rest of this app run from the in-memory
      // cache above; only persistence across a reload is lost.
    }
  }

  Future<String?> get accessToken async {
    await _ensureHydrated();
    return _cachedAccess;
  }

  Future<String?> get refreshToken async {
    await _ensureHydrated();
    return _cachedRefresh;
  }

  Future<void> clear() async {
    _cachedAccess = null;
    _cachedRefresh = null;
    _hydrated = true;
    try {
      if (kIsWeb) {
        final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
        await prefs.remove(_accessKey);
        await prefs.remove(_refreshKey);
      } else {
        await _secureStorage.delete(key: _accessKey);
        await _secureStorage.delete(key: _refreshKey);
      }
    } catch (_) {
      // in-memory state above is already cleared, which is what matters live
    }
  }
}
