import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Exception thrown when storage operations fail
class StorageException implements Exception {
  final String message;
  const StorageException(this.message);

  @override
  String toString() => 'StorageException: $message';
}

/// Abstract interface for secure storage operations
/// Allows for easy mocking in tests
abstract class SecureStorageWrapper {
  Future<void> write({required String key, required String? value});
  Future<String?> read({required String key});
  Future<void> delete({required String key});
  Future<void> deleteAll();
}

/// Default implementation using flutter_secure_storage (for mobile platforms)
class FlutterSecureStorageWrapper implements SecureStorageWrapper {
  final FlutterSecureStorage _storage;

  FlutterSecureStorageWrapper({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<void> write({required String key, required String? value}) async {
    await _storage.write(key: key, value: value);
  }

  @override
  Future<String?> read({required String key}) async {
    return await _storage.read(key: key);
  }

  @override
  Future<void> delete({required String key}) async {
    await _storage.delete(key: key);
  }

  @override
  Future<void> deleteAll() async {
    await _storage.deleteAll();
  }
}

/// Memory-only storage implementation for web platform.
///
/// On web, authentication is handled via HttpOnly cookies which are:
/// - Set by the server on login/register
/// - Automatically sent with requests by the browser
/// - Inaccessible to JavaScript (XSS protection)
///
/// This storage wrapper:
/// - Does NOT store tokens (they're in HttpOnly cookies)
/// - Stores user metadata (userId) in memory only
/// - Session is lost on page refresh (but cookie remains valid)
///
/// For persistent user data on web, the app re-validates the session
/// via the /auth/me endpoint on startup using the cookie.
class WebMemoryStorageWrapper implements SecureStorageWrapper {
  final Map<String, String> _storage = {};

  @override
  Future<void> write({required String key, required String? value}) async {
    if (value != null) {
      _storage[key] = value;
    } else {
      _storage.remove(key);
    }
  }

  @override
  Future<String?> read({required String key}) async {
    return _storage[key];
  }

  @override
  Future<void> delete({required String key}) async {
    _storage.remove(key);
  }

  @override
  Future<void> deleteAll() async {
    _storage.clear();
  }
}

/// Factory function to create the appropriate storage wrapper for the platform.
/// - Mobile: Uses flutter_secure_storage (Keychain/EncryptedSharedPreferences)
/// - Web: Uses memory-only storage (auth via HttpOnly cookies)
SecureStorageWrapper createPlatformStorageWrapper() {
  if (kIsWeb) {
    return WebMemoryStorageWrapper();
  }
  return FlutterSecureStorageWrapper();
}

/// Service for securely storing authentication tokens and user data.
///
/// Platform-specific behavior:
/// - **Mobile**: Uses flutter_secure_storage (Keychain on iOS, EncryptedSharedPreferences on Android)
/// - **Web**: Uses memory-only storage (auth is handled via HttpOnly cookies set by server)
///
/// On web, the token is NOT stored client-side. Instead:
/// 1. Server sets HttpOnly cookie on login/register
/// 2. Browser automatically sends cookie with requests
/// 3. Token is inaccessible to JavaScript (XSS protection)
class StorageService {
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _lastHealthSyncKey = 'last_health_sync';
  static const String _biometricEnabledPrefix = 'biometric_enabled_';
  static const String _biometricPromptShownPrefix = 'biometric_prompt_shown_';

  final SecureStorageWrapper _secureStorage;

  StorageService({SecureStorageWrapper? secureStorage})
      : _secureStorage = secureStorage ?? createPlatformStorageWrapper();

  /// Save the authentication token
  Future<void> saveToken(String token) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
    } catch (e) {
      throw StorageException('Failed to save token: $e');
    }
  }

  /// Retrieve the stored authentication token
  /// Returns null if no token is stored or if read fails
  Future<String?> getToken() async {
    try {
      return await _secureStorage.read(key: _tokenKey);
    } catch (e) {
      return null;
    }
  }

  /// Save the refresh token
  Future<void> saveRefreshToken(String token) async {
    try {
      await _secureStorage.write(key: _refreshTokenKey, value: token);
    } catch (e) {
      throw StorageException('Failed to save refresh token: $e');
    }
  }

  /// Retrieve the stored refresh token
  Future<String?> getRefreshToken() async {
    try {
      return await _secureStorage.read(key: _refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  /// Delete the stored authentication token
  Future<void> deleteToken() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
    } catch (e) {
      throw StorageException('Failed to delete token: $e');
    }
  }

  /// Check if a valid token exists
  Future<bool> hasToken() async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);
      return token != null && token.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  /// Save the user ID
  Future<void> saveUserId(String userId) async {
    try {
      await _secureStorage.write(key: _userIdKey, value: userId);
    } catch (e) {
      throw StorageException('Failed to save user ID: $e');
    }
  }

  /// Retrieve the stored user ID
  Future<String?> getUserId() async {
    try {
      return await _secureStorage.read(key: _userIdKey);
    } catch (e) {
      return null;
    }
  }

  /// Save the last successful health sync timestamp
  Future<void> saveLastHealthSync(DateTime timestamp) async {
    try {
      await _secureStorage.write(
        key: _lastHealthSyncKey,
        value: timestamp.toIso8601String(),
      );
    } catch (e) {
      throw StorageException('Failed to save last health sync: $e');
    }
  }

  /// Retrieve the last successful health sync timestamp
  Future<DateTime?> getLastHealthSync() async {
    try {
      final value = await _secureStorage.read(key: _lastHealthSyncKey);
      if (value == null || value.isEmpty) return null;
      return DateTime.parse(value);
    } catch (e) {
      return null;
    }
  }

  /// Save biometric enrollment status, scoped to a specific user.
  Future<void> setBiometricEnabled(bool enabled, {required String userId}) async {
    try {
      await _secureStorage.write(
        key: '$_biometricEnabledPrefix$userId',
        value: enabled ? 'true' : 'false',
      );
    } catch (e) {
      throw StorageException('Failed to save biometric setting: $e');
    }
  }

  /// Check if biometric sign-in is enabled for a specific user.
  Future<bool> isBiometricEnabled({required String userId}) async {
    try {
      final value = await _secureStorage.read(
        key: '$_biometricEnabledPrefix$userId',
      );
      return value == 'true';
    } catch (e) {
      return false;
    }
  }

  /// Check if the biometric enrollment prompt has been shown for a specific user.
  Future<bool> isBiometricPromptShown({required String userId}) async {
    try {
      final value = await _secureStorage.read(
        key: '$_biometricPromptShownPrefix$userId',
      );
      return value == 'true';
    } catch (e) {
      return false;
    }
  }

  /// Mark the biometric enrollment prompt as shown for a specific user.
  Future<void> setBiometricPromptShown({required String userId}) async {
    try {
      await _secureStorage.write(
        key: '$_biometricPromptShownPrefix$userId',
        value: 'true',
      );
    } catch (e) {
      throw StorageException('Failed to save biometric prompt state: $e');
    }
  }

  /// Clear session data (tokens, user ID) while preserving user-scoped
  /// preferences like biometric enrollment. Used by signOut/forceLogout.
  Future<void> clearSession() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
      await _secureStorage.delete(key: _refreshTokenKey);
      await _secureStorage.delete(key: _userIdKey);
      await _secureStorage.delete(key: _lastHealthSyncKey);
    } catch (e) {
      throw StorageException('Failed to clear session: $e');
    }
  }

  /// Clear biometric data for a specific user (used on account deletion).
  Future<void> clearBiometricData({required String userId}) async {
    try {
      await _secureStorage.delete(key: '$_biometricEnabledPrefix$userId');
      await _secureStorage.delete(key: '$_biometricPromptShownPrefix$userId');
    } catch (e) {
      throw StorageException('Failed to clear biometric data: $e');
    }
  }

  /// Clear all stored data. Only used for full data wipe (e.g., account deletion).
  Future<void> clearAll() async {
    try {
      await _secureStorage.deleteAll();
    } catch (e) {
      throw StorageException('Failed to clear storage: $e');
    }
  }
}
