import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * TDD Tests for JwtAuthGuard
 *
 * These tests define the expected behavior of JwtAuthGuard:
 * 1. Allow access when Passport provides a valid user
 * 2. Deny access when Passport returns no user
 * 3. Deny access when Passport returns an error
 * 4. Throw UnauthorizedException with consistent message
 *
 * The guard extends Passport's AuthGuard('jwt') and delegates
 * token validation to JwtStrategy. These tests focus on the
 * handleRequest method which processes Passport's results.
 */

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('module setup', () => {
    it('should export JwtAuthGuard class', () => {
      expect(JwtAuthGuard).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(guard).toBeDefined();
    });

    it('should extend AuthGuard', () => {
      // Passport's AuthGuard provides canActivate method
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const canActivate = guard.canActivate;
      expect(canActivate).toBeDefined();
      expect(typeof canActivate).toBe('function');
    });
  });

  describe('handleRequest - valid user', () => {
    it('should return user when Passport provides valid user', () => {
      // Arrange
      const mockUser = {
        sub: 'user-uuid-1',
        id: 'user-uuid-1',
        email: 'test@example.com',
        role: 'PATIENT',
      };

      // Act
      const result = guard.handleRequest(null, mockUser);

      // Assert
      expect(result).toBe(mockUser);
    });

    it('should preserve all user properties', () => {
      // Arrange
      const mockUser = {
        sub: 'user-uuid-1',
        id: 'user-uuid-1',
        email: 'clinician@example.com',
        role: 'CLINICIAN',
        firstName: 'Dr.',
        lastName: 'Smith',
      };

      // Act
      const result = guard.handleRequest(null, mockUser);

      // Assert
      expect(result).toEqual(mockUser);
    });
  });

  describe('handleRequest - authentication failure', () => {
    it('should throw UnauthorizedException when no user provided', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is false', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, false)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when Passport returns error', () => {
      // Arrange
      const mockUser = { sub: 'user-uuid-1' };
      const error = new Error('Token expired');

      // Act & Assert
      expect(() => guard.handleRequest(error, mockUser)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw consistent error message', () => {
      // Act & Assert
      try {
        guard.handleRequest(null, null);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe(
          'Invalid or expired token',
        );
      }
    });

    it('should not expose internal error details', () => {
      // Arrange
      const internalError = new Error('Secret key compromised');

      // Act & Assert
      try {
        guard.handleRequest(internalError, null);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).not.toContain(
          'Secret',
        );
        expect((error as UnauthorizedException).message).not.toContain(
          'compromised',
        );
      }
    });
  });

  describe('handleRequest - edge cases', () => {
    it('should handle empty object as valid user', () => {
      // Arrange - empty object is truthy, so should pass
      const emptyUser = {};

      // Act
      const result = guard.handleRequest(null, emptyUser);

      // Assert
      expect(result).toEqual(emptyUser);
    });

    it('should prioritize error over user', () => {
      // Arrange - even with valid user, error should cause rejection
      const mockUser = { sub: 'user-uuid-1' };
      const error = new Error('Some error');

      // Act & Assert
      expect(() => guard.handleRequest(error, mockUser)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
