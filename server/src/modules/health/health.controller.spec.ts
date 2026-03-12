import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { LlmHealthIndicator } from './llm.health';
import { OpenMedHealthIndicator } from './openmed.health';

/**
 * TDD Tests for HealthController
 *
 * These tests define the expected behavior of HealthController:
 * 1. GET /health - Full health check including database
 * 2. GET /health/live - Liveness probe (no external deps)
 * 3. GET /health/ready - Readiness probe (checks database)
 */

// Type definitions for test
interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; message?: string }>;
  details?: Record<string, { status: string; message?: string }>;
}

// Define mock types
interface MockHealthCheckService {
  check: jest.Mock;
}

interface MockHealthIndicator {
  isHealthy: jest.Mock;
}

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService: MockHealthCheckService;
  let mockPrismaHealthIndicator: MockHealthIndicator;
  let mockLlmHealthIndicator: MockHealthIndicator;
  let mockOpenMedHealthIndicator: MockHealthIndicator;

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockHealthCheckService = {
      check: jest.fn(),
    };

    mockPrismaHealthIndicator = {
      isHealthy: jest.fn(),
    };

    mockLlmHealthIndicator = {
      isHealthy: jest.fn(),
    };

    mockOpenMedHealthIndicator = {
      isHealthy: jest.fn(),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
        {
          provide: LlmHealthIndicator,
          useValue: mockLlmHealthIndicator,
        },
        {
          provide: OpenMedHealthIndicator,
          useValue: mockOpenMedHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('module setup', () => {
    it('should have @nestjs/terminus HealthCheckService available', () => {
      expect(HealthCheckService).toBeDefined();
    });

    it('should export HealthController class', () => {
      expect(HealthController).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('GET /health (check method)', () => {
    it('should have a check method', () => {
      expect(typeof controller.check).toBe('function');
    });

    it('should return healthy status when all checks pass', async () => {
      // Arrange
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
        },
      };
      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual(healthyResult);
      expect(result.status).toBe('ok');
    });

    it('should return error status when database check fails', async () => {
      // Arrange
      const unhealthyResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection failed' },
        },
        details: {
          database: { status: 'down', message: 'Connection failed' },
        },
      };
      mockHealthCheckService.check.mockResolvedValue(unhealthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('database');
    });

    it('should include database health indicator in check', async () => {
      // Arrange
      const healthyDbResult = { database: { status: 'up' } };
      mockPrismaHealthIndicator.isHealthy.mockResolvedValue(healthyDbResult);
      mockHealthCheckService.check.mockImplementation(
        async (
          indicators: Array<() => Promise<Record<string, { status: string }>>>,
        ) => {
          const results = await Promise.all(indicators.map((fn) => fn()));
          return {
            status: 'ok',
            info: Object.assign({}, ...results) as Record<
              string,
              { status: string }
            >,
            error: {},
            details: Object.assign({}, ...results) as Record<
              string,
              { status: string }
            >,
          };
        },
      );

      // Act
      await controller.check();

      // Assert
      expect(mockPrismaHealthIndicator.isHealthy).toHaveBeenCalledWith(
        'database',
      );
    });
  });

  describe('GET /health/live (live method)', () => {
    it('should have a live method', () => {
      expect(typeof controller.live).toBe('function');
    });

    it('should return ok status for liveness probe', () => {
      // Act
      const result = controller.live();

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });

    it('should return quickly without checking external dependencies', () => {
      // Arrange
      const startTime = Date.now();

      // Act
      controller.live();
      const duration = Date.now() - startTime;

      // Assert - liveness should be fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should not call database health check for liveness', () => {
      // Act
      controller.live();

      // Assert
      expect(mockPrismaHealthIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready (ready method)', () => {
    it('should have a ready method', () => {
      expect(typeof controller.ready).toBe('function');
    });

    it('should return ok status when database is ready', async () => {
      // Arrange
      const readyResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
        },
      };
      mockHealthCheckService.check.mockResolvedValue(readyResult);

      // Act
      const result = await controller.ready();

      // Assert
      expect(result).toEqual(readyResult);
      expect(result.status).toBe('ok');
    });

    it('should return error status when database is not ready', async () => {
      // Arrange
      const notReadyResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Not connected' },
        },
        details: {
          database: { status: 'down', message: 'Not connected' },
        },
      };
      mockHealthCheckService.check.mockResolvedValue(notReadyResult);

      // Act
      const result = await controller.ready();

      // Assert
      expect(result.status).toBe('error');
    });

    it('should check database connectivity for readiness', async () => {
      // Arrange
      const healthyDbResult = { database: { status: 'up' } };
      mockPrismaHealthIndicator.isHealthy.mockResolvedValue(healthyDbResult);
      mockHealthCheckService.check.mockImplementation(
        async (
          indicators: Array<() => Promise<Record<string, { status: string }>>>,
        ) => {
          const results = await Promise.all(indicators.map((fn) => fn()));
          return {
            status: 'ok',
            info: Object.assign({}, ...results) as Record<
              string,
              { status: string }
            >,
            error: {},
            details: Object.assign({}, ...results) as Record<
              string,
              { status: string }
            >,
          };
        },
      );

      // Act
      await controller.ready();

      // Assert
      expect(mockPrismaHealthIndicator.isHealthy).toHaveBeenCalled();
    });
  });

  describe('response format', () => {
    it('should return HealthCheckResult with required properties', async () => {
      // Arrange
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('details');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple simultaneous health checks', async () => {
      // Arrange
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      // Act
      const results = await Promise.all([
        controller.check(),
        controller.check(),
        controller.check(),
      ]);

      // Assert
      results.forEach((result: HealthCheckResult) => {
        expect(result.status).toBe('ok');
      });
    });

    it('should propagate errors from HealthCheckService', async () => {
      // Arrange
      mockHealthCheckService.check.mockRejectedValue(
        new Error('Service unavailable'),
      );

      // Act & Assert
      await expect(controller.check()).rejects.toThrow('Service unavailable');
    });
  });
});
