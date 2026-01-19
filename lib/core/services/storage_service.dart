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

/// Default implementation using flutter_secure_storage
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

/// Service for securely storing authentication tokens and user data
class StorageService {
  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'user_id';

  final SecureStorageWrapper _secureStorage;

  StorageService({SecureStorageWrapper? secureStorage})
      : _secureStorage = secureStorage ?? FlutterSecureStorageWrapper();

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

  /// Clear all stored data (logout)
  Future<void> clearAll() async {
    try {
      await _secureStorage.deleteAll();
    } catch (e) {
      throw StorageException('Failed to clear storage: $e');
    }
  }
}
