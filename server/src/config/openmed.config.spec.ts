import { registerAs } from '@nestjs/config';

/**
 * TDD Tests for OpenMed Configuration
 *
 * These tests define the expected behavior of OpenMed service configuration:
 * 1. Service URL - default and custom values
 * 2. Timeout - default and custom values
 * 3. Confidence threshold - default and custom values
 * 4. Enabled flag - parsing boolean from environment
 * 5. Health check on init - optional health check at startup
 *
 * Environment Variables:
 * - OPENMED_SERVICE_URL: URL of the OpenMed microservice (default: http://localhost:8001)
 * - OPENMED_TIMEOUT: Request timeout in milliseconds (default: 30000)
 * - OPENMED_ENABLED: Enable/disable the service (default: true)
 * - OPENMED_CONFIDENCE_THRESHOLD: Minimum confidence for PII detection (default: 0.7)
 * - OPENMED_HEALTH_CHECK_ON_INIT: Check service health on module init (default: true)
 *
 * RED PHASE: These tests will fail until openmed.config.ts is implemented.
 */

// Import the config - will fail until implemented
let openmedConfig: ReturnType<typeof registerAs>;

beforeAll(async () => {
  try {
    // Dynamic require to allow tests to compile before implementation exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('./openmed.config');
    openmedConfig = module.openmedConfig;
  } catch {
    // Module not implemented yet - tests will skip with guards
  }
});

describe('OpenMedConfig', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear all openmed-related env vars
    delete process.env.OPENMED_SERVICE_URL;
    delete process.env.OPENMED_TIMEOUT;
    delete process.env.OPENMED_ENABLED;
    delete process.env.OPENMED_CONFIDENCE_THRESHOLD;
    delete process.env.OPENMED_HEALTH_CHECK_ON_INIT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('openmedConfig factory', () => {
    it('should export an openmedConfig function', () => {
      expect(openmedConfig).toBeDefined();
      expect(typeof openmedConfig).toBe('function');
    });

    it('should be registered with "openmed" namespace', () => {
      if (!openmedConfig) return;
      // NestJS registerAs prefixes the key with 'CONFIGURATION('
      expect(openmedConfig.KEY).toMatch(/openmed/);
    });
  });

  // ============================================
  // SERVICE URL TESTS
  // ============================================

  describe('serviceUrl configuration', () => {
    it('should use default serviceUrl when OPENMED_SERVICE_URL is not set', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('http://localhost:8001');
    });

    it('should use custom serviceUrl when OPENMED_SERVICE_URL is set', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_SERVICE_URL = 'http://openmed-service:9000';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('http://openmed-service:9000');
    });

    it('should use custom serviceUrl with HTTPS', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_SERVICE_URL = 'https://secure-openmed.example.com';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('https://secure-openmed.example.com');
    });

    it('should use custom serviceUrl with port', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_SERVICE_URL = 'http://192.168.1.100:8080';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('http://192.168.1.100:8080');
    });

    it('should preserve trailing slash in serviceUrl', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_SERVICE_URL = 'http://openmed-service:8001/';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('http://openmed-service:8001/');
    });

    it('should handle empty OPENMED_SERVICE_URL as default', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_SERVICE_URL = '';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('http://localhost:8001');
    });
  });

  // ============================================
  // TIMEOUT TESTS
  // ============================================

  describe('timeout configuration', () => {
    it('should use default timeout of 30000ms when OPENMED_TIMEOUT is not set', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.timeout).toBe(30000);
    });

    it('should parse numeric OPENMED_TIMEOUT correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_TIMEOUT = '60000';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.timeout).toBe(60000);
    });

    it('should handle small timeout value', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_TIMEOUT = '5000';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.timeout).toBe(5000);
    });

    it('should handle large timeout value', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_TIMEOUT = '120000';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.timeout).toBe(120000);
    });

    it('should use default timeout when OPENMED_TIMEOUT is empty', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_TIMEOUT = '';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.timeout).toBe(30000);
    });

    it('should use default timeout when OPENMED_TIMEOUT is invalid', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_TIMEOUT = 'invalid';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.timeout).toBe(30000);
    });
  });

  // ============================================
  // CONFIDENCE THRESHOLD TESTS
  // ============================================

  describe('confidenceThreshold configuration', () => {
    it('should use default confidenceThreshold of 0.7 when not set', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.confidenceThreshold).toBe(0.7);
    });

    it('should parse numeric OPENMED_CONFIDENCE_THRESHOLD correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_CONFIDENCE_THRESHOLD = '0.85';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.confidenceThreshold).toBe(0.85);
    });

    it('should handle confidenceThreshold of 0', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_CONFIDENCE_THRESHOLD = '0';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.confidenceThreshold).toBe(0);
    });

    it('should handle confidenceThreshold of 1', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_CONFIDENCE_THRESHOLD = '1';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.confidenceThreshold).toBe(1);
    });

    it('should handle fractional confidenceThreshold', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_CONFIDENCE_THRESHOLD = '0.95';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.confidenceThreshold).toBe(0.95);
    });

    it('should use default when OPENMED_CONFIDENCE_THRESHOLD is empty', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_CONFIDENCE_THRESHOLD = '';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.confidenceThreshold).toBe(0.7);
    });

    it('should use default when OPENMED_CONFIDENCE_THRESHOLD is invalid', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_CONFIDENCE_THRESHOLD = 'high';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.confidenceThreshold).toBe(0.7);
    });
  });

  // ============================================
  // ENABLED FLAG TESTS
  // ============================================

  describe('enabled configuration', () => {
    it('should default to true when OPENMED_ENABLED is not set', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(true);
    });

    it('should parse OPENMED_ENABLED=true correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = 'true';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(true);
    });

    it('should parse OPENMED_ENABLED=false correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = 'false';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(false);
    });

    it('should parse OPENMED_ENABLED=TRUE (uppercase) correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = 'TRUE';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(true);
    });

    it('should parse OPENMED_ENABLED=FALSE (uppercase) correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = 'FALSE';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(false);
    });

    it('should parse OPENMED_ENABLED=1 as true', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = '1';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(true);
    });

    it('should parse OPENMED_ENABLED=0 as false', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = '0';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(false);
    });

    it('should default to true when OPENMED_ENABLED is empty', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = '';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(true);
    });

    it('should handle OPENMED_ENABLED with whitespace', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_ENABLED = '  false  ';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.enabled).toBe(false);
    });
  });

  // ============================================
  // HEALTH CHECK ON INIT TESTS
  // ============================================

  describe('healthCheckOnInit configuration', () => {
    it('should default to true when OPENMED_HEALTH_CHECK_ON_INIT is not set', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.healthCheckOnInit).toBe(true);
    });

    it('should parse OPENMED_HEALTH_CHECK_ON_INIT=true correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_HEALTH_CHECK_ON_INIT = 'true';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.healthCheckOnInit).toBe(true);
    });

    it('should parse OPENMED_HEALTH_CHECK_ON_INIT=false correctly', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_HEALTH_CHECK_ON_INIT = 'false';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.healthCheckOnInit).toBe(false);
    });

    it('should parse OPENMED_HEALTH_CHECK_ON_INIT=0 as false', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_HEALTH_CHECK_ON_INIT = '0';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.healthCheckOnInit).toBe(false);
    });

    it('should parse OPENMED_HEALTH_CHECK_ON_INIT=1 as true', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_HEALTH_CHECK_ON_INIT = '1';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.healthCheckOnInit).toBe(true);
    });
  });

  // ============================================
  // CONFIGURATION SHAPE TESTS
  // ============================================

  describe('configuration shape', () => {
    it('should return configuration with all expected properties', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(config).toHaveProperty('serviceUrl');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('confidenceThreshold');
      expect(config).toHaveProperty('healthCheckOnInit');
    });

    it('should have string type for serviceUrl', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(typeof config.serviceUrl).toBe('string');
    });

    it('should have number type for timeout', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(typeof config.timeout).toBe('number');
    });

    it('should have boolean type for enabled', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(typeof config.enabled).toBe('boolean');
    });

    it('should have number type for confidenceThreshold', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(typeof config.confidenceThreshold).toBe('number');
    });

    it('should have boolean type for healthCheckOnInit', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(typeof config.healthCheckOnInit).toBe('boolean');
    });
  });

  // ============================================
  // COMPLETE CONFIGURATION TESTS
  // ============================================

  describe('complete configuration', () => {
    it('should return complete configuration with all custom values', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_SERVICE_URL =
        'https://custom-openmed.example.com:9000';
      process.env.OPENMED_TIMEOUT = '45000';
      process.env.OPENMED_ENABLED = 'true';
      process.env.OPENMED_CONFIDENCE_THRESHOLD = '0.9';
      process.env.OPENMED_HEALTH_CHECK_ON_INIT = 'false';

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('https://custom-openmed.example.com:9000');
      expect(config.timeout).toBe(45000);
      expect(config.enabled).toBe(true);
      expect(config.confidenceThreshold).toBe(0.9);
      expect(config.healthCheckOnInit).toBe(false);
    });

    it('should return complete configuration with all default values', () => {
      // Arrange
      if (!openmedConfig) return;

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('http://localhost:8001');
      expect(config.timeout).toBe(30000);
      expect(config.enabled).toBe(true);
      expect(config.confidenceThreshold).toBe(0.7);
      expect(config.healthCheckOnInit).toBe(true);
    });

    it('should handle mixed custom and default values', () => {
      // Arrange
      if (!openmedConfig) return;
      process.env.OPENMED_SERVICE_URL = 'http://custom-url:8001';
      // Leave timeout, enabled, confidenceThreshold, healthCheckOnInit as defaults

      // Act
      const config = openmedConfig();

      // Assert
      expect(config.serviceUrl).toBe('http://custom-url:8001');
      expect(config.timeout).toBe(30000);
      expect(config.enabled).toBe(true);
      expect(config.confidenceThreshold).toBe(0.7);
      expect(config.healthCheckOnInit).toBe(true);
    });
  });

  // ============================================
  // CONFIGURATION INTERFACE TESTS
  // ============================================

  describe('OpenMedConfig interface', () => {
    it('should export OpenMedConfig interface type', async () => {
      // This test verifies the interface is exported
      // The actual type checking is done by TypeScript at compile time
      if (!openmedConfig) return;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require('./openmed.config');
      expect(module).toHaveProperty('openmedConfig');
      // If OpenMedConfig interface is exported, it will be available
      // Type checking is compile-time only in TypeScript
    });
  });
});
