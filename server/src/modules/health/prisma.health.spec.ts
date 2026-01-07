import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError, HealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * TDD Tests for PrismaHealthIndicator
 *
 * These tests define the expected behavior of PrismaHealthIndicator:
 * 1. Should extend HealthIndicator from @nestjs/terminus
 * 2. Should check database connectivity using PrismaService
 * 3. Should return healthy status when DB query succeeds
 * 4. Should throw HealthCheckError when DB query fails
 */

// Define mock types
interface MockPrismaService {
  $queryRaw: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
}

// Define HealthCheckError causes type
interface HealthCheckErrorWithCauses extends HealthCheckError {
  causes: Record<string, { status: string }>;
}

describe('PrismaHealthIndicator', () => {
  let healthIndicator: PrismaHealthIndicator;
  let mockPrismaService: MockPrismaService;

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrismaService = {
      $queryRaw: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    healthIndicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  describe('module setup', () => {
    it('should have @nestjs/terminus installed', () => {
      expect(HealthCheckError).toBeDefined();
      expect(HealthIndicator).toBeDefined();
    });

    it('should export PrismaHealthIndicator class', () => {
      expect(PrismaHealthIndicator).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(healthIndicator).toBeDefined();
    });

    it('should extend HealthIndicator', () => {
      expect(healthIndicator).toBeInstanceOf(HealthIndicator);
    });
  });

  describe('isHealthy', () => {
    const indicatorKey = 'database';

    it('should return healthy status when database query succeeds', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await healthIndicator.isHealthy(indicatorKey);

      // Assert
      expect(result).toEqual({
        [indicatorKey]: {
          status: 'up',
        },
      });
    });

    it('should call PrismaService.$queryRaw to check connection', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      await healthIndicator.isHealthy(indicatorKey);

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should throw HealthCheckError when database query fails', async () => {
      // Arrange
      const dbError = new Error('Connection refused');
      mockPrismaService.$queryRaw.mockRejectedValue(dbError);

      // Act & Assert
      await expect(healthIndicator.isHealthy(indicatorKey)).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should include error message in HealthCheckError causes', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      mockPrismaService.$queryRaw.mockRejectedValue(dbError);

      // Act & Assert
      try {
        await healthIndicator.isHealthy(indicatorKey);
        fail('Expected HealthCheckError to be thrown');
      } catch (error: unknown) {
        const healthError = error as HealthCheckErrorWithCauses;
        expect(healthError).toBeInstanceOf(HealthCheckError);
        expect(healthError.causes).toHaveProperty(indicatorKey);
        expect(healthError.causes[indicatorKey].status).toBe('down');
      }
    });

    it('should use the provided indicator key in response', async () => {
      // Arrange
      const customKey = 'postgres';
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await healthIndicator.isHealthy(customKey);

      // Assert
      expect(result).toHaveProperty(customKey);
      expect(result[customKey].status).toBe('up');
    });

    it('should handle connection pool exhaustion errors', async () => {
      // Arrange
      const poolError = new Error('Connection pool exhausted');
      mockPrismaService.$queryRaw.mockRejectedValue(poolError);

      // Act & Assert
      await expect(healthIndicator.isHealthy(indicatorKey)).rejects.toThrow(
        HealthCheckError,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle slow database responses', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([{ result: 1 }]), 100);
          }),
      );

      // Act
      const startTime = Date.now();
      await healthIndicator.isHealthy('database');
      const duration = Date.now() - startTime;

      // Assert - should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle null response from database', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue(null);

      // Act & Assert
      // Should still be considered healthy if query doesn't throw
      const result = await healthIndicator.isHealthy('database');
      expect(result.database.status).toBe('up');
    });
  });
});
