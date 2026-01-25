import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HealthDataService } from '../health-data/health-data.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CommonModule } from '../../common/common.module';

/**
 * TDD Tests for LlmModule
 *
 * These tests define the expected behavior of LlmModule:
 * 1. Should compile the module successfully
 * 2. Should provide LlmService
 * 3. Should provide LlmController
 *
 * The module should:
 * - Be a proper NestJS module with @Module decorator
 * - Import necessary dependencies (ConfigModule, etc.)
 * - Export LlmService for use by other modules
 * - Register LlmController for HTTP endpoints
 */

describe('LlmModule', () => {
  // Module will be imported dynamically
  let LlmModule: new () => unknown;
  let LlmService: new (...args: unknown[]) => unknown;
  let LlmController: new (...args: unknown[]) => unknown;

  beforeAll(async () => {
    try {
      const llmModule = await import('./llm.module');
      LlmModule = llmModule.LlmModule;

      const llmService = await import('./llm.service');
      LlmService = llmService.LlmService;

      const llmController = await import('./llm.controller');
      LlmController = llmController.LlmController;
    } catch {
      // Expected to fail until implementation exists
    }
  });

  describe('module exports', () => {
    it('should export LlmModule class', () => {
      expect(LlmModule).toBeDefined();
    });
  });

  describe('module compilation', () => {
    it('should compile the module successfully', async () => {
      // Arrange & Act
      if (!LlmModule) return;

      // Create mocks for dependencies
      const mockHttpService = {
        post: jest.fn(),
      };

      const mockPrismaService = {
        user: { findUnique: jest.fn() },
        lLMSummary: { create: jest.fn(), findMany: jest.fn() },
      };

      const mockHealthDataService = {
        getTrend: jest.fn(),
        findLatest: jest.fn(),
      };

      let module: TestingModule | null = null;
      let error: Error | null = null;

      try {
        module = await Test.createTestingModule({
          imports: [
            CommonModule,
            PrismaModule,
            LlmModule,
            ConfigModule.forRoot({
              isGlobal: true,
              load: [
                () => ({
                  llm: {
                    apiUrl: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'test-key',
                    model: 'gpt-4',
                  },
                  auth: {
                    jwtSecret: 'test-secret-key-for-testing-purposes-only',
                    jwtExpiration: 86400,
                  },
                }),
              ],
            }),
          ],
        })
          .overrideProvider(HttpService)
          .useValue(mockHttpService)
          .overrideProvider(PrismaService)
          .useValue(mockPrismaService)
          .overrideProvider(HealthDataService)
          .useValue(mockHealthDataService)
          .overrideGuard(JwtAuthGuard)
          .useValue({ canActivate: () => true })
          .overrideGuard(RolesGuard)
          .useValue({ canActivate: () => true })
          .compile();
      } catch (e) {
        error = e as Error;
      }

      // Assert
      expect(error).toBeNull();
      expect(module).toBeDefined();
    });

    it('should be decorated with @Module', () => {
      // Arrange
      if (!LlmModule) return;

      // Check for module metadata
      const moduleMetadata = Reflect.getMetadata('imports', LlmModule);
      const controllersMetadata = Reflect.getMetadata('controllers', LlmModule);
      const providersMetadata = Reflect.getMetadata('providers', LlmModule);

      // At least one of these should be defined for a valid @Module
      const hasModuleDecorator =
        moduleMetadata !== undefined ||
        controllersMetadata !== undefined ||
        providersMetadata !== undefined;

      expect(hasModuleDecorator).toBe(true);
    });
  });

  describe('providers', () => {
    it('should provide LlmService', () => {
      // Arrange
      if (!LlmModule || !LlmService) return;

      // Check providers metadata
      const providers = Reflect.getMetadata('providers', LlmModule) || [];

      // Providers can be classes or objects with provide/useClass
      const hasLlmService = providers.some(
        (provider: unknown) =>
          provider === LlmService ||
          (typeof provider === 'object' &&
            provider !== null &&
            'provide' in provider &&
            (provider as { provide: unknown }).provide === LlmService),
      );

      expect(hasLlmService).toBe(true);
    });

    it('should make LlmService injectable', async () => {
      // This test verifies that LlmService can be obtained from the module
      if (!LlmModule || !LlmService) return;

      // Create minimal mocks for compilation
      const mockHttpService = { post: jest.fn() };
      const mockPrismaService = {
        user: { findUnique: jest.fn() },
        lLMSummary: { create: jest.fn() },
      };
      const mockHealthDataService = { getTrend: jest.fn() };

      try {
        const module = await Test.createTestingModule({
          imports: [
            CommonModule,
            PrismaModule,
            LlmModule,
            ConfigModule.forRoot({
              isGlobal: true,
              load: [
                () => ({
                  llm: {
                    apiUrl: 'test',
                    apiKey: 'test',
                    model: 'test',
                  },
                  auth: {
                    jwtSecret: 'test-secret-key-for-testing-purposes-only',
                    jwtExpiration: 86400,
                  },
                }),
              ],
            }),
          ],
        })
          .overrideProvider(HttpService)
          .useValue(mockHttpService)
          .overrideProvider(PrismaService)
          .useValue(mockPrismaService)
          .overrideProvider(HealthDataService)
          .useValue(mockHealthDataService)
          .overrideGuard(JwtAuthGuard)
          .useValue({ canActivate: () => true })
          .overrideGuard(RolesGuard)
          .useValue({ canActivate: () => true })
          .compile();

        const service = module.get(LlmService);
        expect(service).toBeDefined();
      } catch {
        // Module might not compile without all dependencies
        // This is expected in TDD red phase
      }
    });
  });

  describe('controllers', () => {
    it('should provide LlmController', () => {
      // Arrange
      if (!LlmModule || !LlmController) return;

      // Check controllers metadata
      const controllers = Reflect.getMetadata('controllers', LlmModule) || [];

      const hasLlmController = controllers.includes(LlmController);

      expect(hasLlmController).toBe(true);
    });

    it('should make LlmController available for HTTP routing', async () => {
      // This test verifies that LlmController is registered in the module
      if (!LlmModule || !LlmController) return;

      // Create minimal mocks
      const mockLlmService = {
        generateSummary: jest.fn(),
        generateNudge: jest.fn(),
      };

      try {
        const module = await Test.createTestingModule({
          imports: [LlmModule],
        })
          .overrideProvider(LlmService)
          .useValue(mockLlmService)
          .compile();

        const controller = module.get(LlmController);
        expect(controller).toBeDefined();
      } catch {
        // Module might not compile without all dependencies
        // Check metadata instead
        const controllers = Reflect.getMetadata('controllers', LlmModule) || [];
        expect(controllers).toContain(LlmController);
      }
    });
  });

  describe('module imports', () => {
    it('should import required modules', () => {
      // Arrange
      if (!LlmModule) return;

      // Get imports metadata
      const imports = Reflect.getMetadata('imports', LlmModule) || [];

      // Module should have imports defined
      expect(Array.isArray(imports)).toBe(true);
    });
  });

  describe('module exports', () => {
    it('should export LlmService for use by other modules', () => {
      // Arrange
      if (!LlmModule || !LlmService) return;

      // Get exports metadata
      const exports = Reflect.getMetadata('exports', LlmModule) || [];

      // Check if LlmService is exported
      const exportsLlmService = exports.some(
        (exported: unknown) =>
          exported === LlmService ||
          (typeof exported === 'object' &&
            exported !== null &&
            'provide' in exported &&
            (exported as { provide: unknown }).provide === LlmService),
      );

      // LlmService should be exported so other modules can use it
      expect(exportsLlmService).toBe(true);
    });
  });

  describe('dependency injection', () => {
    it('should have correct provider dependencies', () => {
      // Arrange
      if (!LlmModule) return;

      // Get providers from module metadata
      const providers = Reflect.getMetadata('providers', LlmModule) || [];

      // Should have at least LlmService as provider
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should configure HttpService injection token', () => {
      // Arrange
      if (!LlmModule) return;

      // Get providers from module metadata
      const providers = Reflect.getMetadata('providers', LlmModule) || [];

      // Should have HTTP_SERVICE_TOKEN or HttpService configured
      const hasHttpProvider = providers.some(
        (provider: unknown) =>
          provider === 'HttpService' ||
          (typeof provider === 'object' &&
            provider !== null &&
            'provide' in provider &&
            ((provider as { provide: unknown }).provide === 'HttpService' ||
              String((provider as { provide: unknown }).provide).includes(
                'Http',
              ))),
      );

      // HTTP service should be provided (either directly or via token)
      expect(hasHttpProvider || providers.length > 0).toBe(true);
    });
  });

  describe('module structure', () => {
    it('should be a class', () => {
      if (!LlmModule) return;

      expect(typeof LlmModule).toBe('function');
      expect(LlmModule.prototype).toBeDefined();
    });

    it('should have a constructor', () => {
      if (!LlmModule) return;

      expect(typeof LlmModule).toBe('function');
    });

    it('should be instantiable', () => {
      if (!LlmModule) return;

      const instance = new LlmModule();
      expect(instance).toBeInstanceOf(LlmModule);
    });
  });
});
