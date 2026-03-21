import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// Import the classes that will be implemented
// These imports will fail until the classes are created/updated
import 'package:mystasis/core/services/auth_service.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';
import 'package:mystasis/core/models/user_model.dart';

/// Mock for ApiClient
class MockApiClient extends Mock implements ApiClient {}

/// Mock for StorageService
class MockStorageService extends Mock implements StorageService {}

void main() {
  group('AuthService', () {
    late AuthService authService;
    late MockApiClient mockApiClient;
    late MockStorageService mockStorageService;

    setUp(() {
      mockApiClient = MockApiClient();
      mockStorageService = MockStorageService();

      // Default stubs for refresh token storage (used by all auth flows)
      when(() => mockStorageService.saveRefreshToken(any()))
          .thenAnswer((_) async {});
      when(() => mockStorageService.getRefreshToken())
          .thenAnswer((_) async => null);

      authService = AuthService(
        apiClient: mockApiClient,
        storageService: mockStorageService,
      );
    });

    tearDown(() {
      authService.dispose();
    });

    group('signUp', () {
      test('should call POST /auth/register with correct body', () async {
        // Arrange
        const email = 'test@example.com';
        const password = 'password123';
        const firstName = 'John';
        const lastName = 'Doe';
        final birthdate = DateTime(1990, 1, 15);

        final responseData = {
          'access_token': 'new_jwt_token',
          'refresh_token': 'new_refresh_token',
          'user': {
            'id': 'user_123',
            'email': email,
            'firstName': firstName,
            'lastName': lastName,
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post('/auth/register', body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        await authService.signUp(
          email: email,
          password: password,
          birthdate: birthdate,
          firstName: firstName,
          lastName: lastName,
        );

        // Assert
        verify(
          () => mockApiClient.post(
            '/auth/register',
            body: {
              'email': email,
              'password': password,
              'birthdate': '1990-01-15',
              'firstName': firstName,
              'lastName': lastName,
            },
          ),
        ).called(1);
      });

      test('should store token on successful signup', () async {
        // Arrange
        const token = 'new_jwt_token';
        final responseData = {
          'access_token': token,
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        await authService.signUp(
          email: 'test@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        verify(() => mockStorageService.saveToken(token)).called(1);
      });

      test('should return UserModel on successful signup', () async {
        // Arrange
        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'firstName': 'John',
            'lastName': 'Doe',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        final result = await authService.signUp(
          email: 'test@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
          firstName: 'John',
          lastName: 'Doe',
        );

        // Assert
        expect(result, isA<UserModel>());
        expect(result.id, equals('user_123'));
        expect(result.email, equals('test@example.com'));
        expect(result.firstName, equals('John'));
        expect(result.lastName, equals('Doe'));
        expect(result.birthdate!.year, equals(1990));
      });

      test('should throw AuthException on duplicate email (409)', () async {
        // Arrange
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenThrow(ConflictException('Email already exists'));

        // Act & Assert
        expect(
          () => authService.signUp(
            email: 'existing@example.com',
            password: 'password123',
            birthdate: DateTime(1990, 1, 15),
          ),
          throwsA(
            isA<AuthException>().having(
              (e) => e.code,
              'code',
              equals('email-already-in-use'),
            ),
          ),
        );
      });

      test('should throw AuthException on validation error (400)', () async {
        // Arrange
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenThrow(BadRequestException('Invalid email format'));

        // Act & Assert
        expect(
          () => authService.signUp(
            email: 'invalid-email',
            password: 'password123',
            birthdate: DateTime(1990, 1, 15),
          ),
          throwsA(
            isA<AuthException>().having(
              (e) => e.code,
              'code',
              equals('validation-error'),
            ),
          ),
        );
      });

      test('should signup without optional firstName and lastName', () async {
        // Arrange
        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        final result = await authService.signUp(
          email: 'test@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(result.email, equals('test@example.com'));
        verify(
          () => mockApiClient.post(
            '/auth/register',
            body: {
              'email': 'test@example.com',
              'password': 'password123',
              'birthdate': '1990-01-15',
            },
          ),
        ).called(1);
      });

      test(
        'should emit user through authStateChanges on successful signup',
        () async {
          // Arrange
          final responseData = {
            'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
            'user': {
              'id': 'user_123',
              'email': 'test@example.com',
              'birthdate': '1990-01-15',
              'role': 'patient',
            },
          };

          when(
            () => mockApiClient.post(any(), body: any(named: 'body')),
          ).thenAnswer((_) async => responseData);
          when(
            () => mockStorageService.saveToken(any()),
          ).thenAnswer((_) async {});
          when(
            () => mockStorageService.saveUserId(any()),
          ).thenAnswer((_) async {});

          // Act
          final userEmitted = expectLater(
            authService.authStateChanges,
            emits(
              isA<UserModel>().having((u) => u.id, 'id', equals('user_123')),
            ),
          );

          await authService.signUp(
            email: 'test@example.com',
            password: 'password123',
            birthdate: DateTime(1990, 1, 15),
          );

          // Assert
          await userEmitted;
        },
      );
    });

    group('signIn', () {
      test('should call POST /auth/login with correct body', () async {
        // Arrange
        const email = 'test@example.com';
        const password = 'password123';

        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': email,
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post('/auth/login', body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        await authService.signIn(email: email, password: password);

        // Assert
        verify(
          () => mockApiClient.post(
            '/auth/login',
            body: {'email': email, 'password': password},
          ),
        ).called(1);
      });

      test('should store token on successful signin', () async {
        // Arrange
        const token = 'jwt_token';
        final responseData = {
          'access_token': token,
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        verify(() => mockStorageService.saveToken(token)).called(1);
      });

      test('should return UserModel on successful signin', () async {
        // Arrange
        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'firstName': 'John',
            'lastName': 'Doe',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        final result = await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(result, isA<UserModel>());
        expect(result.id, equals('user_123'));
        expect(result.email, equals('test@example.com'));
      });

      test('should throw AuthException on invalid credentials (401)', () async {
        // Arrange
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenThrow(UnauthorizedException('Invalid credentials'));

        // Act & Assert
        expect(
          () => authService.signIn(
            email: 'test@example.com',
            password: 'wrong_password',
          ),
          throwsA(
            isA<AuthException>().having(
              (e) => e.code,
              'code',
              equals('invalid-credential'),
            ),
          ),
        );
      });

      test(
        'should emit user through authStateChanges on successful signin',
        () async {
          // Arrange
          final responseData = {
            'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
            'user': {
              'id': 'user_123',
              'email': 'test@example.com',
              'birthdate': '1990-01-15',
              'role': 'patient',
            },
          };

          when(
            () => mockApiClient.post(any(), body: any(named: 'body')),
          ).thenAnswer((_) async => responseData);
          when(
            () => mockStorageService.saveToken(any()),
          ).thenAnswer((_) async {});
          when(
            () => mockStorageService.saveUserId(any()),
          ).thenAnswer((_) async {});

          // Act
          final userEmitted = expectLater(
            authService.authStateChanges,
            emits(
              isA<UserModel>().having(
                (u) => u.email,
                'email',
                equals('test@example.com'),
              ),
            ),
          );

          await authService.signIn(
            email: 'test@example.com',
            password: 'password123',
          );

          // Assert
          await userEmitted;
        },
      );

      test('should throw AuthException on network error', () async {
        // Arrange
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenThrow(NetworkException('No internet connection'));

        // Act & Assert
        expect(
          () => authService.signIn(
            email: 'test@example.com',
            password: 'password123',
          ),
          throwsA(
            isA<AuthException>().having(
              (e) => e.code,
              'code',
              equals('network-error'),
            ),
          ),
        );
      });

      test('should throw AuthException on server error', () async {
        // Arrange
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenThrow(ServerException('Internal server error'));

        // Act & Assert
        expect(
          () => authService.signIn(
            email: 'test@example.com',
            password: 'password123',
          ),
          throwsA(
            isA<AuthException>().having(
              (e) => e.code,
              'code',
              equals('server-error'),
            ),
          ),
        );
      });
    });

    group('signOut', () {
      test('should clear all stored data', () async {
        // Arrange
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});
        when(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            )).thenAnswer((_) async => {'message': 'ok'});

        // Act
        await authService.signOut();

        // Assert
        verify(() => mockStorageService.clearSession()).called(1);
      });

      test('should update auth state to null', () async {
        // Arrange
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});
        when(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            )).thenAnswer((_) async => {'message': 'ok'});

        // First sign in to have a user
        final signInResponse = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => signInResponse);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Act
        final nullEmitted = expectLater(
          authService.authStateChanges,
          emits(isNull),
        );

        await authService.signOut();

        // Assert
        await nullEmitted;
      });

      test('should clear currentUser after signout', () async {
        // Arrange
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});
        when(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            )).thenAnswer((_) async => {'message': 'ok'});

        // Act
        await authService.signOut();

        // Assert
        expect(authService.currentUser, isNull);
      });

      test('should call POST /auth/logout with refresh token when token exists', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'stored_refresh_token');
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});
        when(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            )).thenAnswer((_) async => {'message': 'ok'});

        // Act
        await authService.signOut();

        // Assert
        verify(() => mockApiClient.post(
              '/auth/logout',
              body: {'refresh_token': 'stored_refresh_token'},
              skipRefresh: true,
            )).called(1);
      });

      test('should call POST /auth/logout with null body when no refresh token', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => null);
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});
        when(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            )).thenAnswer((_) async => {'message': 'ok'});

        // Act
        await authService.signOut();

        // Assert
        verify(() => mockApiClient.post(
              '/auth/logout',
              body: null,
              skipRefresh: true,
            )).called(1);
      });

      test('should use skipRefresh true when calling logout API', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'token');
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});
        when(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            )).thenAnswer((_) async => {'message': 'ok'});

        // Act
        await authService.signOut();

        // Assert
        verify(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: true,
            )).called(1);
      });

      test('should clear storage even when logout API throws', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'token');
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});
        when(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            )).thenThrow(Exception('Network error'));

        // Act
        await authService.signOut();

        // Assert
        verify(() => mockStorageService.clearSession()).called(1);
        expect(authService.currentUser, isNull);
      });
    });

    group('forceLogout', () {
      test('should clear all stored data', () async {
        // Arrange
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        // Act
        await authService.forceLogout();

        // Assert
        verify(() => mockStorageService.clearSession()).called(1);
      });

      test('should set currentUser to null', () async {
        // Arrange - sign in first to have a user
        final signInResponse = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => signInResponse);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );
        expect(authService.currentUser, isNotNull);

        // Act
        await authService.forceLogout();

        // Assert
        expect(authService.currentUser, isNull);
      });

      test('should emit null through authStateChanges', () async {
        // Arrange - sign in first to have a user
        final signInResponse = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => signInResponse);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Act
        final nullEmitted = expectLater(
          authService.authStateChanges,
          emits(isNull),
        );

        await authService.forceLogout();

        // Assert
        await nullEmitted;
      });

      test('should not call the logout API endpoint', () async {
        // Arrange
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        // Act
        await authService.forceLogout();

        // Assert
        verifyNever(() => mockApiClient.post(
              any(),
              body: any(named: 'body'),
              skipRefresh: any(named: 'skipRefresh'),
            ));
      });
    });

    group('checkAuthState', () {
      test('should restore session when valid token exists', () async {
        // Arrange
        const token = 'valid_jwt_token';
        final userData = {
          'id': 'user_123',
          'email': 'test@example.com',
          'firstName': 'John',
          'birthdate': '1990-01-15',
          'role': 'patient',
        };

        when(
          () => mockStorageService.getToken(),
        ).thenAnswer((_) async => token);
        when(
          () => mockApiClient.get('/auth/me'),
        ).thenAnswer((_) async => userData);

        // Act
        await authService.checkAuthState();

        // Assert
        expect(authService.currentUser, isNotNull);
        expect(authService.currentUser?.email, equals('test@example.com'));
      });

      test(
        'should emit user through authStateChanges when session restored',
        () async {
          // Arrange
          const token = 'valid_jwt_token';
          final userData = {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          };

          when(
            () => mockStorageService.getToken(),
          ).thenAnswer((_) async => token);
          when(
            () => mockApiClient.get('/auth/me'),
          ).thenAnswer((_) async => userData);

          // Act
          final userEmitted = expectLater(
            authService.authStateChanges,
            emits(isA<UserModel>()),
          );

          await authService.checkAuthState();

          // Assert
          await userEmitted;
        },
      );

      test('should clear token when token is invalid (401)', () async {
        // Arrange
        const token = 'invalid_token';

        when(
          () => mockStorageService.getToken(),
        ).thenAnswer((_) async => token);
        when(
          () => mockApiClient.get('/auth/me'),
        ).thenThrow(UnauthorizedException('Token expired'));
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        // Act
        await authService.checkAuthState();

        // Assert
        verify(() => mockStorageService.clearSession()).called(1);
        expect(authService.currentUser, isNull);
      });

      test('should emit null when token is invalid', () async {
        // Arrange
        const token = 'invalid_token';

        when(
          () => mockStorageService.getToken(),
        ).thenAnswer((_) async => token);
        when(
          () => mockApiClient.get('/auth/me'),
        ).thenThrow(UnauthorizedException('Token expired'));
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        // Act
        final nullEmitted = expectLater(
          authService.authStateChanges,
          emits(isNull),
        );

        await authService.checkAuthState();

        // Assert
        await nullEmitted;
      });

      test('should do nothing when no token exists', () async {
        // Arrange
        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);

        // Act
        await authService.checkAuthState();

        // Assert
        verifyNever(() => mockApiClient.get(any()));
        expect(authService.currentUser, isNull);
      });

      test('should handle network error gracefully during check', () async {
        // Arrange
        const token = 'valid_token';

        when(
          () => mockStorageService.getToken(),
        ).thenAnswer((_) async => token);
        when(
          () => mockApiClient.get('/auth/me'),
        ).thenThrow(NetworkException('No internet'));

        // Act & Assert - should not throw
        expect(() => authService.checkAuthState(), returnsNormally);
      });
    });

    group('authStateChanges', () {
      test('should emit user on successful login', () async {
        // Arrange
        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act - set up expectation BEFORE triggering the action
        final userEmitted = expectLater(
          authService.authStateChanges,
          emits(
            isA<UserModel>().having(
              (u) => u.email,
              'email',
              equals('test@example.com'),
            ),
          ),
        );

        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        await userEmitted;
      });

      test('should emit null on logout', () async {
        // Arrange
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        // Pre-set user state by signing in
        final signInResponse = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };
        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => signInResponse);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Act & Assert
        final nullEmitted = expectLater(
          authService.authStateChanges,
          emits(isNull),
        );

        await authService.signOut();

        await nullEmitted;
      });

      test('should be broadcast stream allowing multiple listeners', () async {
        // Arrange
        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        final completer1 = Completer<UserModel?>();
        final completer2 = Completer<UserModel?>();

        final sub1 = authService.authStateChanges.listen((user) {
          if (!completer1.isCompleted) completer1.complete(user);
        });
        final sub2 = authService.authStateChanges.listen((user) {
          if (!completer2.isCompleted) completer2.complete(user);
        });

        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert - both listeners should receive the user
        final user1 = await completer1.future;
        final user2 = await completer2.future;

        expect(user1?.email, equals('test@example.com'));
        expect(user2?.email, equals('test@example.com'));

        await sub1.cancel();
        await sub2.cancel();
      });
    });

    group('currentUser', () {
      test('should return null initially', () {
        // Assert
        expect(authService.currentUser, isNull);
      });

      test('should return user after signin', () async {
        // Arrange
        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});

        // Act
        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(authService.currentUser, isNotNull);
        expect(authService.currentUser?.email, equals('test@example.com'));
      });

      test('should return null after signout', () async {
        // Arrange - sign in first
        final responseData = {
          'access_token': 'jwt_token',
          'refresh_token': 'mock_refresh_token',
          'user': {
            'id': 'user_123',
            'email': 'test@example.com',
            'birthdate': '1990-01-15',
            'role': 'patient',
          },
        };

        when(
          () => mockApiClient.post(any(), body: any(named: 'body')),
        ).thenAnswer((_) async => responseData);
        when(
          () => mockStorageService.saveToken(any()),
        ).thenAnswer((_) async {});
        when(
          () => mockStorageService.saveUserId(any()),
        ).thenAnswer((_) async {});
        when(() => mockStorageService.clearSession()).thenAnswer((_) async {});

        await authService.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Act
        await authService.signOut();

        // Assert
        expect(authService.currentUser, isNull);
      });
    });
  });
}
