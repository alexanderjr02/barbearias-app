import 'package:dio/dio.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Base URL for the Cortix API v1. Override at build/run time with
/// `--dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1` (Android emulator)
/// or your machine's LAN IP for a physical device. Defaults to localhost,
/// which works when running as Flutter Web against a local `npm run dev`.
const String _defaultBaseUrl = 'http://localhost:3000/api/v1';
const String apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

/// Origin of the API (no `/api/v1` suffix), used to resolve relative asset
/// URLs returned by the backend (e.g. `/uploads/xxx.jpg` avatars).
final String apiOrigin = apiBaseUrl.replaceFirst(RegExp(r'/api/v1/?$'), '');

/// Resolves a possibly-relative asset path (as returned by /upload or stored
/// avatar fields) into an absolute URL the Flutter Image widgets can load.
String? resolveAssetUrl(String? path) {
  if (path == null || path.isEmpty) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return '$apiOrigin$path';
}

/// Thin Dio wrapper: attaches the stored access token to every request and
/// transparently refreshes it once on a 401 before giving up.
class ApiClient {
  ApiClient._() {
    _dio = Dio(BaseOptions(baseUrl: apiBaseUrl, connectTimeout: const Duration(seconds: 10)));
    _dio.interceptors.add(InterceptorsWrapper(onRequest: _onRequest, onError: _onError));
  }

  static final ApiClient instance = ApiClient._();
  late final Dio _dio;
  bool _isRefreshing = false;

  Future<void> _onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await TokenStorage.instance.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _onError(DioException error, ErrorInterceptorHandler handler) async {
    final response = error.response;
    if (response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshed = await _tryRefresh();
        if (refreshed) {
          final retryResponse = await _dio.fetch(error.requestOptions);
          _isRefreshing = false;
          return handler.resolve(retryResponse);
        }
      } catch (_) {
        // fall through to clearing session below
      }
      _isRefreshing = false;
      await TokenStorage.instance.clear();
    }
    handler.next(error);
  }

  Future<bool> _tryRefresh() async {
    final refreshToken = await TokenStorage.instance.refreshToken;
    if (refreshToken == null) return false;

    final response = await Dio(BaseOptions(baseUrl: apiBaseUrl)).post(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
    );
    final data = response.data['data'];
    if (data == null) return false;

    await TokenStorage.instance.save(accessToken: data['accessToken'], refreshToken: data['refreshToken']);
    return true;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) => _unwrap(_dio.get(path, queryParameters: query));

  Future<dynamic> post(String path, {Object? data}) => _unwrap(_dio.post(path, data: data));

  Future<dynamic> patch(String path, {Object? data}) => _unwrap(_dio.patch(path, data: data));

  Future<dynamic> delete(String path) => _unwrap(_dio.delete(path));

  Future<dynamic> _unwrap(Future<Response> request) async {
    try {
      final response = await request;
      return response.data['data'];
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map && body['error'] != null ? body['error'] as String : 'Erro de conexão';
      throw ApiException(message, statusCode: e.response?.statusCode);
    }
  }
}
