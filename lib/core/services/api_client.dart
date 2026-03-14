import 'dart:async';
import 'dart:io' show SocketException;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Base exception for all API errors
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}

/// Exception for 401 Unauthorized responses
class UnauthorizedException extends ApiException {
  const UnauthorizedException(super.message) : super(statusCode: 401);
}

/// Exception for 400 Bad Request responses
class BadRequestException extends ApiException {
  const BadRequestException(super.message) : super(statusCode: 400);
}

/// Exception for 403 Forbidden responses
class ForbiddenException extends ApiException {
  const ForbiddenException(super.message) : super(statusCode: 403);
}

/// Exception for 409 Conflict responses (e.g., duplicate email)
class ConflictException extends ApiException {
  const ConflictException(super.message) : super(statusCode: 409);
}

/// Exception for 5xx Server Error responses
class ServerException extends ApiException {
  const ServerException(super.message) : super(statusCode: 500);
}

/// Exception for network connectivity issues
class NetworkException extends ApiException {
  const NetworkException(super.message) : super(statusCode: null);
}

/// HTTP response wrapper for testing
class HttpResponse {
  final int statusCode;
  final dynamic body;

  const HttpResponse({required this.statusCode, this.body});
}

/// Abstract interface for HTTP operations
/// Allows for easy mocking in tests
abstract class HttpClientWrapper {
  Future<HttpResponse> get(Uri url, {Map<String, String>? headers});
  Future<HttpResponse> post(Uri url,
      {Map<String, String>? headers, Map<String, dynamic>? body});
  Future<HttpResponse> put(Uri url,
      {Map<String, String>? headers, Map<String, dynamic>? body});
  Future<HttpResponse> delete(Uri url, {Map<String, String>? headers});
}

/// Default implementation using Dio (supports web, mobile, and desktop)
class DioHttpClientWrapper implements HttpClientWrapper {
  final Dio _dio;

  DioHttpClientWrapper({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 30),
              validateStatus: (_) => true, // Handle all status codes manually
              extra: kIsWeb ? {'withCredentials': true} : null,
            ));

  @override
  Future<HttpResponse> get(Uri url, {Map<String, String>? headers}) async {
    final response = await _dio.getUri(
      url,
      options: Options(headers: headers),
    );
    return HttpResponse(
      statusCode: response.statusCode ?? 0,
      body: response.data,
    );
  }

  @override
  Future<HttpResponse> post(Uri url,
      {Map<String, String>? headers, Map<String, dynamic>? body}) async {
    final response = await _dio.postUri(
      url,
      data: body,
      options: Options(headers: headers),
    );
    return HttpResponse(
      statusCode: response.statusCode ?? 0,
      body: response.data,
    );
  }

  @override
  Future<HttpResponse> put(Uri url,
      {Map<String, String>? headers, Map<String, dynamic>? body}) async {
    final response = await _dio.putUri(
      url,
      data: body,
      options: Options(headers: headers),
    );
    return HttpResponse(
      statusCode: response.statusCode ?? 0,
      body: response.data,
    );
  }

  @override
  Future<HttpResponse> delete(Uri url, {Map<String, String>? headers}) async {
    final response = await _dio.deleteUri(
      url,
      options: Options(headers: headers),
    );
    return HttpResponse(
      statusCode: response.statusCode ?? 0,
      body: response.data,
    );
  }
}

/// HTTP client with automatic token refresh on 401 responses.
///
/// When a request receives a 401:
/// 1. Attempts to refresh the access token via /auth/refresh
/// 2. On success: saves new tokens, retries the original request
/// 3. On failure: calls [onSessionExpired] to force logout
///
/// Concurrent 401s are queued — only one refresh at a time.
class ApiClient {
  final String baseUrl;
  final HttpClientWrapper _httpClient;
  final StorageService _storageService;
  void Function()? _onSessionExpired;

  bool _isRefreshing = false;
  bool _sessionExpired = false;
  final List<Completer<void>> _refreshQueue = [];

  ApiClient({
    required this.baseUrl,
    HttpClientWrapper? httpClient,
    StorageService? storageService,
  })  : _httpClient = httpClient ?? DioHttpClientWrapper(),
        _storageService = storageService ?? StorageService();

  /// Set callback invoked when session cannot be recovered (refresh fails).
  /// This should trigger a forced logout and navigation to login.
  void setSessionExpiredCallback(void Function() callback) {
    _onSessionExpired = callback;
  }

  /// Make a GET request
  Future<dynamic> get(String endpoint) async {
    return _executeWithRefresh(
      endpoint,
      (headers) =>
          _httpClient.get(Uri.parse('$baseUrl$endpoint'), headers: headers),
    );
  }

  /// Make a POST request
  Future<dynamic> post(String endpoint,
      {Map<String, dynamic>? body, bool skipRefresh = false}) async {
    if (skipRefresh) {
      return _executeRequest(
        () async {
          final headers = await _buildHeaders();
          return _httpClient.post(Uri.parse('$baseUrl$endpoint'),
              headers: headers, body: body);
        },
      );
    }
    return _executeWithRefresh(
      endpoint,
      (headers) => _httpClient.post(Uri.parse('$baseUrl$endpoint'),
          headers: headers, body: body),
    );
  }

  /// Make a PUT request
  Future<dynamic> put(String endpoint, {Map<String, dynamic>? body}) async {
    return _executeWithRefresh(
      endpoint,
      (headers) => _httpClient.put(Uri.parse('$baseUrl$endpoint'),
          headers: headers, body: body),
    );
  }

  /// Make a DELETE request
  Future<dynamic> delete(String endpoint) async {
    return _executeWithRefresh(
      endpoint,
      (headers) =>
          _httpClient.delete(Uri.parse('$baseUrl$endpoint'), headers: headers),
    );
  }

  /// Endpoints where 401 means invalid credentials, not an expired token.
  static const _noRefreshEndpoints = [
    ApiEndpoints.login,
    ApiEndpoints.register,
    ApiEndpoints.refresh,
  ];

  /// Execute a request with automatic 401 → refresh → retry handling.
  Future<dynamic> _executeWithRefresh(
    String endpoint,
    Future<HttpResponse> Function(Map<String, String> headers) makeRequest,
  ) async {
    final headers = await _buildHeaders();
    try {
      return await _executeRequest(() => makeRequest(headers));
    } on UnauthorizedException {
      // Don't attempt refresh for login/register/refresh endpoints
      if (_noRefreshEndpoints.any((e) => endpoint.startsWith(e))) {
        rethrow;
      }

      final refreshed = await tryRefreshToken();
      if (!refreshed) {
        throw const UnauthorizedException('Session expired');
      }

      // Retry with new token
      final newHeaders = await _buildHeaders();
      return await _executeRequest(() => makeRequest(newHeaders));
    }
  }

  /// Execute a request with common error handling
  Future<dynamic> _executeRequest(
    Future<HttpResponse> Function() request,
  ) async {
    try {
      final response = await request();
      return _handleResponse(response);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        throw const NetworkException('Request timed out');
      }
      if (e.type == DioExceptionType.connectionError) {
        throw const NetworkException('No internet connection');
      }
      throw NetworkException('Network error: ${e.message}');
    } on SocketException catch (e) {
      throw NetworkException('Network error: ${e.message}');
    } on TimeoutException {
      throw const NetworkException('Request timed out');
    } on FormatException catch (e) {
      throw ApiException('Invalid response format: $e');
    }
  }

  /// Build headers with auth token from storage.
  Future<Map<String, String>> _buildHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };

    final token = await _storageService.getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  /// Handle API response, with transparent token refresh on 401.
  dynamic _handleResponse(HttpResponse response) {
    final message = _extractErrorMessage(response.body);

    switch (response.statusCode) {
      case 200:
      case 201:
        return response.body;
      case 204:
        return null;
      case 400:
        throw BadRequestException(message);
      case 401:
        throw UnauthorizedException(message);
      case 403:
        throw ForbiddenException(message);
      case 409:
        throw ConflictException(message);
      case >= 500:
        throw ServerException(message);
      default:
        throw ApiException(message, statusCode: response.statusCode);
    }
  }

  /// Attempt to refresh the access token using the stored refresh token.
  /// Returns true if refresh succeeded, false if session is expired.
  Future<bool> tryRefreshToken() async {
    // If already refreshing, wait for the in-progress refresh
    if (_isRefreshing) {
      final completer = Completer<void>();
      _refreshQueue.add(completer);
      try {
        await completer.future;
        return true;
      } catch (_) {
        return false;
      }
    }

    _isRefreshing = true;

    try {
      final refreshToken = await _storageService.getRefreshToken();
      if (!kIsWeb && (refreshToken == null || refreshToken.isEmpty)) {
        _failRefresh();
        return false;
      }

      // Call refresh endpoint directly (skip the interceptor to avoid loops)
      final headers = <String, String>{'Content-Type': 'application/json'};
      final body = (refreshToken != null && refreshToken.isNotEmpty)
          ? {'refresh_token': refreshToken}
          : <String, dynamic>{};
      final response = await _httpClient.post(
        Uri.parse('$baseUrl${ApiEndpoints.refresh}'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.body as Map<String, dynamic>;
        final newAccessToken = data['access_token'] as String?;
        final newRefreshToken = data['refresh_token'] as String?;

        if (newAccessToken != null && newRefreshToken != null) {
          await _storageService.saveToken(newAccessToken);
          await _storageService.saveRefreshToken(newRefreshToken);
          _sessionExpired = false;

          // Resolve all queued requests
          for (final completer in _refreshQueue) {
            completer.complete();
          }
          _refreshQueue.clear();
          _isRefreshing = false;
          return true;
        }
      }

      _failRefresh();
      return false;
    } catch (_) {
      _failRefresh();
      return false;
    }
  }

  void _failRefresh() {
    for (final completer in _refreshQueue) {
      completer.completeError('Refresh failed');
    }
    _refreshQueue.clear();
    _isRefreshing = false;
    if (!_sessionExpired) {
      _sessionExpired = true;
      _onSessionExpired?.call();
    }
  }

  /// Extract error message from response body
  String _extractErrorMessage(dynamic body) {
    if (body is Map<String, dynamic>) {
      return body['message']?.toString() ??
          body['error']?.toString() ??
          'Unknown error';
    }
    return 'Unknown error';
  }
}
