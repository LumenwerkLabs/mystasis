import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * TDD Tests for PrismaService
 *
 * These tests define the expected behavior of PrismaService:
 * 1. Should extend PrismaClient from @prisma/client
 * 2. Should implement OnModuleInit to connect on startup
 * 3. Should implement OnModuleDestroy to disconnect on shutdown
 * 4. Should optionally provide enableShutdownHooks for graceful shutdown
 *
 * RED PHASE: These tests will fail until PrismaService is implemented.
 */
describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Restore all mocks to prevent mock states from affecting cleanup
    jest.restoreAllMocks();

    // Clean up any connections
    if (service && typeof service.$disconnect === 'function') {
      try {
        await service.$disconnect();
      } catch {
        // Ignore disconnect errors during cleanup
      }
    }
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend PrismaClient and have $connect method', () => {
      // PrismaService should extend PrismaClient
      expect(typeof service.$connect).toBe('function');
    });

    it('should extend PrismaClient and have $disconnect method', () => {
      expect(typeof service.$disconnect).toBe('function');
    });

    it('should extend PrismaClient and have $queryRaw method', () => {
      expect(typeof service.$queryRaw).toBe('function');
    });
  });

  describe('onModuleInit', () => {
    it('should implement OnModuleInit interface', () => {
      // Verify the service implements onModuleInit
      expect(typeof service.onModuleInit).toBe('function');
    });

    it('should call $connect when module initializes', async () => {
      // Arrange
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate error when connection fails', async () => {
      // Arrange
      const connectionError = new Error('Database connection failed');
      jest.spyOn(service, '$connect').mockRejectedValue(connectionError);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should implement OnModuleDestroy interface', () => {
      // Verify the service implements onModuleDestroy
      expect(typeof service.onModuleDestroy).toBe('function');
    });

    it('should call $disconnect when module is destroyed', async () => {
      // Arrange
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate error when disconnect fails', async () => {
      // Arrange
      const disconnectError = new Error('Disconnect failed');
      jest.spyOn(service, '$disconnect').mockRejectedValue(disconnectError);

      // Act & Assert
      await expect(service.onModuleDestroy()).rejects.toThrow(
        'Disconnect failed',
      );
    });
  });

  describe('enableShutdownHooks (optional)', () => {
    it('should register beforeExit handler when enableShutdownHooks is called', () => {
      // Skip if not implemented - this is an optional feature
      if (typeof service.enableShutdownHooks !== 'function') {
        console.log('enableShutdownHooks not implemented - skipping test');
        return;
      }

      // Arrange
      const mockApp = {
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as INestApplication;

      const processOnSpy = jest.spyOn(process, 'on');

      // Act
      service.enableShutdownHooks(mockApp);

      // Assert
      expect(processOnSpy).toHaveBeenCalledWith(
        'beforeExit',
        expect.any(Function),
      );

      // Cleanup
      processOnSpy.mockRestore();
    });
  });
});
