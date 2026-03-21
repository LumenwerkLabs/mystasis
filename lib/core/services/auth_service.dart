import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';
import 'package:mystasis/core/constants/api_endpoints.dart';

/// Exception for authentication errors with error codes for mapping
class AuthException implements Exception {
  final String code;
  final String message;

  const AuthException({required this.code, required this.message});

  @override
  String toString() => 'AuthException: $code - $message';
}

/// Service for handling authentication with the backend API.
///
/// This service manages user authentication including:
/// - User registration (signUp)
/// - User login (signIn)
/// - Session management (checkAuthState, signOut)
/// - Auth state broadcasting via Stream
///
/// ## Platform-Specific Security
///
/// **Mobile (iOS/Android):**
/// - Tokens stored via [StorageService] using flutter_secure_storage
/// - iOS: Keychain (hardware-backed encryption)
/// - Android: EncryptedSharedPreferences (AES-256)
/// - Token sent via Authorization header
///
/// **Web:**
/// - Tokens stored in HttpOnly cookies (set by server)
/// - Cookies are inaccessible to JavaScript (XSS protection)
/// - Browser automatically sends cookies with requests
/// - Logout calls server endpoint to clear cookie
///
/// ## Token Lifecycle
///
/// - Access tokens are short-lived (15m) and refreshed transparently
///   by [ApiClient]'s interceptor when they expire.
/// - Refresh tokens are long-lived (7d) and rotated on each use.
/// - On logout, both tokens are invalidated server-side.
class AuthService {
  late final ApiClient _apiClient;
  final StorageService _storageService;

  final StreamController<UserModel?> _authStateController =
      StreamController<UserModel?>.broadcast();

  UserModel? _currentUser;

  AuthService({
    ApiClient? apiClient,
    StorageService? storageService,
  }) : _storageService = storageService ?? StorageService() {
    // Ensure ApiClient uses the same StorageService instance
    _apiClient = apiClient ??
        ApiClient(
          baseUrl: ApiEndpoints.baseUrl,
          storageService: _storageService,
        );
  }

  /// Stream of authentication state changes
  Stream<UserModel?> get authStateChanges => _authStateController.stream;

  /// Get the currently authenticated user
  UserModel? get currentUser => _currentUser;

  /// Sign up a new user
  Future<UserModel> signUp({
    required String email,
    required String password,
    required DateTime birthdate,
    String? firstName,
    String? lastName,
  }) async {
    try {
      final body = <String, dynamic>{
        'email': email,
        'password': password,
        'birthdate': birthdate.toIso8601String().split('T')[0],
      };

      if (firstName != null) {
        body['firstName'] = firstName;
      }
      if (lastName != null) {
        body['lastName'] = lastName;
      }

      final response = await _apiClient.post(
        ApiEndpoints.register,
        body: body,
      );

      final token = _extractToken(response);
      final refreshToken = _extractRefreshToken(response);
      final userData = _extractUserData(response);

      await _storageService.saveToken(token);
      await _storageService.saveRefreshToken(refreshToken);

      final user = UserModel.fromJson(userData);
      await _storageService.saveUserId(user.id);

      _currentUser = user;
      _emitAuthState(user);

      return user;
    } on ConflictException {
      throw const AuthException(
        code: 'email-already-in-use',
        message: 'An account already exists with this email.',
      );
    } on BadRequestException catch (e) {
      throw AuthException(
        code: 'validation-error',
        message: e.message,
      );
    } on NetworkException catch (e) {
      throw AuthException(
        code: 'network-error',
        message: e.message,
      );
    } on ServerException catch (e) {
      throw AuthException(
        code: 'server-error',
        message: e.message,
      );
    } on AuthException {
      rethrow;
    } catch (e) {
      // Log detailed error internally for debugging (in production, use proper logging)
      assert(() {
        // ignore: avoid_print
        print('AuthService.signUp error: $e');
        return true;
      }());
      throw const AuthException(
        code: 'unknown-error',
        message: 'An unexpected error occurred. Please try again.',
      );
    }
  }

  /// Sign in an existing user
  Future<UserModel> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.login,
        body: {
          'email': email,
          'password': password,
        },
      );

      final token = _extractToken(response);
      final refreshToken = _extractRefreshToken(response);
      final userData = _extractUserData(response);

      await _storageService.saveToken(token);
      await _storageService.saveRefreshToken(refreshToken);

      final user = UserModel.fromJson(userData);
      await _storageService.saveUserId(user.id);

      _currentUser = user;
      _emitAuthState(user);

      return user;
    } on UnauthorizedException {
      throw const AuthException(
        code: 'invalid-credential',
        message: 'Invalid email or password.',
      );
    } on BadRequestException catch (e) {
      throw AuthException(
        code: 'validation-error',
        message: e.message,
      );
    } on NetworkException catch (e) {
      throw AuthException(
        code: 'network-error',
        message: e.message,
      );
    } on ServerException catch (e) {
      throw AuthException(
        code: 'server-error',
        message: e.message,
      );
    } on AuthException {
      rethrow;
    } catch (e) {
      throw const AuthException(
        code: 'unknown-error',
        message: 'An unexpected error occurred. Please try again.',
      );
    }
  }

  /// Verify a user's password without creating a session.
  /// Returns true if the credentials are valid, false otherwise.
  /// Unlike [signIn], this does not save tokens or update auth state.
  Future<bool> verifyPassword({
    required String email,
    required String password,
  }) async {
    try {
      await _apiClient.post(
        ApiEndpoints.login,
        body: {
          'email': email,
          'password': password,
        },
      );
      // Credentials valid — discard the response (no token saving, no state change)
      return true;
    } on UnauthorizedException {
      return false;
    } on BadRequestException {
      return false;
    } catch (e) {
      // Re-throw network/server errors so the caller can handle them
      rethrow;
    }
  }

  /// Sign out the current user.
  ///
  /// Calls the server logout endpoint to invalidate the session,
  /// then clears local storage. Server call is best-effort — local
  /// logout always proceeds even if the server request fails.
  Future<void> signOut() async {
    try {
      final refreshToken = await _storageService.getRefreshToken();
      await _apiClient.post(
        ApiEndpoints.logout,
        body: refreshToken != null
            ? {'refresh_token': refreshToken}
            : null,
        skipRefresh: true,
      );
    } catch (_) {
      // Best effort — local logout still proceeds
    }
    await _storageService.clearSession();
    _currentUser = null;
    _emitAuthState(null);
  }

  /// Force logout without server call — used by the API interceptor
  /// when token refresh fails (session is irrecoverable).
  Future<void> forceLogout() async {
    await _storageService.clearSession();
    _currentUser = null;
    _emitAuthState(null);
  }

  /// Check authentication state on app launch.
  ///
  /// Platform-specific behavior:
  /// - **Mobile**: Checks if token exists in storage, then validates with backend
  /// - **Web**: Always calls /auth/me (browser sends HttpOnly cookie automatically)
  ///
  /// Validates stored token/cookie with the backend to ensure it's still valid.
  Future<void> checkAuthState() async {
    // On mobile, check if we have a stored token first
    if (!kIsWeb) {
      final token = await _storageService.getToken();
      if (token == null || token.isEmpty) {
        _emitAuthState(null);
        return;
      }
    }

    // On web, always try to call /auth/me - the browser will send the cookie
    // if one exists. If no cookie, we'll get a 401.
    try {
      final userData = await _apiClient.get(ApiEndpoints.me);
      final user = UserModel.fromJson(userData as Map<String, dynamic>);

      _currentUser = user;
      _emitAuthState(user);
    } on UnauthorizedException {
      // Token/cookie is invalid or expired, clear session data
      await _storageService.clearSession();
      _currentUser = null;
      _emitAuthState(null);
    } on NetworkException {
      // Network error - don't clear token, just notify with null
      // The user might be offline but have a valid token/cookie
      _emitAuthState(null);
    } catch (e) {
      // Other errors - emit null but don't clear token
      _emitAuthState(null);
    }
  }

  /// Extract access token from response with null check
  String _extractToken(dynamic response) {
    if (response is! Map<String, dynamic>) {
      throw const AuthException(
        code: 'invalid-response',
        message: 'Invalid response format from server.',
      );
    }
    final token = response['access_token'];
    if (token == null || token is! String || token.isEmpty) {
      throw const AuthException(
        code: 'invalid-response',
        message: 'Missing or invalid access token in response.',
      );
    }
    return token;
  }

  /// Extract refresh token from response
  String _extractRefreshToken(dynamic response) {
    if (response is! Map<String, dynamic>) {
      throw const AuthException(
        code: 'invalid-response',
        message: 'Invalid response format from server.',
      );
    }
    final token = response['refresh_token'];
    if (token == null || token is! String || token.isEmpty) {
      throw const AuthException(
        code: 'invalid-response',
        message: 'Missing or invalid refresh token in response.',
      );
    }
    return token;
  }

  /// Extract user data from response with null check
  Map<String, dynamic> _extractUserData(dynamic response) {
    if (response is! Map<String, dynamic>) {
      throw const AuthException(
        code: 'invalid-response',
        message: 'Invalid response format from server.',
      );
    }
    final userData = response['user'];
    if (userData == null || userData is! Map<String, dynamic>) {
      throw const AuthException(
        code: 'invalid-response',
        message: 'Missing or invalid user data in response.',
      );
    }
    return userData;
  }

  /// Safely emit auth state, checking if stream is closed
  void _emitAuthState(UserModel? user) {
    if (!_authStateController.isClosed) {
      _authStateController.add(user);
    }
  }

  /// Clean up resources
  void dispose() {
    _authStateController.close();
  }
}
