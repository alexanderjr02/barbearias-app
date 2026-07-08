/// Thrown when the API responds with `{ data: null, error: "..." }` (see
/// docs/api-v1.md in the main repo for the envelope shape).
class ApiException implements Exception {
  final int? statusCode;
  final String message;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}
