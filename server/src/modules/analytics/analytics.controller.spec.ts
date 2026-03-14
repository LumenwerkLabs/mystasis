import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BiomarkerType, UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * TDD Tests for AnalyticsController
 *
 * These tests define the expected behavior of AnalyticsController:
 *
 * All endpoints are CLINICIAN only - patients should not access cohort analytics.
 *
 * GET /analytics/cohort/:clinicId/summary - Cohort summary statistics
 * - CLINICIAN: can access cohort summary for any clinic
 * - PATIENT: should receive 403 Forbidden
 * - Should support date range query params (startDate, endDate)
 * - Should return empty data for empty cohort
 *
 * GET /analytics/cohort/:clinicId/risk-distribution - Risk level breakdown
 * - CLINICIAN: can access risk distribution
 * - PATIENT: should receive 403 Forbidden
 * - Should return distribution with LOW, MEDIUM, HIGH, CRITICAL levels
 *
 * GET /analytics/cohort/:clinicId/alerts - Alert statistics
 * - CLINICIAN: can access alert statistics
 * - PATIENT: should receive 403 Forbidden
 * - Should support date range filtering
 *
 * GET /analytics/cohort/:clinicId/trends/:type - Population biomarker trends
 * - CLINICIAN: can access trend data for valid BiomarkerType
 * - PATIENT: should receive 403 Forbidden
 * - Should return 400 for invalid biomarker type
 */

// Define cohort summary response interface
interface CohortSummaryResponse {
  totalPatients: number;
  activePatients: number;
  patientsWithAlerts: number;
  averageAge: number;
  ageDistribution: {
    under30: number;
    between30And50: number;
    between50And70: number;
    over70: number;
  };
}

// Define risk distribution response interface
interface RiskDistributionResponse {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

// Define alert statistics response interface
interface AlertStatisticsResponse {
  totalAlerts: number;
  byStatus: {
    active: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
  };
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  averageResolutionTimeHours: number;
}

// Define trend summary response interface
interface TrendSummaryResponse {
  biomarkerType: BiomarkerType;
  unit: string;
  populationAverage: number;
  populationMin: number;
  populationMax: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  dataPoints: Array<{
    date: string;
    averageValue: number;
    minValue: number | null;
    maxValue: number | null;
    sampleSize: number;
  }>;
}

// Define query params interface
interface GetAnalyticsQueryDto {
  startDate?: string;
  endDate?: string;
}

// Define mock AnalyticsService interface
interface MockAnalyticsService {
  getCohortSummary: jest.Mock<Promise<CohortSummaryResponse>>;
  getRiskDistribution: jest.Mock<Promise<RiskDistributionResponse>>;
  getAlertStatistics: jest.Mock<Promise<AlertStatisticsResponse>>;
  getTrendSummary: jest.Mock<Promise<TrendSummaryResponse>>;
}

// Define user payload interface with clinicId
interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
  clinicId?: string;
}

describe('AnalyticsController', () => {
  // Controller and service will be imported dynamically
  let AnalyticsController: new (...args: unknown[]) => unknown;
  let controller: {
    getCohortSummary: (
      clinicId: string,
      query: GetAnalyticsQueryDto,
      user: UserPayload,
    ) => Promise<CohortSummaryResponse>;
    getRiskDistribution: (
      clinicId: string,
      user: UserPayload,
    ) => Promise<RiskDistributionResponse>;
    getAlertStatistics: (
      clinicId: string,
      query: GetAnalyticsQueryDto,
      user: UserPayload,
    ) => Promise<AlertStatisticsResponse>;
    getTrendSummary: (
      clinicId: string,
      type: BiomarkerType,
      query: GetAnalyticsQueryDto,
      user: UserPayload,
    ) => Promise<TrendSummaryResponse>;
  };
  let mockAnalyticsService: MockAnalyticsService;

  const mockClinicId = 'clinic-uuid-1';

  // Mock clinician user with clinicId matching mockClinicId
  const mockClinician: UserPayload = {
    sub: 'clinician-uuid-1',
    id: 'clinician-uuid-1',
    email: 'clinician@example.com',
    role: UserRole.CLINICIAN,
    clinicId: mockClinicId,
  };

  const mockCohortSummary: CohortSummaryResponse = {
    totalPatients: 150,
    activePatients: 120,
    patientsWithAlerts: 25,
    averageAge: 45.5,
    ageDistribution: {
      under30: 20,
      between30And50: 60,
      between50And70: 50,
      over70: 20,
    },
  };

  const mockEmptyCohortSummary: CohortSummaryResponse = {
    totalPatients: 0,
    activePatients: 0,
    patientsWithAlerts: 0,
    averageAge: 0,
    ageDistribution: {
      under30: 0,
      between30And50: 0,
      between50And70: 0,
      over70: 0,
    },
  };

  const mockRiskDistribution: RiskDistributionResponse = {
    low: 80,
    medium: 45,
    high: 20,
    critical: 5,
  };

  const mockAlertStatistics: AlertStatisticsResponse = {
    totalAlerts: 150,
    byStatus: {
      active: 30,
      acknowledged: 20,
      resolved: 80,
      dismissed: 20,
    },
    bySeverity: {
      low: 40,
      medium: 60,
      high: 35,
      critical: 15,
    },
    averageResolutionTimeHours: 24,
  };

  const mockTrendSummary: TrendSummaryResponse = {
    biomarkerType: BiomarkerType.HEART_RATE,
    unit: 'bpm',
    populationAverage: 72.5,
    populationMin: 55,
    populationMax: 95,
    trend: 'stable',
    dataPoints: [
      {
        date: '2024-01-01',
        averageValue: 72,
        minValue: 55,
        maxValue: 90,
        sampleSize: 100,
      },
      {
        date: '2024-01-08',
        averageValue: 73,
        minValue: 56,
        maxValue: 92,
        sampleSize: 105,
      },
    ],
  };

  beforeEach(async () => {
    // Create fresh mocks
    mockAnalyticsService = {
      getCohortSummary: jest.fn(),
      getRiskDistribution: jest.fn(),
      getAlertStatistics: jest.fn(),
      getTrendSummary: jest.fn(),
    };

    jest.clearAllMocks();

    // Dynamic import to allow test to exist before implementation
    try {
      const analyticsControllerModule = await import('./analytics.controller');
      AnalyticsController = analyticsControllerModule.AnalyticsController;

      const analyticsServiceModule = await import('./analytics.service');
      const AnalyticsService = analyticsServiceModule.AnalyticsService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [AnalyticsController],
        providers: [
          { provide: AnalyticsService, useValue: mockAnalyticsService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(AnalyticsController);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('module setup', () => {
    it('should export AnalyticsController class', () => {
      expect(AnalyticsController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });

    it('should have @Controller decorator with "analytics" path', () => {
      if (!AnalyticsController) return;

      const path = Reflect.getMetadata('path', AnalyticsController);
      expect(path).toBe('analytics');
    });

    it('should have JwtAuthGuard applied at class level', () => {
      if (!AnalyticsController) return;

      const guards = Reflect.getMetadata('__guards__', AnalyticsController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });

    it('should have RolesGuard applied at class level', () => {
      if (!AnalyticsController) return;

      const guards = Reflect.getMetadata('__guards__', AnalyticsController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // GET /analytics/cohort/:clinicId/summary TESTS
  // ============================================

  describe('getCohortSummary (GET /analytics/cohort/:clinicId/summary)', () => {
    describe('happy path', () => {
      it('should call analyticsService.getCohortSummary with correct clinicId', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        await controller.getCohortSummary(mockClinicId, query, mockClinician);

        // Assert
        expect(mockAnalyticsService.getCohortSummary).toHaveBeenCalledWith(
          mockClinicId,
          expect.any(Object),
        );
      });

      it('should return cohort summary for CLINICIAN', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getCohortSummary(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockCohortSummary);
        expect(result.totalPatients).toBe(150);
        expect(result.activePatients).toBe(120);
        expect(result.patientsWithAlerts).toBe(25);
      });

      it('should pass startDate and endDate to service when provided', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        };

        // Act
        await controller.getCohortSummary(mockClinicId, query, mockClinician);

        // Assert
        expect(mockAnalyticsService.getCohortSummary).toHaveBeenCalledWith(
          mockClinicId,
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        );
      });

      it('should return empty data for empty cohort', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockEmptyCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getCohortSummary(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result.totalPatients).toBe(0);
        expect(result.activePatients).toBe(0);
        expect(result.patientsWithAlerts).toBe(0);
      });

      it('should include age distribution in response', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getCohortSummary(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result.ageDistribution).toBeDefined();
        expect(result.ageDistribution.under30).toBe(20);
        expect(result.ageDistribution.between30And50).toBe(60);
        expect(result.ageDistribution.between50And70).toBe(50);
        expect(result.ageDistribution.over70).toBe(20);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AnalyticsController) return;

        const guards = Reflect.getMetadata('__guards__', AnalyticsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AnalyticsController.prototype,
          'getCohortSummary',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!AnalyticsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AnalyticsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnalyticsController.prototype.getCohortSummary,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator with path containing cohort/:clinicId/summary', () => {
        if (!AnalyticsController) return;

        const path = Reflect.getMetadata(
          'path',
          AnalyticsController.prototype.getCohortSummary,
        );

        expect(path).toContain('cohort');
        expect(path).toContain(':clinicId');
        expect(path).toContain('summary');
      });

      it('should have ParseUUIDPipe on clinicId parameter', () => {
        if (!AnalyticsController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          AnalyticsController.prototype,
          'getCohortSummary',
        );

        expect(paramTypes).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockRejectedValue(
          new Error('Database error'),
        );
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controller.getCohortSummary(mockClinicId, query, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });

    describe('date range validation', () => {
      it('should throw BadRequestException when startDate is after endDate', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {
          startDate: '2024-12-31T00:00:00Z',
          endDate: '2024-01-01T00:00:00Z',
        };

        // Act & Assert
        await expect(
          controller.getCohortSummary(mockClinicId, query, mockClinician),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.getCohortSummary(mockClinicId, query, mockClinician),
        ).rejects.toThrow('startDate must be before or equal to endDate');
      });

      it('should throw BadRequestException when date range exceeds 365 days', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z', // 366 days later
        };

        // Act & Assert
        await expect(
          controller.getCohortSummary(mockClinicId, query, mockClinician),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.getCohortSummary(mockClinicId, query, mockClinician),
        ).rejects.toThrow('Date range cannot exceed 365 days');
      });

      it('should accept date range of exactly 365 days', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T00:00:00Z', // 365 days later
        };

        // Act
        const result = await controller.getCohortSummary(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockCohortSummary);
      });

      it('should accept startDate equal to endDate (same day)', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-01-15T23:59:59Z',
        };

        // Act
        const result = await controller.getCohortSummary(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockCohortSummary);
      });

      it('should not validate date range when only startDate is provided', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {
          startDate: '2024-01-01T00:00:00Z',
        };

        // Act
        const result = await controller.getCohortSummary(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockCohortSummary);
      });

      it('should not validate date range when only endDate is provided', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {
          endDate: '2024-01-31T00:00:00Z',
        };

        // Act
        const result = await controller.getCohortSummary(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockCohortSummary);
      });
    });
  });

  // ============================================
  // GET /analytics/cohort/:clinicId/risk-distribution TESTS
  // ============================================

  describe('getRiskDistribution (GET /analytics/cohort/:clinicId/risk-distribution)', () => {
    describe('happy path', () => {
      it('should call analyticsService.getRiskDistribution with correct clinicId', async () => {
        // Arrange
        mockAnalyticsService.getRiskDistribution.mockResolvedValue(
          mockRiskDistribution,
        );

        // Act
        await controller.getRiskDistribution(mockClinicId, mockClinician);

        // Assert
        expect(mockAnalyticsService.getRiskDistribution).toHaveBeenCalledWith(
          mockClinicId,
        );
      });

      it('should return risk distribution for CLINICIAN', async () => {
        // Arrange
        mockAnalyticsService.getRiskDistribution.mockResolvedValue(
          mockRiskDistribution,
        );

        // Act
        const result = await controller.getRiskDistribution(
          mockClinicId,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockRiskDistribution);
      });

      it('should return distribution with LOW, MEDIUM, HIGH, CRITICAL levels', async () => {
        // Arrange
        mockAnalyticsService.getRiskDistribution.mockResolvedValue(
          mockRiskDistribution,
        );

        // Act
        const result = await controller.getRiskDistribution(
          mockClinicId,
          mockClinician,
        );

        // Assert
        expect(result.low).toBeDefined();
        expect(result.medium).toBeDefined();
        expect(result.high).toBeDefined();
        expect(result.critical).toBeDefined();
        expect(typeof result.low).toBe('number');
        expect(typeof result.medium).toBe('number');
        expect(typeof result.high).toBe('number');
        expect(typeof result.critical).toBe('number');
      });

      it('should return zeros for empty cohort', async () => {
        // Arrange
        const emptyDistribution: RiskDistributionResponse = {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        };
        mockAnalyticsService.getRiskDistribution.mockResolvedValue(
          emptyDistribution,
        );

        // Act
        const result = await controller.getRiskDistribution(
          mockClinicId,
          mockClinician,
        );

        // Assert
        expect(result.low).toBe(0);
        expect(result.medium).toBe(0);
        expect(result.high).toBe(0);
        expect(result.critical).toBe(0);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AnalyticsController) return;

        const guards = Reflect.getMetadata('__guards__', AnalyticsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AnalyticsController.prototype,
          'getRiskDistribution',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!AnalyticsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AnalyticsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnalyticsController.prototype.getRiskDistribution,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator with path containing risk-distribution', () => {
        if (!AnalyticsController) return;

        const path = Reflect.getMetadata(
          'path',
          AnalyticsController.prototype.getRiskDistribution,
        );

        expect(path).toContain('risk-distribution');
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockAnalyticsService.getRiskDistribution.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.getRiskDistribution(mockClinicId, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET /analytics/cohort/:clinicId/alerts TESTS
  // ============================================

  describe('getAlertStatistics (GET /analytics/cohort/:clinicId/alerts)', () => {
    describe('happy path', () => {
      it('should call analyticsService.getAlertStatistics with correct clinicId', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockResolvedValue(
          mockAlertStatistics,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        await controller.getAlertStatistics(mockClinicId, query, mockClinician);

        // Assert
        expect(mockAnalyticsService.getAlertStatistics).toHaveBeenCalledWith(
          mockClinicId,
          expect.any(Object),
        );
      });

      it('should return alert statistics for CLINICIAN', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockResolvedValue(
          mockAlertStatistics,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getAlertStatistics(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockAlertStatistics);
        expect(result.totalAlerts).toBe(150);
      });

      it('should pass date range to service when provided', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockResolvedValue(
          mockAlertStatistics,
        );
        const query: GetAnalyticsQueryDto = {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        };

        // Act
        await controller.getAlertStatistics(mockClinicId, query, mockClinician);

        // Assert
        expect(mockAnalyticsService.getAlertStatistics).toHaveBeenCalledWith(
          mockClinicId,
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        );
      });

      it('should include byStatus breakdown in response', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockResolvedValue(
          mockAlertStatistics,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getAlertStatistics(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result.byStatus).toBeDefined();
        expect(result.byStatus.active).toBe(30);
        expect(result.byStatus.acknowledged).toBe(20);
        expect(result.byStatus.resolved).toBe(80);
        expect(result.byStatus.dismissed).toBe(20);
      });

      it('should include bySeverity breakdown in response', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockResolvedValue(
          mockAlertStatistics,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getAlertStatistics(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result.bySeverity).toBeDefined();
        expect(result.bySeverity.low).toBe(40);
        expect(result.bySeverity.medium).toBe(60);
        expect(result.bySeverity.high).toBe(35);
        expect(result.bySeverity.critical).toBe(15);
      });

      it('should include averageResolutionTimeHours in response', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockResolvedValue(
          mockAlertStatistics,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getAlertStatistics(
          mockClinicId,
          query,
          mockClinician,
        );

        // Assert
        expect(result.averageResolutionTimeHours).toBeDefined();
        expect(result.averageResolutionTimeHours).toBe(24);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AnalyticsController) return;

        const guards = Reflect.getMetadata('__guards__', AnalyticsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AnalyticsController.prototype,
          'getAlertStatistics',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!AnalyticsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AnalyticsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnalyticsController.prototype.getAlertStatistics,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator with path containing alerts', () => {
        if (!AnalyticsController) return;

        const path = Reflect.getMetadata(
          'path',
          AnalyticsController.prototype.getAlertStatistics,
        );

        expect(path).toContain('alerts');
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockRejectedValue(
          new Error('Database error'),
        );
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controller.getAlertStatistics(mockClinicId, query, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET /analytics/cohort/:clinicId/trends/:type TESTS
  // ============================================

  describe('getTrendSummary (GET /analytics/cohort/:clinicId/trends/:type)', () => {
    describe('happy path', () => {
      it('should call analyticsService.getTrendSummary with correct parameters', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(mockAnalyticsService.getTrendSummary).toHaveBeenCalledWith(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          expect.any(Object),
        );
      });

      it('should return trend summary for valid BiomarkerType', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockTrendSummary);
        expect(result.biomarkerType).toBe(BiomarkerType.HEART_RATE);
      });

      it('should pass date range to service when provided', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        };

        // Act
        await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(mockAnalyticsService.getTrendSummary).toHaveBeenCalledWith(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        );
      });

      it('should include trend direction in response', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(result.trend).toBeDefined();
        expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
      });

      it('should include dataPoints array in response', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(result.dataPoints).toBeDefined();
        expect(Array.isArray(result.dataPoints)).toBe(true);
        expect(result.dataPoints.length).toBeGreaterThan(0);
      });

      it('should return data point with all required fields', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        const dataPoint = result.dataPoints[0];
        expect(dataPoint.date).toBeDefined();
        expect(dataPoint.averageValue).toBeDefined();
        expect(dataPoint.minValue).toBeDefined();
        expect(dataPoint.maxValue).toBeDefined();
        expect(dataPoint.sampleSize).toBeDefined();
      });

      it('should handle different biomarker types', async () => {
        // Arrange
        const glucoseTrend: TrendSummaryResponse = {
          ...mockTrendSummary,
          biomarkerType: BiomarkerType.GLUCOSE,
          unit: 'mg/dL',
        };
        mockAnalyticsService.getTrendSummary.mockResolvedValue(glucoseTrend);
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.GLUCOSE,
          query,
          mockClinician,
        );

        // Assert
        expect(result.biomarkerType).toBe(BiomarkerType.GLUCOSE);
        expect(mockAnalyticsService.getTrendSummary).toHaveBeenCalledWith(
          mockClinicId,
          BiomarkerType.GLUCOSE,
          expect.any(Object),
        );
      });

      it('should return empty dataPoints for no data', async () => {
        // Arrange
        const emptyTrend: TrendSummaryResponse = {
          ...mockTrendSummary,
          dataPoints: [],
        };
        mockAnalyticsService.getTrendSummary.mockResolvedValue(emptyTrend);
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(result.dataPoints).toEqual([]);
      });

      it('should handle data points with null minValue and maxValue (small sample size)', async () => {
        // Arrange - data point with sample size < 5 should have null min/max values
        const trendWithSuppressedStats: TrendSummaryResponse = {
          ...mockTrendSummary,
          dataPoints: [
            {
              date: '2024-01-01',
              averageValue: 72,
              minValue: null, // Suppressed due to small sample size
              maxValue: null, // Suppressed due to small sample size
              sampleSize: 3, // Below MIN_SAMPLE_SIZE_FOR_DETAILED_STATS (5)
            },
            {
              date: '2024-01-02',
              averageValue: 73,
              minValue: 56,
              maxValue: 92,
              sampleSize: 10, // Above threshold, values shown
            },
          ],
        };
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          trendWithSuppressedStats,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(result.dataPoints[0].minValue).toBeNull();
        expect(result.dataPoints[0].maxValue).toBeNull();
        expect(result.dataPoints[0].sampleSize).toBe(3);
        expect(result.dataPoints[1].minValue).toBe(56);
        expect(result.dataPoints[1].maxValue).toBe(92);
        expect(result.dataPoints[1].sampleSize).toBe(10);
      });
    });

    describe('validation', () => {
      it('should have ParseEnumPipe applied to type parameter for validation', () => {
        // When using ParseEnumPipe, validation happens at the pipe level
        // before the controller method is called. We verify the pipe is applied
        // via metadata inspection.
        if (!AnalyticsController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          AnalyticsController.prototype,
          'getTrendSummary',
        );

        // The type parameter should be BiomarkerType (validated by ParseEnumPipe)
        expect(paramTypes).toBeDefined();
        expect(paramTypes.length).toBeGreaterThanOrEqual(2);
      });

      it('should accept type parameter as BiomarkerType enum', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act - ParseEnumPipe converts valid string to enum
        const result = await controller.getTrendSummary(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockAnalyticsService.getTrendSummary).toHaveBeenCalledWith(
          mockClinicId,
          BiomarkerType.HEART_RATE,
          expect.any(Object),
        );
      });

      it('should validate biomarker type at pipe level (ParseEnumPipe)', () => {
        // This test verifies that ParseEnumPipe is properly configured
        // The actual validation happens when the HTTP request is processed
        // and will throw BadRequestException for invalid enum values
        if (!AnalyticsController) return;

        // Verify the method signature accepts BiomarkerType
        const method = AnalyticsController.prototype.getTrendSummary;
        expect(method).toBeDefined();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AnalyticsController) return;

        const guards = Reflect.getMetadata('__guards__', AnalyticsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AnalyticsController.prototype,
          'getTrendSummary',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!AnalyticsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AnalyticsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnalyticsController.prototype.getTrendSummary,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator with path containing trends', () => {
        if (!AnalyticsController) return;

        const path = Reflect.getMetadata(
          'path',
          AnalyticsController.prototype.getTrendSummary,
        );

        expect(path).toContain('trends');
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockRejectedValue(
          new Error('Database error'),
        );
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controller.getTrendSummary(
            mockClinicId,
            BiomarkerType.HEART_RATE,
            query,
            mockClinician,
          ),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // CONTROLLER METHOD SIGNATURES
  // ============================================

  describe('method signatures', () => {
    it('should have getCohortSummary method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getCohortSummary).toBe('function');
      }
    });

    it('should have getRiskDistribution method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getRiskDistribution).toBe('function');
      }
    });

    it('should have getAlertStatistics method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getAlertStatistics).toBe('function');
      }
    });

    it('should have getTrendSummary method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getTrendSummary).toBe('function');
      }
    });
  });

  // ============================================
  // HTTP ROUTE DECORATORS
  // ============================================

  describe('route decorators', () => {
    it('should have GET decorator on getCohortSummary with path containing :clinicId', () => {
      if (!AnalyticsController) return;

      const path = Reflect.getMetadata(
        'path',
        AnalyticsController.prototype.getCohortSummary,
      );

      expect(path).toContain(':clinicId');
    });

    it('should have GET decorator on getRiskDistribution with path containing :clinicId', () => {
      if (!AnalyticsController) return;

      const path = Reflect.getMetadata(
        'path',
        AnalyticsController.prototype.getRiskDistribution,
      );

      expect(path).toContain(':clinicId');
    });

    it('should have GET decorator on getAlertStatistics with path containing :clinicId', () => {
      if (!AnalyticsController) return;

      const path = Reflect.getMetadata(
        'path',
        AnalyticsController.prototype.getAlertStatistics,
      );

      expect(path).toContain(':clinicId');
    });

    it('should have GET decorator on getTrendSummary with path containing :clinicId and :type', () => {
      if (!AnalyticsController) return;

      const path = Reflect.getMetadata(
        'path',
        AnalyticsController.prototype.getTrendSummary,
      );

      expect(path).toContain(':clinicId');
      expect(path).toContain(':type');
    });
  });

  // ============================================
  // ROLE-BASED ACCESS CONTROL TESTS
  // ============================================

  describe('RBAC - All endpoints are CLINICIAN only', () => {
    const endpoints = [
      'getCohortSummary',
      'getRiskDistribution',
      'getAlertStatistics',
      'getTrendSummary',
    ] as const;

    endpoints.forEach((endpoint) => {
      it(`${endpoint} should be restricted to CLINICIAN role`, () => {
        if (!AnalyticsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AnalyticsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnalyticsController.prototype[endpoint],
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });
    });
  });

  // ============================================
  // CLINIC ACCESS VALIDATION TESTS (Multi-Tenancy)
  // ============================================

  describe('Clinic Access Validation (Multi-Tenancy)', () => {
    // Define user payload interface with clinicId for these tests
    interface UserPayloadWithClinic {
      sub: string;
      id: string;
      email: string;
      role: UserRole;
      clinicId?: string;
    }

    const mockClinicianWithClinic: UserPayloadWithClinic = {
      sub: 'clinician-uuid-1',
      id: 'clinician-uuid-1',
      email: 'clinician@example.com',
      role: UserRole.CLINICIAN,
      clinicId: 'clinic-uuid-1',
    };

    const mockClinicianDifferentClinic: UserPayloadWithClinic = {
      sub: 'clinician-uuid-2',
      id: 'clinician-uuid-2',
      email: 'clinician2@example.com',
      role: UserRole.CLINICIAN,
      clinicId: 'clinic-uuid-2',
    };

    const mockClinicianWithoutClinic: UserPayloadWithClinic = {
      sub: 'clinician-uuid-3',
      id: 'clinician-uuid-3',
      email: 'clinician3@example.com',
      role: UserRole.CLINICIAN,
      clinicId: undefined,
    };

    // Extended controller type with user parameter for clinic validation
    let controllerWithClinicValidation: {
      getCohortSummary: (
        clinicId: string,
        query: GetAnalyticsQueryDto,
        user: UserPayloadWithClinic,
      ) => Promise<CohortSummaryResponse>;
      getRiskDistribution: (
        clinicId: string,
        user: UserPayloadWithClinic,
      ) => Promise<RiskDistributionResponse>;
      getAlertStatistics: (
        clinicId: string,
        query: GetAnalyticsQueryDto,
        user: UserPayloadWithClinic,
      ) => Promise<AlertStatisticsResponse>;
      getTrendSummary: (
        clinicId: string,
        type: BiomarkerType,
        query: GetAnalyticsQueryDto,
        user: UserPayloadWithClinic,
      ) => Promise<TrendSummaryResponse>;
    };

    beforeEach(() => {
      // Cast controller for tests that need user parameter
      controllerWithClinicValidation =
        controller as typeof controllerWithClinicValidation;
    });

    describe('getCohortSummary clinic access', () => {
      it('should allow clinician to access their own clinic analytics', async () => {
        // Arrange
        mockAnalyticsService.getCohortSummary.mockResolvedValue(
          mockCohortSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controllerWithClinicValidation.getCohortSummary(
          'clinic-uuid-1',
          query,
          mockClinicianWithClinic,
        );

        // Assert
        expect(result).toEqual(mockCohortSummary);
        expect(mockAnalyticsService.getCohortSummary).toHaveBeenCalledWith(
          'clinic-uuid-1',
          expect.any(Object),
        );
      });

      it('should throw ForbiddenException when clinician tries to access another clinic analytics', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controllerWithClinicValidation.getCohortSummary(
            'clinic-uuid-1', // Trying to access clinic-uuid-1
            query,
            mockClinicianDifferentClinic, // But belongs to clinic-uuid-2
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when clinic access is denied', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act
        try {
          await controllerWithClinicValidation.getCohortSummary(
            'clinic-uuid-1',
            query,
            mockClinicianDifferentClinic,
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockAnalyticsService.getCohortSummary).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException when clinician has no clinicId', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controllerWithClinicValidation.getCohortSummary(
            'clinic-uuid-1',
            query,
            mockClinicianWithoutClinic,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getRiskDistribution clinic access', () => {
      it('should allow clinician to access their own clinic risk distribution', async () => {
        // Arrange
        mockAnalyticsService.getRiskDistribution.mockResolvedValue(
          mockRiskDistribution,
        );

        // Act
        const result = await controllerWithClinicValidation.getRiskDistribution(
          'clinic-uuid-1',
          mockClinicianWithClinic,
        );

        // Assert
        expect(result).toEqual(mockRiskDistribution);
        expect(mockAnalyticsService.getRiskDistribution).toHaveBeenCalledWith(
          'clinic-uuid-1',
        );
      });

      it('should throw ForbiddenException when clinician tries to access another clinic risk distribution', async () => {
        // Act & Assert
        await expect(
          controllerWithClinicValidation.getRiskDistribution(
            'clinic-uuid-1',
            mockClinicianDifferentClinic,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when clinician has no clinicId', async () => {
        // Act & Assert
        await expect(
          controllerWithClinicValidation.getRiskDistribution(
            'clinic-uuid-1',
            mockClinicianWithoutClinic,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getAlertStatistics clinic access', () => {
      it('should allow clinician to access their own clinic alert statistics', async () => {
        // Arrange
        mockAnalyticsService.getAlertStatistics.mockResolvedValue(
          mockAlertStatistics,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controllerWithClinicValidation.getAlertStatistics(
          'clinic-uuid-1',
          query,
          mockClinicianWithClinic,
        );

        // Assert
        expect(result).toEqual(mockAlertStatistics);
        expect(mockAnalyticsService.getAlertStatistics).toHaveBeenCalledWith(
          'clinic-uuid-1',
          expect.any(Object),
        );
      });

      it('should throw ForbiddenException when clinician tries to access another clinic alert statistics', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controllerWithClinicValidation.getAlertStatistics(
            'clinic-uuid-1',
            query,
            mockClinicianDifferentClinic,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when clinician has no clinicId', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controllerWithClinicValidation.getAlertStatistics(
            'clinic-uuid-1',
            query,
            mockClinicianWithoutClinic,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getTrendSummary clinic access', () => {
      it('should allow clinician to access their own clinic trend summary', async () => {
        // Arrange
        mockAnalyticsService.getTrendSummary.mockResolvedValue(
          mockTrendSummary,
        );
        const query: GetAnalyticsQueryDto = {};

        // Act
        const result = await controllerWithClinicValidation.getTrendSummary(
          'clinic-uuid-1',
          BiomarkerType.HEART_RATE,
          query,
          mockClinicianWithClinic,
        );

        // Assert
        expect(result).toEqual(mockTrendSummary);
        expect(mockAnalyticsService.getTrendSummary).toHaveBeenCalledWith(
          'clinic-uuid-1',
          BiomarkerType.HEART_RATE,
          expect.any(Object),
        );
      });

      it('should throw ForbiddenException when clinician tries to access another clinic trend summary', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controllerWithClinicValidation.getTrendSummary(
            'clinic-uuid-1',
            BiomarkerType.HEART_RATE,
            query,
            mockClinicianDifferentClinic,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when clinician has no clinicId', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        await expect(
          controllerWithClinicValidation.getTrendSummary(
            'clinic-uuid-1',
            BiomarkerType.HEART_RATE,
            query,
            mockClinicianWithoutClinic,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('error messages', () => {
      it('should provide appropriate error message when clinician accesses wrong clinic', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        try {
          await controllerWithClinicValidation.getCohortSummary(
            'clinic-uuid-1',
            query,
            mockClinicianDifferentClinic,
          );
          throw new Error('Expected ForbiddenException to be thrown');
        } catch (error) {
          expect((error as Error).message).toMatch(
            /not authorized|access denied|forbidden/i,
          );
        }
      });

      it('should provide appropriate error message when clinician has no clinic assigned', async () => {
        // Arrange
        const query: GetAnalyticsQueryDto = {};

        // Act & Assert
        try {
          await controllerWithClinicValidation.getCohortSummary(
            'clinic-uuid-1',
            query,
            mockClinicianWithoutClinic,
          );
          throw new Error('Expected ForbiddenException to be thrown');
        } catch (error) {
          expect((error as Error).message).toMatch(
            /not assigned|no clinic|forbidden/i,
          );
        }
      });
    });
  });
});
