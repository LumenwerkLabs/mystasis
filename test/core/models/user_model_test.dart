import 'package:flutter_test/flutter_test.dart';

// Import the model that will be implemented
// This import will fail until UserModel is updated
import 'package:mystasis/core/models/user_model.dart';

void main() {
  group('UserModel', () {
    group('fromJson', () {
      test('should parse complete user object with all fields', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'firstName': 'John',
          'lastName': 'Doe',
          'birthdate': '1990-01-15',
          'role': 'patient',
          'createdAt': '2024-01-15T10:30:00.000Z',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.id, equals('user_123'));
        expect(user.email, equals('test@example.com'));
        expect(user.firstName, equals('John'));
        expect(user.lastName, equals('Doe'));
        expect(user.birthdate, isA<DateTime>());
        expect(user.birthdate!.year, equals(1990));
        expect(user.birthdate!.month, equals(1));
        expect(user.birthdate!.day, equals(15));
        expect(user.role, equals('patient'));
        expect(user.createdAt, isA<DateTime>());
      });

      test('should parse user object with null firstName', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'firstName': null,
          'lastName': 'Doe',
          'birthdate': '1990-01-15',
          'role': 'patient',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.id, equals('user_123'));
        expect(user.email, equals('test@example.com'));
        expect(user.firstName, isNull);
        expect(user.lastName, equals('Doe'));
      });

      test('should parse user object with null lastName', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'firstName': 'John',
          'lastName': null,
          'birthdate': '1990-01-15',
          'role': 'patient',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.firstName, equals('John'));
        expect(user.lastName, isNull);
      });

      test('should parse user object with both names null', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'firstName': null,
          'lastName': null,
          'birthdate': '1990-01-15',
          'role': 'patient',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.firstName, isNull);
        expect(user.lastName, isNull);
      });

      test('should handle missing optional fields', () {
        // Arrange - minimal required fields
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'birthdate': '1990-01-15',
          'role': 'patient',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.id, equals('user_123'));
        expect(user.email, equals('test@example.com'));
        expect(user.birthdate!.year, equals(1990));
        expect(user.firstName, isNull);
        expect(user.lastName, isNull);
        expect(user.createdAt, isNull);
      });

      test('should parse clinician role correctly', () {
        // Arrange
        final json = {
          'id': 'clinician_456',
          'email': 'doctor@clinic.com',
          'firstName': 'Dr. Jane',
          'lastName': 'Smith',
          'birthdate': '1980-05-20',
          'role': 'clinician',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.role, equals('clinician'));
      });

      test('should handle createdAt as ISO string', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'birthdate': '1990-01-15',
          'role': 'patient',
          'createdAt': '2024-06-15T14:30:00.000Z',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.createdAt, isA<DateTime>());
        expect(user.createdAt?.year, equals(2024));
        expect(user.createdAt?.month, equals(6));
        expect(user.createdAt?.day, equals(15));
      });

      test('should handle null createdAt', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'birthdate': '1990-01-15',
          'role': 'patient',
          'createdAt': null,
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.createdAt, isNull);
      });

      test('should parse birthdate correctly with ISO 8601 date format', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'birthdate': '1985-12-25',
          'role': 'patient',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.birthdate!.year, equals(1985));
        expect(user.birthdate!.month, equals(12));
        expect(user.birthdate!.day, equals(25));
      });

      test('should parse birthdate with full ISO 8601 datetime format', () {
        // Arrange
        final json = {
          'id': 'user_123',
          'email': 'test@example.com',
          'birthdate': '1985-12-25T00:00:00.000Z',
          'role': 'patient',
        };

        // Act
        final user = UserModel.fromJson(json);

        // Assert
        expect(user.birthdate!.year, equals(1985));
        expect(user.birthdate!.month, equals(12));
        expect(user.birthdate!.day, equals(25));
      });
    });

    group('displayName', () {
      test('should return "firstName lastName" when both exist', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final displayName = user.displayName;

        // Assert
        expect(displayName, equals('John Doe'));
      });

      test('should return firstName when lastName is null', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: null,
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final displayName = user.displayName;

        // Assert
        expect(displayName, equals('John'));
      });

      test('should return lastName when firstName is null', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: null,
          lastName: 'Doe',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final displayName = user.displayName;

        // Assert
        expect(displayName, equals('Doe'));
      });

      test('should return null when both firstName and lastName are null', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: null,
          lastName: null,
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final displayName = user.displayName;

        // Assert
        expect(displayName, isNull);
      });

      test('should trim whitespace from display name', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: '  John  ',
          lastName: '  Doe  ',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final displayName = user.displayName;

        // Assert
        expect(displayName, equals('John Doe'));
      });

      test('should handle empty string firstName as null', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: '',
          lastName: 'Doe',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final displayName = user.displayName;

        // Assert
        expect(displayName, equals('Doe'));
      });

      test('should handle empty string lastName as null', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: '',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final displayName = user.displayName;

        // Assert
        expect(displayName, equals('John'));
      });
    });

    group('toJson', () {
      test('should produce correct map with all fields', () {
        // Arrange
        final birthdate = DateTime(1990, 1, 15);
        final createdAt = DateTime(2024, 1, 15, 10, 30);
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: birthdate,
          role: 'patient',
          createdAt: createdAt,
        );

        // Act
        final json = user.toJson();

        // Assert
        expect(json['id'], equals('user_123'));
        expect(json['email'], equals('test@example.com'));
        expect(json['firstName'], equals('John'));
        expect(json['lastName'], equals('Doe'));
        expect(json['birthdate'], equals(birthdate.toIso8601String()));
        expect(json['role'], equals('patient'));
        expect(json['createdAt'], equals(createdAt.toIso8601String()));
      });

      test('should produce map with null values for missing optional fields', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final json = user.toJson();

        // Assert
        expect(json['id'], equals('user_123'));
        expect(json['email'], equals('test@example.com'));
        expect(json['birthdate'], isNotNull);
        expect(json['firstName'], isNull);
        expect(json['lastName'], isNull);
        expect(json['createdAt'], isNull);
      });

      test('should roundtrip through fromJson and toJson', () {
        // Arrange
        final originalJson = {
          'id': 'user_123',
          'email': 'test@example.com',
          'firstName': 'John',
          'lastName': 'Doe',
          'birthdate': '1990-01-15',
          'role': 'clinician',
          'createdAt': '2024-06-15T14:30:00.000Z',
        };

        // Act
        final user = UserModel.fromJson(originalJson);
        final resultJson = user.toJson();

        // Assert
        expect(resultJson['id'], equals(originalJson['id']));
        expect(resultJson['email'], equals(originalJson['email']));
        expect(resultJson['firstName'], equals(originalJson['firstName']));
        expect(resultJson['lastName'], equals(originalJson['lastName']));
        expect(resultJson['role'], equals(originalJson['role']));
        // Birthdate should be preserved (though format may differ)
        expect(user.birthdate!.year, equals(1990));
        expect(user.birthdate!.month, equals(1));
        expect(user.birthdate!.day, equals(15));
      });
    });

    group('copyWith', () {
      test('should create copy with updated email', () {
        // Arrange
        final original = UserModel(
          id: 'user_123',
          email: 'old@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final updated = original.copyWith(email: 'new@example.com');

        // Assert
        expect(updated.id, equals('user_123'));
        expect(updated.email, equals('new@example.com'));
        expect(updated.firstName, equals('John'));
        expect(updated.lastName, equals('Doe'));
        expect(updated.birthdate, equals(original.birthdate));
      });

      test('should create copy with updated firstName', () {
        // Arrange
        final original = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final updated = original.copyWith(firstName: 'Jane');

        // Assert
        expect(updated.firstName, equals('Jane'));
        expect(updated.lastName, equals('Doe'));
      });

      test('should create copy with updated birthdate', () {
        // Arrange
        final original = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Act
        final newBirthdate = DateTime(1985, 6, 20);
        final updated = original.copyWith(birthdate: newBirthdate);

        // Assert
        expect(updated.birthdate, equals(newBirthdate));
        expect(original.birthdate, equals(DateTime(1990, 1, 15)));
      });

      test('should preserve all fields when no arguments provided', () {
        // Arrange
        final birthdate = DateTime(1990, 1, 15);
        final createdAt = DateTime(2024, 1, 15);
        final original = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: birthdate,
          role: 'patient',
          createdAt: createdAt,
        );

        // Act
        final copy = original.copyWith();

        // Assert
        expect(copy.id, equals(original.id));
        expect(copy.email, equals(original.email));
        expect(copy.firstName, equals(original.firstName));
        expect(copy.lastName, equals(original.lastName));
        expect(copy.birthdate, equals(original.birthdate));
        expect(copy.role, equals(original.role));
        expect(copy.createdAt, equals(original.createdAt));
      });
    });

    group('equality', () {
      test('should be equal when all fields match', () {
        // Arrange
        final birthdate = DateTime(1990, 1, 15);
        final user1 = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: birthdate,
          role: 'patient',
        );
        final user2 = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: birthdate,
          role: 'patient',
        );

        // Assert
        expect(user1, equals(user2));
      });

      test('should not be equal when id differs', () {
        // Arrange
        final birthdate = DateTime(1990, 1, 15);
        final user1 = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: birthdate,
          role: 'patient',
        );
        final user2 = UserModel(
          id: 'user_456',
          email: 'test@example.com',
          birthdate: birthdate,
          role: 'patient',
        );

        // Assert
        expect(user1, isNot(equals(user2)));
      });

      test('should not be equal when birthdate differs', () {
        // Arrange
        final user1 = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );
        final user2 = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1985, 6, 20),
          role: 'patient',
        );

        // Assert
        expect(user1, isNot(equals(user2)));
      });
    });

    group('isPatient / isClinician helpers', () {
      test('isPatient should return true for patient role', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'test@example.com',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );

        // Assert
        expect(user.isPatient, isTrue);
        expect(user.isClinician, isFalse);
      });

      test('isClinician should return true for clinician role', () {
        // Arrange
        final user = UserModel(
          id: 'user_123',
          email: 'doctor@example.com',
          birthdate: DateTime(1980, 5, 20),
          role: 'clinician',
        );

        // Assert
        expect(user.isClinician, isTrue);
        expect(user.isPatient, isFalse);
      });
    });

    group('toString', () {
      test('should not include PII fields like email or names', () {
        final user = UserModel(
          id: 'user_123',
          email: 'sensitive@example.com',
          firstName: 'John',
          lastName: 'Doe',
          birthdate: DateTime(1990, 1, 15),
          role: 'patient',
        );
        final str = user.toString();
        expect(str, contains('user_123'));
        expect(str, contains('patient'));
        expect(str, isNot(contains('sensitive@example.com')));
        expect(str, isNot(contains('John')));
        expect(str, isNot(contains('Doe')));
      });
    });
  });
}
