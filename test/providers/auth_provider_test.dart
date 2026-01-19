import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// Import the classes that will be implemented/updated
// These imports will fail until the classes are created/updated
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/core/services/auth_service.dart';
import 'package:mystasis/core/models/user_model.dart';

/// Mock for AuthService
class MockAuthService extends Mock implements AuthService {}

void main() {
  group('AuthProvider', () {
    late AuthProvider authProvider;
    late MockAuthService mockAuthService;
    late StreamController<UserModel?> authStateController;

    setUp(() {
      mockAuthService = MockAuthService();
      authStateController = StreamController<UserModel?>.broadcast();

      when(() => mockAuthService.authStateChanges)
          .thenAnswer((_) => authStateController.stream);
      when(() => mockAuthService.currentUser).thenReturn(null);

      authProvider = AuthProvider(authService: mockAuthService);
    });

    tearDown(() {
      authStateController.close();
      authProvider.dispose();
    });

    group('initial state', () {
      test('should have null user initially', () {
        // Assert
        expect(authProvider.user, isNull);
      });

      test('should not be loading initially', () {
        // Assert
        expect(authProvider.isLoading, isFalse);
      });

      test('should have no error message initially', () {
        // Assert
        expect(authProvider.errorMessage, isNull);
      });

      test('should not be authenticated initially', () {
        // Assert
        expect(authProvider.isAuthenticated, isFalse);
      });
    });

    group('signUp', () {
      test('should set loading state during operation', () async {
        // Arrange
        final completer = Completer<UserModel>();
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenAnswer((_) => completer.future);

        // Act
        final signUpFuture = authProvider.signUp(
          email: 'test@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
          firstName: 'John',
          lastName: 'Doe',
        );

        // Assert - should be loading during operation
        expect(authProvider.isLoading, isTrue);

        // Complete the signup
        completer.complete(UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        ));
        await signUpFuture;

        // Assert - should not be loading after completion
        expect(authProvider.isLoading, isFalse);
      });

      test('should update user on successful signup', () async {
        // Arrange
        final newUser = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenAnswer((_) async => newUser);

        // Act
        await authProvider.signUp(
          email: 'test@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
          firstName: 'John',
          lastName: 'Doe',
        );

        // Simulate auth state change from service
        authStateController.add(newUser);
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.user, equals(newUser));
        expect(authProvider.isAuthenticated, isTrue);
      });

      test('should return true on successful signup', () async {
        // Arrange
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenAnswer((_) async => UserModel(
              id: 'user_123',
              email: 'test@example.com',
              birthdate: DateTime(1990, 1, 15),
              role: 'patient',
            ));

        // Act
        final result = await authProvider.signUp(
          email: 'test@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(result, isTrue);
      });

      test('should set error message on failure', () async {
        // Arrange
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenThrow(AuthException(
          code: 'email-already-in-use',
          message: 'Email already exists',
        ));

        // Act
        await authProvider.signUp(
          email: 'existing@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(authProvider.errorMessage, isNotNull);
        expect(authProvider.isLoading, isFalse);
      });

      test('should return false on failure', () async {
        // Arrange
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenThrow(AuthException(
          code: 'email-already-in-use',
          message: 'Email already exists',
        ));

        // Act
        final result = await authProvider.signUp(
          email: 'existing@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(result, isFalse);
      });

      test('should map email-already-in-use to user-friendly message', () async {
        // Arrange
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenThrow(AuthException(
          code: 'email-already-in-use',
          message: 'Email already exists',
        ));

        // Act
        await authProvider.signUp(
          email: 'existing@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(
          authProvider.errorMessage,
          equals('An account already exists with this email.'),
        );
      });

      test('should clear previous error before signup attempt', () async {
        // Arrange - first attempt fails
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenThrow(AuthException(
          code: 'validation-error',
          message: 'Invalid email',
        ));

        await authProvider.signUp(
          email: 'invalid',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );
        expect(authProvider.errorMessage, isNotNull);

        // Arrange - second attempt succeeds
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenAnswer((_) async => UserModel(
              id: 'user_123',
              email: 'valid@example.com',
              birthdate: DateTime(1990, 1, 15),
              role: 'patient',
            ));

        // Act
        await authProvider.signUp(
          email: 'valid@example.com',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(authProvider.errorMessage, isNull);
      });
    });

    group('signIn', () {
      test('should set loading state during operation', () async {
        // Arrange
        final completer = Completer<UserModel>();
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) => completer.future);

        // Act
        final signInFuture = authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert - should be loading during operation
        expect(authProvider.isLoading, isTrue);

        // Complete the signin
        completer.complete(UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        ));
        await signInFuture;

        // Assert - should not be loading after completion
        expect(authProvider.isLoading, isFalse);
      });

      test('should update user on successful signin', () async {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => user);

        // Act
        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Simulate auth state change from service
        authStateController.add(user);
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.user, equals(user));
        expect(authProvider.isAuthenticated, isTrue);
      });

      test('should return true on successful signin', () async {
        // Arrange
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => UserModel(
              id: 'user_123',
              email: 'test@example.com',
              birthdate: DateTime(1990, 1, 15),
              role: 'patient',
            ));

        // Act
        final result = await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(result, isTrue);
      });

      test('should map 401 invalid-credential to user-friendly message', () async {
        // Arrange
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'invalid-credential',
          message: 'Invalid credentials',
        ));

        // Act
        await authProvider.signIn(
          email: 'test@example.com',
          password: 'wrong_password',
        );

        // Assert
        expect(
          authProvider.errorMessage,
          equals('Invalid email or password.'),
        );
      });

      test('should map network-error to user-friendly message', () async {
        // Arrange
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'network-error',
          message: 'No internet connection',
        ));

        // Act
        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(
          authProvider.errorMessage,
          contains('network'),
        );
      });

      test('should return false on failure', () async {
        // Arrange
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'invalid-credential',
          message: 'Invalid credentials',
        ));

        // Act
        final result = await authProvider.signIn(
          email: 'test@example.com',
          password: 'wrong_password',
        );

        // Assert
        expect(result, isFalse);
      });

      test('should set error message on failure', () async {
        // Arrange
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'server-error',
          message: 'Internal server error',
        ));

        // Act
        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(authProvider.errorMessage, isNotNull);
        expect(authProvider.isLoading, isFalse);
      });

      test('should clear previous error before signin attempt', () async {
        // Arrange - first attempt fails
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'invalid-credential',
          message: 'Invalid credentials',
        ));

        await authProvider.signIn(
          email: 'test@example.com',
          password: 'wrong',
        );
        expect(authProvider.errorMessage, isNotNull);

        // Arrange - second attempt succeeds
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => UserModel(
              id: 'user_123',
              email: 'test@example.com',
              birthdate: DateTime(1990, 1, 15),
              role: 'patient',
            ));

        // Act
        await authProvider.signIn(
          email: 'test@example.com',
          password: 'correct',
        );

        // Assert
        expect(authProvider.errorMessage, isNull);
      });
    });

    group('signOut', () {
      test('should clear user state', () async {
        // Arrange - first sign in
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => user);
        when(() => mockAuthService.signOut()).thenAnswer((_) async {});

        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );
        authStateController.add(user);
        await Future.delayed(Duration.zero);

        expect(authProvider.user, isNotNull);

        // Act
        await authProvider.signOut();
        authStateController.add(null);
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.user, isNull);
        expect(authProvider.isAuthenticated, isFalse);
      });

      test('should call authService.signOut', () async {
        // Arrange
        when(() => mockAuthService.signOut()).thenAnswer((_) async {});

        // Act
        await authProvider.signOut();

        // Assert
        verify(() => mockAuthService.signOut()).called(1);
      });

      test('should not throw even if signOut fails', () async {
        // Arrange
        when(() => mockAuthService.signOut())
            .thenThrow(Exception('Sign out failed'));

        // Act & Assert - should not throw
        expect(() => authProvider.signOut(), returnsNormally);
      });
    });

    group('clearError', () {
      test('should remove error message', () async {
        // Arrange - create an error state
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'invalid-credential',
          message: 'Invalid credentials',
        ));

        await authProvider.signIn(
          email: 'test@example.com',
          password: 'wrong',
        );
        expect(authProvider.errorMessage, isNotNull);

        // Act
        authProvider.clearError();

        // Assert
        expect(authProvider.errorMessage, isNull);
      });

      test('should notify listeners when error is cleared', () async {
        // Arrange - create an error state
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'invalid-credential',
          message: 'Invalid credentials',
        ));

        await authProvider.signIn(
          email: 'test@example.com',
          password: 'wrong',
        );

        var listenerCalled = false;
        authProvider.addListener(() {
          listenerCalled = true;
        });

        // Act
        authProvider.clearError();

        // Assert
        expect(listenerCalled, isTrue);
      });
    });

    group('isAuthenticated', () {
      test('should return true when user exists', () async {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => user);

        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );
        authStateController.add(user);
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.isAuthenticated, isTrue);
      });

      test('should return false when user is null', () {
        // Assert
        expect(authProvider.isAuthenticated, isFalse);
      });

      test('should return false after signout', () async {
        // Arrange - sign in first
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => user);
        when(() => mockAuthService.signOut()).thenAnswer((_) async {});

        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );
        authStateController.add(user);
        await Future.delayed(Duration.zero);

        expect(authProvider.isAuthenticated, isTrue);

        // Act
        await authProvider.signOut();
        authStateController.add(null);
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.isAuthenticated, isFalse);
      });
    });

    group('auth state changes listener', () {
      test('should update user when auth state changes', () async {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        authStateController.add(user);
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.user, equals(user));
      });

      test('should clear user when auth state emits null', () async {
        // Arrange - first set a user
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );
        authStateController.add(user);
        await Future.delayed(Duration.zero);

        expect(authProvider.user, isNotNull);

        // Act
        authStateController.add(null);
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.user, isNull);
      });

      test('should notify listeners when auth state changes', () async {
        // Arrange
        var notifyCount = 0;
        authProvider.addListener(() {
          notifyCount++;
        });

        // Act
        authStateController.add(UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        ));
        await Future.delayed(Duration.zero);

        // Assert
        expect(notifyCount, greaterThan(0));
      });
    });

    group('error message mapping', () {
      test('should map validation-error to user-friendly message', () async {
        // Arrange
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenThrow(AuthException(
          code: 'validation-error',
          message: 'Invalid email format',
        ));

        // Act
        await authProvider.signUp(
          email: 'invalid',
          password: 'password123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(
          authProvider.errorMessage,
          equals('Please check your input and try again.'),
        );
      });

      test('should map weak-password to user-friendly message', () async {
        // Arrange
        when(() => mockAuthService.signUp(
              email: any(named: 'email'),
              password: any(named: 'password'),
              birthdate: any(named: 'birthdate'),
              firstName: any(named: 'firstName'),
              lastName: any(named: 'lastName'),
            )).thenThrow(AuthException(
          code: 'weak-password',
          message: 'Password too weak',
        ));

        // Act
        await authProvider.signUp(
          email: 'test@example.com',
          password: '123',
          birthdate: DateTime(1990, 1, 15),
        );

        // Assert
        expect(
          authProvider.errorMessage,
          equals('Password must be at least 6 characters.'),
        );
      });

      test('should map server-error to user-friendly message', () async {
        // Arrange
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'server-error',
          message: 'Internal server error',
        ));

        // Act
        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(
          authProvider.errorMessage,
          equals('An error occurred. Please try again.'),
        );
      });

      test('should map unknown error to generic message', () async {
        // Arrange
        when(() => mockAuthService.signIn(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(AuthException(
          code: 'unknown-error-code',
          message: 'Something unexpected',
        ));

        // Act
        await authProvider.signIn(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(
          authProvider.errorMessage,
          equals('An error occurred. Please try again.'),
        );
      });
    });

    group('checkAuthStatus', () {
      test('should call authService.checkAuthState', () async {
        // Arrange
        when(() => mockAuthService.checkAuthState()).thenAnswer((_) async {});

        // Act
        await authProvider.checkAuthStatus();

        // Assert
        verify(() => mockAuthService.checkAuthState()).called(1);
      });

      test('should update user if session is restored', () async {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        when(() => mockAuthService.checkAuthState()).thenAnswer((_) async {
          authStateController.add(user);
        });

        // Act
        await authProvider.checkAuthStatus();
        await Future.delayed(Duration.zero);

        // Assert
        expect(authProvider.user, equals(user));
      });
    });
  });
}
