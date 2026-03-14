import { AuthConfig } from './auth.config';
import { ConfigFactoryKeyHost } from '@nestjs/config';

/**
 * TDD Tests for AuthConfig
 *
 * These tests define the expected behavior of authentication configuration:
 * 1. Should require JWT_SECRET environment variable
 * 2. Should validate JWT_SECRET minimum length for security
 * 3. Should support optional JWT_EXPIRATION setting
 * 4. Should provide sensible defaults
 *
 * Security considerations:
 * - JWT_SECRET must be at least 32 characters for adequate security
 * - Missing JWT_SECRET should throw descriptive error
 * - Configuration should not expose secrets in error messages
 *
 * RED PHASE: These tests will fail until auth.config.ts is implemented.
 */

// Import the config - will fail until implemented
let authConfig: (() => AuthConfig) & ConfigFactoryKeyHost;

beforeAll(async () => {
  try {
    const module = await import('./auth.config');
    authConfig = module.authConfig;
  } catch {
    // Module not implemented yet - tests will fail as expected
  }
});

describe('AuthConfig', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('authConfig factory', () => {
    it('should export an authConfig function', () => {
      expect(authConfig).toBeDefined();
      expect(typeof authConfig).toBe('function');
    });

    it('should return valid configuration when JWT_SECRET is set', () => {
      // Arrange
      const validSecret = 'this-is-a-very-secure-secret-key-32chars';
      process.env.JWT_SECRET = validSecret;

      // Act
      const config = authConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.jwtSecret).toBe(validSecret);
    });

    it('should return configuration with default access token expiration when not set', () => {
      // Arrange
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-32chars';
      delete process.env.JWT_ACCESS_EXPIRATION;

      // Act
      const config = authConfig();

      // Assert
      expect(config.accessTokenExpiration).toBe('15m');
    });

    it('should return default refresh token expiration of 7 days', () => {
      // Arrange
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-32chars';
      delete process.env.JWT_REFRESH_EXPIRATION_DAYS;

      // Act
      const config = authConfig();

      // Assert
      expect(config.refreshTokenExpirationDays).toBe(7);
    });
  });

  describe('JWT_SECRET validation', () => {
    it('should throw error when JWT_SECRET is missing', () => {
      // Arrange
      delete process.env.JWT_SECRET;

      // Act & Assert
      expect(() => authConfig()).toThrow();
    });

    it('should throw error when JWT_SECRET is empty string', () => {
      // Arrange
      process.env.JWT_SECRET = '';

      // Act & Assert
      expect(() => authConfig()).toThrow();
    });

    it('should throw descriptive error message when JWT_SECRET is missing', () => {
      // Arrange
      delete process.env.JWT_SECRET;

      // Act & Assert
      expect(() => authConfig()).toThrow(/JWT_SECRET/i);
    });

    it('should throw error when JWT_SECRET is too short (less than 32 chars)', () => {
      // Arrange
      process.env.JWT_SECRET = 'short-secret'; // Only 12 chars

      // Act & Assert
      expect(() => authConfig()).toThrow();
    });

    it('should throw descriptive error for short JWT_SECRET', () => {
      // Arrange
      process.env.JWT_SECRET = 'tooshort';

      // Act & Assert
      expect(() => authConfig()).toThrow(/32|characters|length|short/i);
    });

    it('should accept JWT_SECRET exactly 32 characters', () => {
      // Arrange
      const secret32 = 'exactly-thirty-two-characters!!!'; // 32 chars
      process.env.JWT_SECRET = secret32;

      // Act
      const config = authConfig();

      // Assert
      expect(config.jwtSecret).toBe(secret32);
    });

    it('should accept JWT_SECRET longer than 32 characters', () => {
      // Arrange
      const longSecret = 'a'.repeat(64);
      process.env.JWT_SECRET = longSecret;

      // Act
      const config = authConfig();

      // Assert
      expect(config.jwtSecret).toBe(longSecret);
    });

    it('should throw error for whitespace-only JWT_SECRET', () => {
      // Arrange
      process.env.JWT_SECRET = '                                '; // 32 spaces

      // Act & Assert
      expect(() => authConfig()).toThrow();
    });
  });

  describe('token expiration configuration', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-32chars';
    });

    it('should use custom access token expiration when provided', () => {
      process.env.JWT_ACCESS_EXPIRATION = '30m';
      const config = authConfig();
      expect(config.accessTokenExpiration).toBe('30m');
    });

    it('should use custom refresh token expiration days when provided', () => {
      process.env.JWT_REFRESH_EXPIRATION_DAYS = '14';
      const config = authConfig();
      expect(config.refreshTokenExpirationDays).toBe(14);
    });

    it('should default refresh token expiration to 7 days', () => {
      delete process.env.JWT_REFRESH_EXPIRATION_DAYS;
      const config = authConfig();
      expect(config.refreshTokenExpirationDays).toBe(7);
    });

    it('should default access token expiration to 15m', () => {
      delete process.env.JWT_ACCESS_EXPIRATION;
      const config = authConfig();
      expect(config.accessTokenExpiration).toBe('15m');
    });
  });

  describe('configuration shape', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-32chars';
    });

    it('should return configuration with expected properties', () => {
      const config = authConfig();
      expect(config).toHaveProperty('jwtSecret');
      expect(config).toHaveProperty('accessTokenExpiration');
      expect(config).toHaveProperty('refreshTokenExpirationDays');
    });

    it('should have correct types for all properties', () => {
      const config = authConfig();
      expect(typeof config.jwtSecret).toBe('string');
      expect(typeof config.accessTokenExpiration).toBe('string');
      expect(typeof config.refreshTokenExpirationDays).toBe('number');
    });
  });

  describe('error message security', () => {
    it('should not expose JWT_SECRET value in error messages', () => {
      // Arrange
      const shortSecret = 'mysecret';
      process.env.JWT_SECRET = shortSecret;

      // Act & Assert - verify error doesn't contain secret value
      let errorMessage = '';
      expect(() => {
        try {
          void authConfig();
        } catch (error) {
          errorMessage = (error as Error).message;
          throw error;
        }
      }).toThrow();
      expect(errorMessage).not.toContain(shortSecret);
    });

    it('should provide actionable error message for missing secret', () => {
      // Arrange
      delete process.env.JWT_SECRET;

      // Act & Assert - verify error has actionable message
      let errorMessage = '';
      expect(() => {
        try {
          void authConfig();
        } catch (error) {
          errorMessage = (error as Error).message;
          throw error;
        }
      }).toThrow();
      // Should tell user what to do
      expect(errorMessage).toMatch(
        /JWT_SECRET|environment|required|set|configure/i,
      );
    });
  });

  describe('registered config namespace', () => {
    it('should be registered with "auth" namespace', () => {
      // The registerAs function creates a namespaced config
      // that can be accessed via ConfigService.get('auth.jwtSecret')
      // NestJS prefixes the key with 'CONFIGURATION('
      expect(authConfig.KEY).toMatch(/auth/);
    });
  });
});
