import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// Import the service that will be implemented
// This import will fail until StorageService is created
import 'package:mystasis/core/services/storage_service.dart';

/// Mock for flutter_secure_storage or similar secure storage implementation
class MockSecureStorage extends Mock implements SecureStorageWrapper {}

void main() {
  group('StorageService', () {
    late StorageService storageService;
    late MockSecureStorage mockSecureStorage;

    setUp(() {
      mockSecureStorage = MockSecureStorage();
      storageService = StorageService(secureStorage: mockSecureStorage);
    });

    group('saveToken', () {
      test('should store token successfully', () async {
        // Arrange
        const token = 'test_jwt_token_12345';
        when(() => mockSecureStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenAnswer((_) async {});

        // Act
        await storageService.saveToken(token);

        // Assert
        verify(() => mockSecureStorage.write(
              key: 'auth_token',
              value: token,
            )).called(1);
      });

      test('should overwrite existing token when saving new token', () async {
        // Arrange
        const newToken = 'new_jwt_token_67890';
        when(() => mockSecureStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenAnswer((_) async {});

        // Act
        await storageService.saveToken(newToken);

        // Assert
        verify(() => mockSecureStorage.write(
              key: 'auth_token',
              value: newToken,
            )).called(1);
      });

      test('should throw StorageException when storage write fails', () async {
        // Arrange
        const token = 'test_token';
        when(() => mockSecureStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenThrow(Exception('Storage write failed'));

        // Act & Assert
        expect(
          () => storageService.saveToken(token),
          throwsA(isA<StorageException>()),
        );
      });
    });

    group('getToken', () {
      test('should retrieve stored token successfully', () async {
        // Arrange
        const storedToken = 'stored_jwt_token';
        when(() => mockSecureStorage.read(key: any(named: 'key')))
            .thenAnswer((_) async => storedToken);

        // Act
        final result = await storageService.getToken();

        // Assert
        expect(result, equals(storedToken));
        verify(() => mockSecureStorage.read(key: 'auth_token')).called(1);
      });

      test('should return null when no token is stored', () async {
        // Arrange
        when(() => mockSecureStorage.read(key: any(named: 'key')))
            .thenAnswer((_) async => null);

        // Act
        final result = await storageService.getToken();

        // Assert
        expect(result, isNull);
      });

      test('should return null when storage read fails', () async {
        // Arrange
        when(() => mockSecureStorage.read(key: any(named: 'key')))
            .thenThrow(Exception('Storage read failed'));

        // Act
        final result = await storageService.getToken();

        // Assert
        expect(result, isNull);
      });
    });

    group('deleteToken', () {
      test('should remove token successfully', () async {
        // Arrange
        when(() => mockSecureStorage.delete(key: any(named: 'key')))
            .thenAnswer((_) async {});

        // Act
        await storageService.deleteToken();

        // Assert
        verify(() => mockSecureStorage.delete(key: 'auth_token')).called(1);
      });

      test('should not throw when deleting non-existent token', () async {
        // Arrange
        when(() => mockSecureStorage.delete(key: any(named: 'key')))
            .thenAnswer((_) async {});

        // Act & Assert
        expect(() => storageService.deleteToken(), returnsNormally);
      });

      test('should throw StorageException when delete fails', () async {
        // Arrange
        when(() => mockSecureStorage.delete(key: any(named: 'key')))
            .thenThrow(Exception('Storage delete failed'));

        // Act & Assert
        expect(
          () => storageService.deleteToken(),
          throwsA(isA<StorageException>()),
        );
      });
    });

    group('hasToken', () {
      test('should return true when token exists', () async {
        // Arrange
        when(() => mockSecureStorage.read(key: any(named: 'key')))
            .thenAnswer((_) async => 'existing_token');

        // Act
        final result = await storageService.hasToken();

        // Assert
        expect(result, isTrue);
      });

      test('should return false when no token exists', () async {
        // Arrange
        when(() => mockSecureStorage.read(key: any(named: 'key')))
            .thenAnswer((_) async => null);

        // Act
        final result = await storageService.hasToken();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when token is empty string', () async {
        // Arrange
        when(() => mockSecureStorage.read(key: any(named: 'key')))
            .thenAnswer((_) async => '');

        // Act
        final result = await storageService.hasToken();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when storage read fails', () async {
        // Arrange
        when(() => mockSecureStorage.read(key: any(named: 'key')))
            .thenThrow(Exception('Storage error'));

        // Act
        final result = await storageService.hasToken();

        // Assert
        expect(result, isFalse);
      });
    });

    group('saveUserId', () {
      test('should store user ID successfully', () async {
        // Arrange
        const userId = 'user_123';
        when(() => mockSecureStorage.write(
              key: any(named: 'key'),
              value: any(named: 'value'),
            )).thenAnswer((_) async {});

        // Act
        await storageService.saveUserId(userId);

        // Assert
        verify(() => mockSecureStorage.write(
              key: 'user_id',
              value: userId,
            )).called(1);
      });
    });

    group('getUserId', () {
      test('should retrieve stored user ID', () async {
        // Arrange
        const userId = 'user_123';
        when(() => mockSecureStorage.read(key: 'user_id'))
            .thenAnswer((_) async => userId);

        // Act
        final result = await storageService.getUserId();

        // Assert
        expect(result, equals(userId));
      });

      test('should return null when no user ID is stored', () async {
        // Arrange
        when(() => mockSecureStorage.read(key: 'user_id'))
            .thenAnswer((_) async => null);

        // Act
        final result = await storageService.getUserId();

        // Assert
        expect(result, isNull);
      });
    });

    group('clearAll', () {
      test('should clear all stored data', () async {
        // Arrange
        when(() => mockSecureStorage.deleteAll()).thenAnswer((_) async {});

        // Act
        await storageService.clearAll();

        // Assert
        verify(() => mockSecureStorage.deleteAll()).called(1);
      });
    });
  });
}
