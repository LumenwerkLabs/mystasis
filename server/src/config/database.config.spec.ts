import { DatabaseConfig } from './database.config';

/**
 * TDD Tests for DatabaseConfig
 *
 * These tests define the expected behavior of database configuration:
 * 1. Should require DATABASE_URL environment variable
 * 2. Should validate PostgreSQL connection string format
 * 3. Should support optional connection pool settings
 *
 * RED PHASE: These tests will fail until database.config.ts is implemented.
 */

// Import the config - will fail until implemented
let databaseConfig: () => DatabaseConfig;
let isValidDatabaseUrl: (url: string) => boolean;

beforeAll(async () => {
  try {
    const module = await import('./database.config');
    databaseConfig = module.databaseConfig;
    isValidDatabaseUrl = module.isValidDatabaseUrl;
  } catch {
    // Module not implemented yet - tests will fail as expected
  }
});

describe('DatabaseConfig', () => {
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

  describe('databaseConfig factory', () => {
    it('should export a databaseConfig function', () => {
      expect(databaseConfig).toBeDefined();
      expect(typeof databaseConfig).toBe('function');
    });

    it('should return valid configuration when DATABASE_URL is set', () => {
      // Arrange
      const validUrl = 'postgresql://user:pass@localhost:5432/mystasis_db';
      process.env.DATABASE_URL = validUrl;

      // Act
      const config = databaseConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.url).toBe(validUrl);
    });

    it('should throw error when DATABASE_URL is missing', () => {
      // Arrange
      delete process.env.DATABASE_URL;

      // Act & Assert
      expect(() => databaseConfig()).toThrow();
    });

    it('should throw error when DATABASE_URL is empty string', () => {
      // Arrange
      process.env.DATABASE_URL = '';

      // Act & Assert
      expect(() => databaseConfig()).toThrow();
    });

    it('should throw descriptive error message when DATABASE_URL is missing', () => {
      // Arrange
      delete process.env.DATABASE_URL;

      // Act & Assert
      expect(() => databaseConfig()).toThrow(/DATABASE_URL/i);
    });
  });

  describe('URL validation', () => {
    it('should export isValidDatabaseUrl helper function', () => {
      expect(isValidDatabaseUrl).toBeDefined();
      expect(typeof isValidDatabaseUrl).toBe('function');
    });

    it('should accept postgresql:// URL format', () => {
      // Arrange
      const validPostgresUrl =
        'postgresql://user:password@localhost:5432/database';

      // Act
      const isValid = isValidDatabaseUrl(validPostgresUrl);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should accept postgres:// URL format', () => {
      // Arrange
      const validPostgresUrl =
        'postgres://user:password@localhost:5432/database';

      // Act
      const isValid = isValidDatabaseUrl(validPostgresUrl);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should reject invalid URL format', () => {
      // Arrange
      const invalidUrl = 'not-a-valid-database-url';

      // Act
      const isValid = isValidDatabaseUrl(invalidUrl);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should reject non-PostgreSQL database URLs', () => {
      // Arrange
      const mysqlUrl = 'mysql://user:password@localhost:3306/database';

      // Act
      const isValid = isValidDatabaseUrl(mysqlUrl);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should reject mongodb URLs', () => {
      // Arrange
      const mongoUrl = 'mongodb://user:password@localhost:27017/database';

      // Act
      const isValid = isValidDatabaseUrl(mongoUrl);

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('connection pool settings', () => {
    it('should include poolMin when DATABASE_POOL_MIN is set', () => {
      // Arrange
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.DATABASE_POOL_MIN = '2';

      // Act
      const config = databaseConfig();

      // Assert
      expect(config.poolMin).toBe(2);
    });

    it('should include poolMax when DATABASE_POOL_MAX is set', () => {
      // Arrange
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.DATABASE_POOL_MAX = '10';

      // Act
      const config = databaseConfig();

      // Assert
      expect(config.poolMax).toBe(10);
    });

    it('should use default pool settings when not provided', () => {
      // Arrange
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      delete process.env.DATABASE_POOL_MIN;
      delete process.env.DATABASE_POOL_MAX;

      // Act
      const config = databaseConfig();

      // Assert
      // Default values should be reasonable (e.g., min: 1, max: 10)
      expect(config.poolMin).toBeDefined();
      expect(config.poolMax).toBeDefined();
      expect(config.poolMin).toBeGreaterThanOrEqual(1);
      expect(config.poolMax).toBeGreaterThanOrEqual(config.poolMin);
    });
  });

  describe('configuration shape', () => {
    it('should return configuration with expected properties', () => {
      // Arrange
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      // Act
      const config = databaseConfig();

      // Assert
      expect(config).toHaveProperty('url');
      expect(config).toHaveProperty('poolMin');
      expect(config).toHaveProperty('poolMax');
    });
  });
});
