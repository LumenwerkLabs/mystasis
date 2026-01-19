import 'dart:async';

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
/// ## Security Considerations
///
/// Tokens are stored using [StorageService] which wraps flutter_secure_storage
/// for platform-specific secure storage (Keychain on iOS, EncryptedSharedPreferences
/// on Android).
///
/// ## Future Improvements (Security Audit Findings)
///
/// - **Token Refresh**: Currently no refresh token mechanism. When access token
///   expires, users must re-authenticate. Consider adding refresh token support.
/// - **Web Platform**: On web, flutter_secure_storage falls back to localStorage
///   which is vulnerable to XSS. Consider HTTP-only cookies for web deployment.
/// - **Biometric Auth**: Consider adding local_auth for biometric re-authentication.
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
    String? firstName,
    String? lastName,
  }) async {
    try {
      final body = <String, dynamic>{
        'email': email,
        'password': password,
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
      final userData = _extractUserData(response);

      await _storageService.saveToken(token);

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
      final userData = _extractUserData(response);

      await _storageService.saveToken(token);

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
      // Log detailed error internally for debugging (in production, use proper logging)
      assert(() {
        // ignore: avoid_print
        print('AuthService.signIn error: $e');
        return true;
      }());
      throw const AuthException(
        code: 'unknown-error',
        message: 'An unexpected error occurred. Please try again.',
      );
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    await _storageService.clearAll();
    _currentUser = null;
    _emitAuthState(null);
  }

  /// Check authentication state on app launch
  /// Validates stored token with the backend
  Future<void> checkAuthState() async {
    final token = await _storageService.getToken();

    if (token == null || token.isEmpty) {
      _emitAuthState(null);
      return;
    }

    try {
      final userData = await _apiClient.get(ApiEndpoints.me);
      final user = UserModel.fromJson(userData as Map<String, dynamic>);

      _currentUser = user;
      _emitAuthState(user);
    } on UnauthorizedException {
      // Token is invalid or expired, clear all stored data
      await _storageService.clearAll();
      _currentUser = null;
      _emitAuthState(null);
    } on NetworkException {
      // Network error - don't clear token, just notify with null
      // The user might be offline but have a valid token
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
