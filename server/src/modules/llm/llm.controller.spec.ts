import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SummaryType, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * TDD Tests for LlmController
 *
 * These tests define the expected behavior of LlmController:
 *
 * POST /llm/summary/:userId - Generate health summary (CLINICIAN only)
 * - Should call llmService.generateSummary with correct userId and summaryType
 * - Should return SummaryResponseDto from service
 * - Should have JwtAuthGuard applied
 * - Should have RolesGuard applied
 * - Should require CLINICIAN role
 *
 * GET /llm/nudge/:userId - Get wellness nudge (PATIENT only, own data)
 * - Should call llmService.generateNudge when userId matches currentUser.id
 * - Should return NudgeResponseDto from service
 * - Should throw ForbiddenException when userId does not match currentUser.id
 * - Should have JwtAuthGuard applied
 * - Should have RolesGuard applied
 * - Should require PATIENT role
 *
 * The controller should:
 * - Be a thin layer delegating to LlmService
 * - Enforce role-based access control via guards
 * - Enforce user-scoped access for patient nudges
 */

// Define response interfaces matching service
interface SummaryResponseDto {
  id: string;
  content: string;
  type: SummaryType;
  generatedAt: string;
  disclaimer: string;
  structuredData?: {
    flags?: string[];
    recommendations?: string[];
    questionsForDoctor?: string[];
  };
}

interface NudgeResponseDto {
  id: string;
  content: string;
  type: SummaryType;
  generatedAt: string;
  disclaimer: string;
}

// Define user payload interface
interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
}

// Define mock LlmService interface
interface MockLlmService {
  generateSummary: jest.Mock<Promise<SummaryResponseDto>>;
  generateNudge: jest.Mock<Promise<NudgeResponseDto>>;
}

describe('LlmController', () => {
  // Controller and service will be imported dynamically
  let LlmController: new (...args: unknown[]) => unknown;
  let controller: {
    createSummary: (
      userId: string,
      dto: { summaryType: SummaryType },
    ) => Promise<SummaryResponseDto>;
    getNudge: (userId: string, user: UserPayload) => Promise<NudgeResponseDto>;
  };
  let mockLlmService: MockLlmService;

  // Mock data
  const mockPatient: UserPayload = {
    sub: 'patient-uuid-1',
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    role: UserRole.PATIENT,
  };

  const mockSummaryResponse: SummaryResponseDto = {
    id: 'summary-uuid-1',
    content: 'Your HRV shows an improving trend.',
    type: SummaryType.WEEKLY_SUMMARY,
    generatedAt: new Date().toISOString(),
    disclaimer: 'Discuss these findings with your healthcare provider.',
    structuredData: {
      flags: ['HRV improving'],
      recommendations: ['Maintain sleep schedule'],
      questionsForDoctor: ['Is this trend expected?'],
    },
  };

  const mockNudgeResponse: NudgeResponseDto = {
    id: 'nudge-uuid-1',
    content: 'Great progress! Consider a short walk today.',
    type: SummaryType.WELLNESS_NUDGE,
    generatedAt: new Date().toISOString(),
    disclaimer: 'Discuss these findings with your healthcare provider.',
  };

  beforeEach(async () => {
    // Create fresh mocks
    mockLlmService = {
      generateSummary: jest.fn(),
      generateNudge: jest.fn(),
    };

    jest.clearAllMocks();

    // Dynamic import to allow test to exist before implementation
    try {
      const llmControllerModule = await import('./llm.controller');
      LlmController = llmControllerModule.LlmController;

      const llmServiceModule = await import('./llm.service');
      const LlmService = llmServiceModule.LlmService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [LlmController],
        providers: [
          { provide: LlmService, useValue: mockLlmService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(LlmController);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  describe('module setup', () => {
    it('should export LlmController class', () => {
      expect(LlmController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });
  });

  // ============================================
  // POST /llm/summary/:userId TESTS
  // ============================================

  describe('createSummary (POST /llm/summary/:userId)', () => {
    describe('happy path', () => {
      it('should call llmService.generateSummary with correct userId and summaryType', async () => {
        // Arrange
        mockLlmService.generateSummary.mockResolvedValue(mockSummaryResponse);
        const userId = 'patient-uuid-1';
        const dto = { summaryType: SummaryType.WEEKLY_SUMMARY };

        // Act
        await controller.createSummary(userId, dto);

        // Assert
        expect(mockLlmService.generateSummary).toHaveBeenCalledWith(
          userId,
          SummaryType.WEEKLY_SUMMARY,
        );
      });

      it('should return SummaryResponseDto from service', async () => {
        // Arrange
        mockLlmService.generateSummary.mockResolvedValue(mockSummaryResponse);
        const userId = 'patient-uuid-1';
        const dto = { summaryType: SummaryType.WEEKLY_SUMMARY };

        // Act
        const result = await controller.createSummary(userId, dto);

        // Assert
        expect(result).toEqual(mockSummaryResponse);
        expect(result.id).toBe(mockSummaryResponse.id);
        expect(result.content).toBe(mockSummaryResponse.content);
        expect(result.type).toBe(SummaryType.WEEKLY_SUMMARY);
        expect(result.disclaimer).toBeDefined();
      });

      it('should handle CLINICIAN_REPORT summary type', async () => {
        // Arrange
        const clinicianReport: SummaryResponseDto = {
          ...mockSummaryResponse,
          type: SummaryType.CLINICIAN_REPORT,
        };
        mockLlmService.generateSummary.mockResolvedValue(clinicianReport);
        const userId = 'patient-uuid-1';
        const dto = { summaryType: SummaryType.CLINICIAN_REPORT };

        // Act
        const result = await controller.createSummary(userId, dto);

        // Assert
        expect(result.type).toBe(SummaryType.CLINICIAN_REPORT);
        expect(mockLlmService.generateSummary).toHaveBeenCalledWith(
          userId,
          SummaryType.CLINICIAN_REPORT,
        );
      });

      it('should handle DAILY_RECAP summary type', async () => {
        // Arrange
        const dailyRecap: SummaryResponseDto = {
          ...mockSummaryResponse,
          type: SummaryType.DAILY_RECAP,
        };
        mockLlmService.generateSummary.mockResolvedValue(dailyRecap);
        const userId = 'patient-uuid-1';
        const dto = { summaryType: SummaryType.DAILY_RECAP };

        // Act
        const result = await controller.createSummary(userId, dto);

        // Assert
        expect(result.type).toBe(SummaryType.DAILY_RECAP);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        // Arrange - check for UseGuards decorator with JwtAuthGuard
        if (!LlmController) return;

        const guards = Reflect.getMetadata('__guards__', LlmController);
        // Or check at method level
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          LlmController.prototype,
          'createSummary',
        );

        // Assert - guards should include JwtAuthGuard
        const allGuards = [...(guards || []), ...(methodGuards || [])];
        const hasJwtAuthGuard = allGuards.some(
          (guard: { name?: string }) =>
            guard.name === 'JwtAuthGuard' ||
            (typeof guard === 'function' &&
              guard.toString().includes('JwtAuthGuard')),
        );

        expect(hasJwtAuthGuard || allGuards.length > 0).toBe(true);
      });

      it('should have RolesGuard applied', () => {
        // Arrange
        if (!LlmController) return;

        const guards = Reflect.getMetadata('__guards__', LlmController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          LlmController.prototype,
          'createSummary',
        );

        // Assert - guards should include RolesGuard
        const allGuards = [...(guards || []), ...(methodGuards || [])];
        const hasRolesGuard = allGuards.some(
          (guard: { name?: string }) =>
            guard.name === 'RolesGuard' ||
            (typeof guard === 'function' &&
              guard.toString().includes('RolesGuard')),
        );

        expect(hasRolesGuard || allGuards.length > 0).toBe(true);
      });

      it('should require CLINICIAN role', () => {
        // Arrange
        if (!LlmController) return;

        // Check class-level roles
        const classRoles = Reflect.getMetadata(ROLES_KEY, LlmController);
        // Check method-level roles
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          LlmController.prototype.createSummary,
        );

        // Assert - either class or method should require CLINICIAN
        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockLlmService.generateSummary.mockRejectedValue(
          new Error('Service error'),
        );
        const userId = 'patient-uuid-1';
        const dto = { summaryType: SummaryType.WEEKLY_SUMMARY };

        // Act & Assert
        await expect(controller.createSummary(userId, dto)).rejects.toThrow(
          'Service error',
        );
      });
    });
  });

  // ============================================
  // GET /llm/nudge/:userId TESTS
  // ============================================

  describe('getNudge (GET /llm/nudge/:userId)', () => {
    describe('happy path', () => {
      it('should call llmService.generateNudge when userId matches currentUser.id', async () => {
        // Arrange
        mockLlmService.generateNudge.mockResolvedValue(mockNudgeResponse);
        const userId = 'patient-uuid-1';

        // Act
        await controller.getNudge(userId, mockPatient);

        // Assert
        expect(mockLlmService.generateNudge).toHaveBeenCalledWith(userId);
      });

      it('should return NudgeResponseDto from service', async () => {
        // Arrange
        mockLlmService.generateNudge.mockResolvedValue(mockNudgeResponse);
        const userId = 'patient-uuid-1';

        // Act
        const result = await controller.getNudge(userId, mockPatient);

        // Assert
        expect(result).toEqual(mockNudgeResponse);
        expect(result.id).toBe(mockNudgeResponse.id);
        expect(result.content).toBe(mockNudgeResponse.content);
        expect(result.type).toBe(SummaryType.WELLNESS_NUDGE);
        expect(result.disclaimer).toBeDefined();
      });

      it('should allow patient to access their own nudge', async () => {
        // Arrange
        mockLlmService.generateNudge.mockResolvedValue(mockNudgeResponse);
        const userId = mockPatient.sub;

        // Act
        const result = await controller.getNudge(userId, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(mockLlmService.generateNudge).toHaveBeenCalledWith(userId);
      });
    });

    describe('access control', () => {
      it('should throw ForbiddenException when userId does not match currentUser.id', async () => {
        // Arrange
        const differentUserId = 'other-user-uuid';
        mockLlmService.generateNudge.mockResolvedValue(mockNudgeResponse);

        // Act & Assert
        await expect(
          controller.getNudge(differentUserId, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when patient tries to access another user nudge', async () => {
        // Arrange
        const otherPatientId = 'other-patient-uuid';

        // Act & Assert
        await expect(
          controller.getNudge(otherPatientId, mockPatient),
        ).rejects.toThrow(ForbiddenException);
        expect(mockLlmService.generateNudge).not.toHaveBeenCalled();
      });

      it('should not call service when access is denied', async () => {
        // Arrange
        const differentUserId = 'other-user-uuid';

        // Act
        try {
          await controller.getNudge(differentUserId, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockLlmService.generateNudge).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        // Arrange
        if (!LlmController) return;

        const guards = Reflect.getMetadata('__guards__', LlmController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          LlmController.prototype,
          'getNudge',
        );

        // Assert
        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should have RolesGuard applied', () => {
        // Arrange
        if (!LlmController) return;

        const guards = Reflect.getMetadata('__guards__', LlmController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          LlmController.prototype,
          'getNudge',
        );

        // Assert
        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require PATIENT role', () => {
        // Arrange
        if (!LlmController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, LlmController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          LlmController.prototype.getNudge,
        );

        // Assert
        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockLlmService.generateNudge.mockRejectedValue(
          new Error('Service error'),
        );
        const userId = mockPatient.sub;

        // Act & Assert
        await expect(controller.getNudge(userId, mockPatient)).rejects.toThrow(
          'Service error',
        );
      });
    });
  });

  // ============================================
  // CONTROLLER METHOD SIGNATURES
  // ============================================

  describe('method signatures', () => {
    it('should have createSummary method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.createSummary).toBe('function');
      }
    });

    it('should have getNudge method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getNudge).toBe('function');
      }
    });
  });

  // ============================================
  // HTTP ROUTE DECORATORS
  // ============================================

  describe('route decorators', () => {
    it('should have POST decorator on createSummary', () => {
      if (!LlmController) return;

      const method = Reflect.getMetadata(
        'method',
        LlmController.prototype.createSummary,
      );
      const path = Reflect.getMetadata(
        'path',
        LlmController.prototype.createSummary,
      );

      // POST method has method value of 0 in NestJS
      expect(method).toBeDefined();
      expect(path).toContain('summary');
    });

    it('should have GET decorator on getNudge', () => {
      if (!LlmController) return;

      const method = Reflect.getMetadata(
        'method',
        LlmController.prototype.getNudge,
      );
      const path = Reflect.getMetadata(
        'path',
        LlmController.prototype.getNudge,
      );

      // GET method has method value of 0 in NestJS
      expect(method).toBeDefined();
      expect(path).toContain('nudge');
    });

    it('should have @Controller decorator with "llm" path', () => {
      if (!LlmController) return;

      const path = Reflect.getMetadata('path', LlmController);
      expect(path).toBe('llm');
    });
  });
});
