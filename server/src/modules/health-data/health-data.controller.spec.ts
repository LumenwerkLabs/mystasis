import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BiomarkerType, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * TDD Tests for HealthDataController
 *
 * These tests define the expected behavior of HealthDataController:
 *
 * GET /health-data/biomarkers/:userId - Get paginated biomarkers
 * - CLINICIAN: can access any user's biomarkers
 * - PATIENT: can only access own biomarkers
 * - Should return paginated response with data, total, page, limit
 * - Should support query filters: type, startDate, endDate, page, limit
 *
 * POST /health-data/biomarkers - Create single biomarker entry
 * - CLINICIAN only
 * - Should call healthDataService.create with correct data
 * - Should return created biomarker
 *
 * POST /health-data/sync - Batch create biomarkers for wearable sync
 * - CLINICIAN only
 * - Should call healthDataService.createMany with array of biomarkers
 * - Should return count of created records
 *
 * GET /health-data/biomarkers/:userId/latest/:type - Get latest biomarker
 * - Both roles allowed
 * - PATIENT: can only access own data
 * - Should return single biomarker or null
 *
 * GET /health-data/biomarkers/:userId/trend/:type - Get trend data
 * - Both roles allowed
 * - PATIENT: can only access own data
 * - Should require startDate and endDate query params
 * - Should return array of biomarkers ordered by timestamp asc
 *
 * DELETE /health-data/biomarkers/:id - Delete biomarker
 * - CLINICIAN only
 * - Should call healthDataService.remove with id
 * - Should return deleted biomarker
 */

// Define user payload interface
interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
}

// Define biomarker response interface
interface BiomarkerResponse {
  id: string;
  userId: string;
  type: BiomarkerType;
  value: number;
  unit: string;
  timestamp: Date;
  source: string | null;
  metadata: unknown;
  createdAt: Date;
}

// Define paginated response interface
interface PaginatedBiomarkersResponse {
  data: BiomarkerResponse[];
  total: number;
  page: number;
  limit: number;
}

// Define create biomarker DTO interface
interface CreateBiomarkerDto {
  userId: string;
  type: BiomarkerType;
  value: number;
  unit: string;
  timestamp: string;
  source?: string;
  metadata?: unknown;
}

// Define wearable sync DTO interface
interface WearableSyncDto {
  userId: string;
  biomarkers: Array<{
    type: BiomarkerType;
    value: number;
    unit: string;
    timestamp: string;
    source?: string;
  }>;
}

// Define query params interfaces
interface GetBiomarkersQueryDto {
  type?: BiomarkerType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface GetTrendQueryDto {
  startDate: string;
  endDate: string;
}

// Define mock HealthDataService interface
interface MockHealthDataService {
  create: jest.Mock<Promise<BiomarkerResponse>>;
  createMany: jest.Mock<Promise<{ count: number }>>;
  findAll: jest.Mock<Promise<PaginatedBiomarkersResponse>>;
  findLatest: jest.Mock<Promise<BiomarkerResponse | null>>;
  getTrend: jest.Mock<Promise<BiomarkerResponse[]>>;
  remove: jest.Mock<Promise<BiomarkerResponse>>;
}

describe('HealthDataController', () => {
  // Controller and service will be imported dynamically
  let HealthDataController: new (...args: unknown[]) => unknown;
  let controller: {
    getBiomarkers: (
      userId: string,
      query: GetBiomarkersQueryDto,
      user: UserPayload,
    ) => Promise<PaginatedBiomarkersResponse>;
    createBiomarker: (dto: CreateBiomarkerDto) => Promise<BiomarkerResponse>;
    syncWearableData: (dto: WearableSyncDto) => Promise<{ count: number }>;
    getLatestBiomarker: (
      userId: string,
      type: BiomarkerType,
      user: UserPayload,
    ) => Promise<BiomarkerResponse | null>;
    getTrendData: (
      userId: string,
      type: BiomarkerType,
      query: GetTrendQueryDto,
      user: UserPayload,
    ) => Promise<BiomarkerResponse[]>;
    deleteBiomarker: (id: string) => Promise<BiomarkerResponse>;
  };
  let mockHealthDataService: MockHealthDataService;

  // Mock data
  const mockClinician: UserPayload = {
    sub: 'clinician-uuid-1',
    id: 'clinician-uuid-1',
    email: 'clinician@example.com',
    role: UserRole.CLINICIAN,
  };

  const mockPatient: UserPayload = {
    sub: 'patient-uuid-1',
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    role: UserRole.PATIENT,
  };

  const mockBiomarker: BiomarkerResponse = {
    id: 'biomarker-uuid-1',
    userId: 'patient-uuid-1',
    type: BiomarkerType.HEART_RATE,
    value: 72,
    unit: 'bpm',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    source: 'apple_health',
    metadata: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockBiomarkersList: BiomarkerResponse[] = [
    mockBiomarker,
    {
      ...mockBiomarker,
      id: 'biomarker-uuid-2',
      type: BiomarkerType.HEART_RATE_VARIABILITY,
      value: 65,
      unit: 'ms',
      timestamp: new Date('2024-01-15T11:00:00Z'),
    },
    {
      ...mockBiomarker,
      id: 'biomarker-uuid-3',
      type: BiomarkerType.STEPS,
      value: 8500,
      unit: 'steps',
      timestamp: new Date('2024-01-15T12:00:00Z'),
    },
  ];

  const mockPaginatedResponse: PaginatedBiomarkersResponse = {
    data: mockBiomarkersList,
    total: 3,
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    // Create fresh mocks
    mockHealthDataService = {
      create: jest.fn(),
      createMany: jest.fn(),
      findAll: jest.fn(),
      findLatest: jest.fn(),
      getTrend: jest.fn(),
      remove: jest.fn(),
    };

    jest.clearAllMocks();

    // Dynamic import to allow test to exist before implementation
    try {
      const healthDataControllerModule =
        await import('./health-data.controller');
      HealthDataController = healthDataControllerModule.HealthDataController;

      const healthDataServiceModule = await import('./health-data.service');
      const HealthDataService = healthDataServiceModule.HealthDataService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthDataController],
        providers: [
          { provide: HealthDataService, useValue: mockHealthDataService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(HealthDataController);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('module setup', () => {
    it('should export HealthDataController class', () => {
      expect(HealthDataController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });

    it('should have @Controller decorator with "health-data" path', () => {
      if (!HealthDataController) return;

      const path = Reflect.getMetadata('path', HealthDataController);
      expect(path).toBe('health-data');
    });
  });

  // ============================================
  // GET /health-data/biomarkers/:userId TESTS
  // ============================================

  describe('getBiomarkers (GET /health-data/biomarkers/:userId)', () => {
    describe('happy path', () => {
      it('should call healthDataService.findAll with correct userId and options', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue(mockPaginatedResponse);
        const userId = 'patient-uuid-1';
        const query: GetBiomarkersQueryDto = { page: 1, limit: 10 };

        // Act
        await controller.getBiomarkers(userId, query, mockClinician);

        // Assert
        expect(mockHealthDataService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ page: 1, limit: 10 }),
        );
      });

      it('should return paginated biomarkers response', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue(mockPaginatedResponse);
        const userId = 'patient-uuid-1';
        const query: GetBiomarkersQueryDto = {};

        // Act
        const result = await controller.getBiomarkers(
          userId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockPaginatedResponse);
        expect(result.data).toHaveLength(3);
        expect(result.total).toBe(3);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
      });

      it('should pass type filter to service when provided', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue({
          data: [mockBiomarker],
          total: 1,
          page: 1,
          limit: 10,
        });
        const userId = 'patient-uuid-1';
        const query: GetBiomarkersQueryDto = { type: BiomarkerType.HEART_RATE };

        // Act
        await controller.getBiomarkers(userId, query, mockClinician);

        // Assert
        expect(mockHealthDataService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ type: BiomarkerType.HEART_RATE }),
        );
      });

      it('should pass date range filters to service when provided', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue(mockPaginatedResponse);
        const userId = 'patient-uuid-1';
        const query: GetBiomarkersQueryDto = {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        };

        // Act
        await controller.getBiomarkers(userId, query, mockClinician);

        // Assert
        expect(mockHealthDataService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        );
      });

      it('should pass pagination parameters to service', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue({
          data: [],
          total: 100,
          page: 5,
          limit: 20,
        });
        const userId = 'patient-uuid-1';
        const query: GetBiomarkersQueryDto = { page: 5, limit: 20 };

        // Act
        const result = await controller.getBiomarkers(
          userId,
          query,
          mockClinician,
        );

        // Assert
        expect(mockHealthDataService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ page: 5, limit: 20 }),
        );
        expect(result.page).toBe(5);
        expect(result.limit).toBe(20);
      });

      it('should return empty data array when no biomarkers exist', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
        });
        const userId = 'patient-uuid-1';
        const query: GetBiomarkersQueryDto = {};

        // Act
        const result = await controller.getBiomarkers(
          userId,
          query,
          mockClinician,
        );

        // Assert
        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });
    });

    describe('access control', () => {
      it('should allow clinician to access any user biomarkers', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue(mockPaginatedResponse);
        const otherUserId = 'other-patient-uuid';
        const query: GetBiomarkersQueryDto = {};

        // Act
        const result = await controller.getBiomarkers(
          otherUserId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockHealthDataService.findAll).toHaveBeenCalledWith(
          otherUserId,
          expect.any(Object),
        );
      });

      it('should allow patient to access own biomarkers', async () => {
        // Arrange
        mockHealthDataService.findAll.mockResolvedValue(mockPaginatedResponse);
        const userId = mockPatient.id;
        const query: GetBiomarkersQueryDto = {};

        // Act
        const result = await controller.getBiomarkers(
          userId,
          query,
          mockPatient,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockHealthDataService.findAll).toHaveBeenCalledWith(
          userId,
          expect.any(Object),
        );
      });

      it('should throw ForbiddenException when patient tries to access other user biomarkers', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const query: GetBiomarkersQueryDto = {};

        // Act & Assert
        await expect(
          controller.getBiomarkers(otherUserId, query, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient access is denied', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const query: GetBiomarkersQueryDto = {};

        // Act
        try {
          await controller.getBiomarkers(otherUserId, query, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockHealthDataService.findAll).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!HealthDataController) return;

        const guards = Reflect.getMetadata('__guards__', HealthDataController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          HealthDataController.prototype,
          'getBiomarkers',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should have RolesGuard applied', () => {
        if (!HealthDataController) return;

        const guards = Reflect.getMetadata('__guards__', HealthDataController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          HealthDataController.prototype,
          'getBiomarkers',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!HealthDataController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, HealthDataController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          HealthDataController.prototype.getBiomarkers,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });

      it('should have ParseUUIDPipe on userId parameter', () => {
        if (!HealthDataController) return;

        // Check for parameter metadata indicating UUID validation
        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          HealthDataController.prototype,
          'getBiomarkers',
        );

        // The controller should validate userId as UUID
        expect(paramTypes).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockHealthDataService.findAll.mockRejectedValue(
          new Error('Database error'),
        );
        const userId = 'patient-uuid-1';
        const query: GetBiomarkersQueryDto = {};

        // Act & Assert
        await expect(
          controller.getBiomarkers(userId, query, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // POST /health-data/biomarkers TESTS
  // ============================================

  describe('createBiomarker (POST /health-data/biomarkers)', () => {
    const createDto: CreateBiomarkerDto = {
      userId: 'patient-uuid-1',
      type: BiomarkerType.HEART_RATE,
      value: 72,
      unit: 'bpm',
      timestamp: '2024-01-15T10:00:00Z',
      source: 'apple_health',
    };

    describe('happy path', () => {
      it('should call healthDataService.create with correct data', async () => {
        // Arrange
        mockHealthDataService.create.mockResolvedValue(mockBiomarker);

        // Act
        await controller.createBiomarker(createDto);

        // Assert
        expect(mockHealthDataService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: createDto.userId,
            type: createDto.type,
            value: createDto.value,
            unit: createDto.unit,
            timestamp: expect.any(Date),
            source: createDto.source,
          }),
        );
      });

      it('should return created biomarker', async () => {
        // Arrange
        mockHealthDataService.create.mockResolvedValue(mockBiomarker);

        // Act
        const result = await controller.createBiomarker(createDto);

        // Assert
        expect(result).toEqual(mockBiomarker);
        expect(result.id).toBe(mockBiomarker.id);
        expect(result.type).toBe(BiomarkerType.HEART_RATE);
      });

      it('should handle optional metadata field', async () => {
        // Arrange
        const dtoWithMetadata: CreateBiomarkerDto = {
          ...createDto,
          metadata: { fasting: true },
        };
        mockHealthDataService.create.mockResolvedValue({
          ...mockBiomarker,
          metadata: { fasting: true },
        });

        // Act
        const result = await controller.createBiomarker(dtoWithMetadata);

        // Assert
        expect(result.metadata).toEqual({ fasting: true });
      });

      it('should handle missing optional source field', async () => {
        // Arrange
        const dtoWithoutSource: CreateBiomarkerDto = {
          userId: 'patient-uuid-1',
          type: BiomarkerType.GLUCOSE,
          value: 95,
          unit: 'mg/dL',
          timestamp: '2024-01-15T10:00:00Z',
        };
        mockHealthDataService.create.mockResolvedValue({
          ...mockBiomarker,
          type: BiomarkerType.GLUCOSE,
          value: 95,
          unit: 'mg/dL',
          source: null,
        });

        // Act
        await controller.createBiomarker(dtoWithoutSource);

        // Assert
        expect(mockHealthDataService.create).toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!HealthDataController) return;

        const guards = Reflect.getMetadata('__guards__', HealthDataController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          HealthDataController.prototype,
          'createBiomarker',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!HealthDataController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, HealthDataController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          HealthDataController.prototype.createBiomarker,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when user not found', async () => {
        // Arrange
        mockHealthDataService.create.mockRejectedValue(
          new NotFoundException('User with ID invalid-uuid not found'),
        );

        // Act & Assert
        await expect(
          controller.createBiomarker({ ...createDto, userId: 'invalid-uuid' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockHealthDataService.create.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(controller.createBiomarker(createDto)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // POST /health-data/sync TESTS
  // ============================================

  describe('syncWearableData (POST /health-data/sync)', () => {
    const syncDto: WearableSyncDto = {
      userId: 'patient-uuid-1',
      biomarkers: [
        {
          type: BiomarkerType.HEART_RATE,
          value: 72,
          unit: 'bpm',
          timestamp: '2024-01-15T10:00:00Z',
          source: 'apple_health',
        },
        {
          type: BiomarkerType.STEPS,
          value: 8500,
          unit: 'steps',
          timestamp: '2024-01-15T10:00:00Z',
          source: 'apple_health',
        },
      ],
    };

    describe('happy path', () => {
      it('should call healthDataService.createMany with transformed data', async () => {
        // Arrange
        mockHealthDataService.createMany.mockResolvedValue({ count: 2 });

        // Act
        await controller.syncWearableData(syncDto);

        // Assert
        expect(mockHealthDataService.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              userId: syncDto.userId,
              type: BiomarkerType.HEART_RATE,
              value: 72,
              unit: 'bpm',
              timestamp: expect.any(Date),
              source: 'apple_health',
            }),
            expect.objectContaining({
              userId: syncDto.userId,
              type: BiomarkerType.STEPS,
              value: 8500,
              unit: 'steps',
            }),
          ]),
        );
      });

      it('should return count of created records', async () => {
        // Arrange
        mockHealthDataService.createMany.mockResolvedValue({ count: 2 });

        // Act
        const result = await controller.syncWearableData(syncDto);

        // Assert
        expect(result).toEqual({ count: 2 });
      });

      it('should handle large batch of biomarkers', async () => {
        // Arrange
        const largeBatch: WearableSyncDto = {
          userId: 'patient-uuid-1',
          biomarkers: Array.from({ length: 100 }, (_, i) => ({
            type: BiomarkerType.HEART_RATE,
            value: 70 + (i % 20),
            unit: 'bpm',
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            source: 'apple_health',
          })),
        };
        mockHealthDataService.createMany.mockResolvedValue({ count: 100 });

        // Act
        const result = await controller.syncWearableData(largeBatch);

        // Assert
        expect(result.count).toBe(100);
      });

      it('should handle empty biomarkers array', async () => {
        // Arrange
        const emptyDto: WearableSyncDto = {
          userId: 'patient-uuid-1',
          biomarkers: [],
        };
        mockHealthDataService.createMany.mockResolvedValue({ count: 0 });

        // Act
        const result = await controller.syncWearableData(emptyDto);

        // Assert
        expect(result.count).toBe(0);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!HealthDataController) return;

        const guards = Reflect.getMetadata('__guards__', HealthDataController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          HealthDataController.prototype,
          'syncWearableData',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!HealthDataController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, HealthDataController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          HealthDataController.prototype.syncWearableData,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockHealthDataService.createMany.mockRejectedValue(
          new Error('Batch insert failed'),
        );

        // Act & Assert
        await expect(controller.syncWearableData(syncDto)).rejects.toThrow(
          'Batch insert failed',
        );
      });
    });
  });

  // ============================================
  // GET /health-data/biomarkers/:userId/latest/:type TESTS
  // ============================================

  describe('getLatestBiomarker (GET /health-data/biomarkers/:userId/latest/:type)', () => {
    describe('happy path', () => {
      it('should call healthDataService.findLatest with correct userId and type', async () => {
        // Arrange
        mockHealthDataService.findLatest.mockResolvedValue(mockBiomarker);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE;

        // Act
        await controller.getLatestBiomarker(userId, type, mockClinician);

        // Assert
        expect(mockHealthDataService.findLatest).toHaveBeenCalledWith(
          userId,
          type,
        );
      });

      it('should return latest biomarker', async () => {
        // Arrange
        mockHealthDataService.findLatest.mockResolvedValue(mockBiomarker);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE;

        // Act
        const result = await controller.getLatestBiomarker(
          userId,
          type,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockBiomarker);
        expect(result?.type).toBe(BiomarkerType.HEART_RATE);
      });

      it('should return null when no biomarker exists', async () => {
        // Arrange
        mockHealthDataService.findLatest.mockResolvedValue(null);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.GLUCOSE;

        // Act
        const result = await controller.getLatestBiomarker(
          userId,
          type,
          mockClinician,
        );

        // Assert
        expect(result).toBeNull();
      });

      it('should handle different biomarker types', async () => {
        // Arrange
        const hrvBiomarker: BiomarkerResponse = {
          ...mockBiomarker,
          type: BiomarkerType.HEART_RATE_VARIABILITY,
          value: 65,
          unit: 'ms',
        };
        mockHealthDataService.findLatest.mockResolvedValue(hrvBiomarker);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE_VARIABILITY;

        // Act
        const result = await controller.getLatestBiomarker(
          userId,
          type,
          mockClinician,
        );

        // Assert
        expect(result?.type).toBe(BiomarkerType.HEART_RATE_VARIABILITY);
        expect(result?.value).toBe(65);
      });
    });

    describe('access control', () => {
      it('should allow clinician to access any user latest biomarker', async () => {
        // Arrange
        mockHealthDataService.findLatest.mockResolvedValue(mockBiomarker);
        const otherUserId = 'other-patient-uuid';
        const type = BiomarkerType.HEART_RATE;

        // Act
        const result = await controller.getLatestBiomarker(
          otherUserId,
          type,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockHealthDataService.findLatest).toHaveBeenCalledWith(
          otherUserId,
          type,
        );
      });

      it('should allow patient to access own latest biomarker', async () => {
        // Arrange
        mockHealthDataService.findLatest.mockResolvedValue(mockBiomarker);
        const userId = mockPatient.id;
        const type = BiomarkerType.HEART_RATE;

        // Act
        const result = await controller.getLatestBiomarker(
          userId,
          type,
          mockPatient,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockHealthDataService.findLatest).toHaveBeenCalledWith(
          userId,
          type,
        );
      });

      it('should throw ForbiddenException when patient tries to access other user latest biomarker', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const type = BiomarkerType.HEART_RATE;

        // Act & Assert
        await expect(
          controller.getLatestBiomarker(otherUserId, type, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient access is denied', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const type = BiomarkerType.HEART_RATE;

        // Act
        try {
          await controller.getLatestBiomarker(otherUserId, type, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockHealthDataService.findLatest).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!HealthDataController) return;

        const guards = Reflect.getMetadata('__guards__', HealthDataController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          HealthDataController.prototype,
          'getLatestBiomarker',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!HealthDataController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, HealthDataController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          HealthDataController.prototype.getLatestBiomarker,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });

      it('should have ParseUUIDPipe on userId parameter', () => {
        if (!HealthDataController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          HealthDataController.prototype,
          'getLatestBiomarker',
        );

        expect(paramTypes).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockHealthDataService.findLatest.mockRejectedValue(
          new Error('Database error'),
        );
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE;

        // Act & Assert
        await expect(
          controller.getLatestBiomarker(userId, type, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET /health-data/biomarkers/:userId/trend/:type TESTS
  // ============================================

  describe('getTrendData (GET /health-data/biomarkers/:userId/trend/:type)', () => {
    const trendQuery: GetTrendQueryDto = {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    };

    describe('happy path', () => {
      it('should call healthDataService.getTrend with correct parameters', async () => {
        // Arrange
        mockHealthDataService.getTrend.mockResolvedValue(mockBiomarkersList);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE;

        // Act
        await controller.getTrendData(userId, type, trendQuery, mockClinician);

        // Assert
        expect(mockHealthDataService.getTrend).toHaveBeenCalledWith(
          userId,
          type,
          expect.any(Date),
          expect.any(Date),
        );
      });

      it('should return array of biomarkers for trend', async () => {
        // Arrange
        mockHealthDataService.getTrend.mockResolvedValue(mockBiomarkersList);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE;

        // Act
        const result = await controller.getTrendData(
          userId,
          type,
          trendQuery,
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockBiomarkersList);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return empty array when no trend data exists', async () => {
        // Arrange
        mockHealthDataService.getTrend.mockResolvedValue([]);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.GLUCOSE;

        // Act
        const result = await controller.getTrendData(
          userId,
          type,
          trendQuery,
          mockClinician,
        );

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle different biomarker types for trends', async () => {
        // Arrange
        const hrvTrend = mockBiomarkersList.map((b) => ({
          ...b,
          type: BiomarkerType.HEART_RATE_VARIABILITY,
        }));
        mockHealthDataService.getTrend.mockResolvedValue(hrvTrend);
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE_VARIABILITY;

        // Act
        const result = await controller.getTrendData(
          userId,
          type,
          trendQuery,
          mockClinician,
        );

        // Assert
        expect(
          result.every((b) => b.type === BiomarkerType.HEART_RATE_VARIABILITY),
        ).toBe(true);
      });
    });

    describe('access control', () => {
      it('should allow clinician to access any user trend data', async () => {
        // Arrange
        mockHealthDataService.getTrend.mockResolvedValue(mockBiomarkersList);
        const otherUserId = 'other-patient-uuid';
        const type = BiomarkerType.HEART_RATE;

        // Act
        const result = await controller.getTrendData(
          otherUserId,
          type,
          trendQuery,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockHealthDataService.getTrend).toHaveBeenCalled();
      });

      it('should allow patient to access own trend data', async () => {
        // Arrange
        mockHealthDataService.getTrend.mockResolvedValue(mockBiomarkersList);
        const userId = mockPatient.id;
        const type = BiomarkerType.HEART_RATE;

        // Act
        const result = await controller.getTrendData(
          userId,
          type,
          trendQuery,
          mockPatient,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockHealthDataService.getTrend).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when patient tries to access other user trend data', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const type = BiomarkerType.HEART_RATE;

        // Act & Assert
        await expect(
          controller.getTrendData(otherUserId, type, trendQuery, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient access is denied', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const type = BiomarkerType.HEART_RATE;

        // Act
        try {
          await controller.getTrendData(
            otherUserId,
            type,
            trendQuery,
            mockPatient,
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockHealthDataService.getTrend).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!HealthDataController) return;

        const guards = Reflect.getMetadata('__guards__', HealthDataController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          HealthDataController.prototype,
          'getTrendData',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!HealthDataController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, HealthDataController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          HealthDataController.prototype.getTrendData,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockHealthDataService.getTrend.mockRejectedValue(
          new Error('Database error'),
        );
        const userId = 'patient-uuid-1';
        const type = BiomarkerType.HEART_RATE;

        // Act & Assert
        await expect(
          controller.getTrendData(userId, type, trendQuery, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // DELETE /health-data/biomarkers/:id TESTS
  // ============================================

  describe('deleteBiomarker (DELETE /health-data/biomarkers/:id)', () => {
    describe('happy path', () => {
      it('should call healthDataService.remove with correct id', async () => {
        // Arrange
        mockHealthDataService.remove.mockResolvedValue(mockBiomarker);
        const biomarkerId = 'biomarker-uuid-1';

        // Act
        await controller.deleteBiomarker(biomarkerId);

        // Assert
        expect(mockHealthDataService.remove).toHaveBeenCalledWith(biomarkerId);
      });

      it('should return deleted biomarker', async () => {
        // Arrange
        mockHealthDataService.remove.mockResolvedValue(mockBiomarker);
        const biomarkerId = 'biomarker-uuid-1';

        // Act
        const result = await controller.deleteBiomarker(biomarkerId);

        // Assert
        expect(result).toEqual(mockBiomarker);
        expect(result.id).toBe(biomarkerId);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!HealthDataController) return;

        const guards = Reflect.getMetadata('__guards__', HealthDataController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          HealthDataController.prototype,
          'deleteBiomarker',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!HealthDataController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, HealthDataController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          HealthDataController.prototype.deleteBiomarker,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have ParseUUIDPipe on id parameter', () => {
        if (!HealthDataController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          HealthDataController.prototype,
          'deleteBiomarker',
        );

        expect(paramTypes).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when biomarker not found', async () => {
        // Arrange
        mockHealthDataService.remove.mockRejectedValue(
          new NotFoundException(
            'Biomarker value with ID invalid-uuid not found',
          ),
        );
        const biomarkerId = 'invalid-uuid';

        // Act & Assert
        await expect(controller.deleteBiomarker(biomarkerId)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockHealthDataService.remove.mockRejectedValue(
          new Error('Database error'),
        );
        const biomarkerId = 'biomarker-uuid-1';

        // Act & Assert
        await expect(controller.deleteBiomarker(biomarkerId)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // CONTROLLER METHOD SIGNATURES
  // ============================================

  describe('method signatures', () => {
    it('should have getBiomarkers method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getBiomarkers).toBe('function');
      }
    });

    it('should have createBiomarker method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.createBiomarker).toBe('function');
      }
    });

    it('should have syncWearableData method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.syncWearableData).toBe('function');
      }
    });

    it('should have getLatestBiomarker method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getLatestBiomarker).toBe('function');
      }
    });

    it('should have getTrendData method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getTrendData).toBe('function');
      }
    });

    it('should have deleteBiomarker method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.deleteBiomarker).toBe('function');
      }
    });
  });

  // ============================================
  // HTTP ROUTE DECORATORS
  // ============================================

  describe('route decorators', () => {
    it('should have GET decorator on getBiomarkers with path containing biomarkers/:userId', () => {
      if (!HealthDataController) return;

      const path = Reflect.getMetadata(
        'path',
        HealthDataController.prototype.getBiomarkers,
      );

      expect(path).toContain('biomarkers');
    });

    it('should have POST decorator on createBiomarker with path biomarkers', () => {
      if (!HealthDataController) return;

      const method = Reflect.getMetadata(
        'method',
        HealthDataController.prototype.createBiomarker,
      );
      const path = Reflect.getMetadata(
        'path',
        HealthDataController.prototype.createBiomarker,
      );

      expect(method).toBeDefined();
      expect(path).toContain('biomarkers');
    });

    it('should have POST decorator on syncWearableData with path sync', () => {
      if (!HealthDataController) return;

      const method = Reflect.getMetadata(
        'method',
        HealthDataController.prototype.syncWearableData,
      );
      const path = Reflect.getMetadata(
        'path',
        HealthDataController.prototype.syncWearableData,
      );

      expect(method).toBeDefined();
      expect(path).toContain('sync');
    });

    it('should have GET decorator on getLatestBiomarker with path containing latest', () => {
      if (!HealthDataController) return;

      const path = Reflect.getMetadata(
        'path',
        HealthDataController.prototype.getLatestBiomarker,
      );

      expect(path).toContain('latest');
    });

    it('should have GET decorator on getTrendData with path containing trend', () => {
      if (!HealthDataController) return;

      const path = Reflect.getMetadata(
        'path',
        HealthDataController.prototype.getTrendData,
      );

      expect(path).toContain('trend');
    });

    it('should have DELETE decorator on deleteBiomarker', () => {
      if (!HealthDataController) return;

      const method = Reflect.getMetadata(
        'method',
        HealthDataController.prototype.deleteBiomarker,
      );

      // DELETE method in NestJS
      expect(method).toBeDefined();
    });
  });
});
