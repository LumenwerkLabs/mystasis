import 'dart:async';
import 'dart:io' show SocketException;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
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
///
/// On web, enables `withCredentials` so the browser automatically:
/// - Sends HttpOnly cookies with requests (for authentication)
/// - Accepts Set-Cookie headers from the server
class DioHttpClientWrapper implements HttpClientWrapper {
  final Dio _dio;

  DioHttpClientWrapper({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 30),
              validateStatus: (_) => true, // Handle all status codes manually
              // Enable credentials for web (sends cookies with cross-origin requests)
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

/// HTTP client for making API requests with automatic auth header injection
class ApiClient {
  final String baseUrl;
  final HttpClientWrapper _httpClient;
  final StorageService _storageService;

  ApiClient({
    required this.baseUrl,
    HttpClientWrapper? httpClient,
    StorageService? storageService,
  })  : _httpClient = httpClient ?? DioHttpClientWrapper(),
        _storageService = storageService ?? StorageService();

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

  /// Make a GET request
  Future<dynamic> get(String endpoint) async {
    final headers = await _buildHeaders();
    return _executeRequest(
      () => _httpClient.get(Uri.parse('$baseUrl$endpoint'), headers: headers),
    );
  }

  /// Make a POST request
  Future<dynamic> post(String endpoint, {Map<String, dynamic>? body}) async {
    final headers = await _buildHeaders();
    return _executeRequest(
      () => _httpClient.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: body,
      ),
    );
  }

  /// Make a PUT request
  Future<dynamic> put(String endpoint, {Map<String, dynamic>? body}) async {
    final headers = await _buildHeaders();
    return _executeRequest(
      () => _httpClient.put(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: body,
      ),
    );
  }

  /// Make a DELETE request
  Future<dynamic> delete(String endpoint) async {
    final headers = await _buildHeaders();
    return _executeRequest(
      () => _httpClient.delete(Uri.parse('$baseUrl$endpoint'), headers: headers),
    );
  }

  /// Build headers with optional auth token.
  ///
  /// Platform-specific behavior:
  /// - **Mobile**: Adds Authorization header with Bearer token from secure storage
  /// - **Web**: Skips Authorization header (auth via HttpOnly cookies set by server)
  Future<Map<String, String>> _buildHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };

    // On web, authentication is handled via HttpOnly cookies (automatically
    // sent by browser). On mobile, we need to add the Authorization header.
    if (!kIsWeb) {
      final token = await _storageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  /// Handle API response and convert to appropriate exception if error
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
