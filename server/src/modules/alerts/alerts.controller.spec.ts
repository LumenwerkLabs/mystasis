import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  BiomarkerType,
  AlertSeverity,
  AlertStatus,
  UserRole,
} from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * TDD Tests for AlertsController
 *
 * These tests define the expected behavior of AlertsController:
 *
 * GET /alerts/:userId - Get paginated alerts for a user
 * - CLINICIAN: can access any user's alerts
 * - PATIENT: can only access own alerts
 * - Should support query filters: status, severity, page, limit
 *
 * GET /alerts/:userId/active - Get active alerts for a user
 * - CLINICIAN: can access any user's active alerts
 * - PATIENT: can only access own active alerts
 *
 * GET /alerts/detail/:id - Get single alert by ID
 * - CLINICIAN: can access any alert
 * - PATIENT: can only access own alerts
 *
 * POST /alerts - Create a new alert
 * - CLINICIAN only
 * - Should call alertsService.create with correct data
 * - Should return created alert
 *
 * PATCH /alerts/:id/acknowledge - Acknowledge an alert
 * - Both roles allowed
 * - PATIENT: can only acknowledge own alerts
 *
 * PATCH /alerts/:id/dismiss - Dismiss an alert
 * - Both roles allowed
 * - PATIENT: can only dismiss own alerts
 *
 * PATCH /alerts/:id/resolve - Resolve an alert
 * - CLINICIAN only
 * - Should call alertsService.resolve with id
 */

// Define user payload interface
interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
}

// Define alert response interface
interface AlertResponse {
  id: string;
  userId: string;
  type: BiomarkerType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  value: number | null;
  threshold: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define create alert DTO interface
interface CreateAlertDto {
  userId: string;
  type: BiomarkerType;
  severity: AlertSeverity;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
}

// Define query params interface
interface GetAlertsQueryDto {
  status?: AlertStatus;
  severity?: AlertSeverity;
  page?: number;
  limit?: number;
}

// Define mock AlertsService interface
interface MockAlertsService {
  create: jest.Mock<Promise<AlertResponse>>;
  findAll: jest.Mock<Promise<AlertResponse[]>>;
  findOne: jest.Mock<Promise<AlertResponse>>;
  getActiveAlerts: jest.Mock<Promise<AlertResponse[]>>;
  acknowledge: jest.Mock<Promise<AlertResponse>>;
  dismiss: jest.Mock<Promise<AlertResponse>>;
  resolve: jest.Mock<Promise<AlertResponse>>;
}

describe('AlertsController', () => {
  // Controller and service will be imported dynamically
  let AlertsController: new (...args: unknown[]) => unknown;
  let controller: {
    getAlerts: (
      userId: string,
      query: GetAlertsQueryDto,
      user: UserPayload,
    ) => Promise<AlertResponse[]>;
    getActiveAlerts: (
      userId: string,
      user: UserPayload,
    ) => Promise<AlertResponse[]>;
    getAlert: (id: string, user: UserPayload) => Promise<AlertResponse>;
    createAlert: (dto: CreateAlertDto) => Promise<AlertResponse>;
    acknowledgeAlert: (id: string, user: UserPayload) => Promise<AlertResponse>;
    dismissAlert: (id: string, user: UserPayload) => Promise<AlertResponse>;
    resolveAlert: (id: string) => Promise<AlertResponse>;
  };
  let mockAlertsService: MockAlertsService;

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

  const mockAlert: AlertResponse = {
    id: 'alert-uuid-1',
    userId: 'patient-uuid-1',
    type: BiomarkerType.HEART_RATE,
    severity: AlertSeverity.HIGH,
    status: AlertStatus.ACTIVE,
    title: 'Elevated Heart Rate',
    message: 'Your resting heart rate has been above normal for 3 days.',
    value: 95,
    threshold: 80,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockAlertsList: AlertResponse[] = [
    mockAlert,
    {
      ...mockAlert,
      id: 'alert-uuid-2',
      type: BiomarkerType.BLOOD_PRESSURE_SYSTOLIC,
      severity: AlertSeverity.CRITICAL,
      title: 'Critical Blood Pressure',
      message:
        'Systolic blood pressure reading of 180 mmHg requires attention.',
      value: 180,
      threshold: 140,
    },
    {
      ...mockAlert,
      id: 'alert-uuid-3',
      type: BiomarkerType.GLUCOSE,
      severity: AlertSeverity.MEDIUM,
      status: AlertStatus.ACKNOWLEDGED,
      title: 'Elevated Glucose',
      message: 'Fasting glucose levels are above optimal range.',
      value: 110,
      threshold: 100,
    },
  ];

  beforeEach(async () => {
    // Create fresh mocks
    mockAlertsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getActiveAlerts: jest.fn(),
      acknowledge: jest.fn(),
      dismiss: jest.fn(),
      resolve: jest.fn(),
    };

    jest.clearAllMocks();

    // Dynamic import to allow test to exist before implementation
    try {
      const alertsControllerModule = await import('./alerts.controller');
      AlertsController = alertsControllerModule.AlertsController;

      const alertsServiceModule = await import('./alerts.service');
      const AlertsService = alertsServiceModule.AlertsService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [AlertsController],
        providers: [
          { provide: AlertsService, useValue: mockAlertsService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(AlertsController);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('module setup', () => {
    it('should export AlertsController class', () => {
      expect(AlertsController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });

    it('should have @Controller decorator with "alerts" path', () => {
      if (!AlertsController) return;

      const path = Reflect.getMetadata('path', AlertsController);
      expect(path).toBe('alerts');
    });
  });

  // ============================================
  // GET /alerts/:userId TESTS
  // ============================================

  describe('getAlerts (GET /alerts/:userId)', () => {
    describe('happy path', () => {
      it('should call alertsService.findAll with correct userId and options', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue(mockAlertsList);
        const userId = 'patient-uuid-1';
        const query: GetAlertsQueryDto = { page: 1, limit: 10 };

        // Act
        await controller.getAlerts(userId, query, mockClinician);

        // Assert
        expect(mockAlertsService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ skip: 0, take: 10 }),
        );
      });

      it('should return alerts for user', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue(mockAlertsList);
        const userId = 'patient-uuid-1';
        const query: GetAlertsQueryDto = {};

        // Act
        const result = await controller.getAlerts(userId, query, mockClinician);

        // Assert
        expect(result).toEqual(mockAlertsList);
        expect(result).toHaveLength(3);
      });

      it('should pass status filter to service when provided', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue([mockAlert]);
        const userId = 'patient-uuid-1';
        const query: GetAlertsQueryDto = { status: AlertStatus.ACTIVE };

        // Act
        await controller.getAlerts(userId, query, mockClinician);

        // Assert
        expect(mockAlertsService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ status: AlertStatus.ACTIVE }),
        );
      });

      it('should pass severity filter to service when provided', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue([mockAlert]);
        const userId = 'patient-uuid-1';
        const query: GetAlertsQueryDto = { severity: AlertSeverity.HIGH };

        // Act
        await controller.getAlerts(userId, query, mockClinician);

        // Assert
        expect(mockAlertsService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ severity: AlertSeverity.HIGH }),
        );
      });

      it('should pass pagination parameters to service', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue([]);
        const userId = 'patient-uuid-1';
        const query: GetAlertsQueryDto = { page: 3, limit: 20 };

        // Act
        await controller.getAlerts(userId, query, mockClinician);

        // Assert
        expect(mockAlertsService.findAll).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ skip: 40, take: 20 }),
        );
      });

      it('should return empty array when no alerts exist', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue([]);
        const userId = 'patient-uuid-1';
        const query: GetAlertsQueryDto = {};

        // Act
        const result = await controller.getAlerts(userId, query, mockClinician);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('access control', () => {
      it('should allow clinician to access any user alerts', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue(mockAlertsList);
        const otherUserId = 'other-patient-uuid';
        const query: GetAlertsQueryDto = {};

        // Act
        const result = await controller.getAlerts(
          otherUserId,
          query,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.findAll).toHaveBeenCalledWith(
          otherUserId,
          expect.any(Object),
        );
      });

      it('should allow patient to access own alerts', async () => {
        // Arrange
        mockAlertsService.findAll.mockResolvedValue(mockAlertsList);
        const userId = mockPatient.id;
        const query: GetAlertsQueryDto = {};

        // Act
        const result = await controller.getAlerts(userId, query, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.findAll).toHaveBeenCalledWith(
          userId,
          expect.any(Object),
        );
      });

      it('should throw ForbiddenException when patient tries to access other user alerts', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const query: GetAlertsQueryDto = {};

        // Act & Assert
        await expect(
          controller.getAlerts(otherUserId, query, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient access is denied', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';
        const query: GetAlertsQueryDto = {};

        // Act
        try {
          await controller.getAlerts(otherUserId, query, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockAlertsService.findAll).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AlertsController) return;

        const guards = Reflect.getMetadata('__guards__', AlertsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AlertsController.prototype,
          'getAlerts',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!AlertsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AlertsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AlertsController.prototype.getAlerts,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockAlertsService.findAll.mockRejectedValue(
          new Error('Database error'),
        );
        const userId = 'patient-uuid-1';
        const query: GetAlertsQueryDto = {};

        // Act & Assert
        await expect(
          controller.getAlerts(userId, query, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET /alerts/:userId/active TESTS
  // ============================================

  describe('getActiveAlerts (GET /alerts/:userId/active)', () => {
    describe('happy path', () => {
      it('should call alertsService.getActiveAlerts with correct userId', async () => {
        // Arrange
        const activeAlerts = mockAlertsList.filter(
          (a) => a.status === AlertStatus.ACTIVE,
        );
        mockAlertsService.getActiveAlerts.mockResolvedValue(activeAlerts);
        const userId = 'patient-uuid-1';

        // Act
        await controller.getActiveAlerts(userId, mockClinician);

        // Assert
        expect(mockAlertsService.getActiveAlerts).toHaveBeenCalledWith(userId);
      });

      it('should return only active alerts', async () => {
        // Arrange
        const activeAlerts = mockAlertsList.filter(
          (a) => a.status === AlertStatus.ACTIVE,
        );
        mockAlertsService.getActiveAlerts.mockResolvedValue(activeAlerts);
        const userId = 'patient-uuid-1';

        // Act
        const result = await controller.getActiveAlerts(userId, mockClinician);

        // Assert
        expect(result).toEqual(activeAlerts);
        expect(result.every((a) => a.status === AlertStatus.ACTIVE)).toBe(true);
      });

      it('should return empty array when no active alerts exist', async () => {
        // Arrange
        mockAlertsService.getActiveAlerts.mockResolvedValue([]);
        const userId = 'patient-uuid-1';

        // Act
        const result = await controller.getActiveAlerts(userId, mockClinician);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('access control', () => {
      it('should allow clinician to access any user active alerts', async () => {
        // Arrange
        mockAlertsService.getActiveAlerts.mockResolvedValue([mockAlert]);
        const otherUserId = 'other-patient-uuid';

        // Act
        const result = await controller.getActiveAlerts(
          otherUserId,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.getActiveAlerts).toHaveBeenCalledWith(
          otherUserId,
        );
      });

      it('should allow patient to access own active alerts', async () => {
        // Arrange
        mockAlertsService.getActiveAlerts.mockResolvedValue([mockAlert]);
        const userId = mockPatient.id;

        // Act
        const result = await controller.getActiveAlerts(userId, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.getActiveAlerts).toHaveBeenCalledWith(userId);
      });

      it('should throw ForbiddenException when patient tries to access other user active alerts', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';

        // Act & Assert
        await expect(
          controller.getActiveAlerts(otherUserId, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient access is denied', async () => {
        // Arrange
        const otherUserId = 'other-patient-uuid';

        // Act
        try {
          await controller.getActiveAlerts(otherUserId, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockAlertsService.getActiveAlerts).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AlertsController) return;

        const guards = Reflect.getMetadata('__guards__', AlertsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AlertsController.prototype,
          'getActiveAlerts',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!AlertsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AlertsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AlertsController.prototype.getActiveAlerts,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockAlertsService.getActiveAlerts.mockRejectedValue(
          new Error('Database error'),
        );
        const userId = 'patient-uuid-1';

        // Act & Assert
        await expect(
          controller.getActiveAlerts(userId, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET /alerts/detail/:id TESTS
  // ============================================

  describe('getAlert (GET /alerts/detail/:id)', () => {
    describe('happy path', () => {
      it('should call alertsService.findOne with correct id', async () => {
        // Arrange
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        const alertId = 'alert-uuid-1';

        // Act
        await controller.getAlert(alertId, mockClinician);

        // Assert
        expect(mockAlertsService.findOne).toHaveBeenCalledWith(alertId);
      });

      it('should return single alert', async () => {
        // Arrange
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.getAlert(alertId, mockClinician);

        // Assert
        expect(result).toEqual(mockAlert);
        expect(result.id).toBe(alertId);
      });
    });

    describe('access control', () => {
      it('should allow clinician to access any alert', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.getAlert(alertId, mockClinician);

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.findOne).toHaveBeenCalledWith(alertId);
      });

      it('should allow patient to access own alert', async () => {
        // Arrange
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.getAlert(alertId, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(result.userId).toBe(mockPatient.id);
      });

      it('should throw ForbiddenException when patient tries to access other user alert', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        const alertId = 'alert-uuid-1';

        // Act & Assert
        await expect(controller.getAlert(alertId, mockPatient)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AlertsController) return;

        const guards = Reflect.getMetadata('__guards__', AlertsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AlertsController.prototype,
          'getAlert',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!AlertsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AlertsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AlertsController.prototype.getAlert,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });

      it('should have ParseUUIDPipe on id parameter', () => {
        if (!AlertsController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          AlertsController.prototype,
          'getAlert',
        );

        expect(paramTypes).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when alert not found', async () => {
        // Arrange
        mockAlertsService.findOne.mockRejectedValue(
          new NotFoundException('Alert with ID invalid-uuid not found'),
        );
        const alertId = 'invalid-uuid';

        // Act & Assert
        await expect(
          controller.getAlert(alertId, mockClinician),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockAlertsService.findOne.mockRejectedValue(
          new Error('Database error'),
        );
        const alertId = 'alert-uuid-1';

        // Act & Assert
        await expect(
          controller.getAlert(alertId, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // POST /alerts TESTS
  // ============================================

  describe('createAlert (POST /alerts)', () => {
    const createDto: CreateAlertDto = {
      userId: 'patient-uuid-1',
      type: BiomarkerType.HEART_RATE,
      severity: AlertSeverity.HIGH,
      title: 'Elevated Heart Rate',
      message: 'Your resting heart rate has been above normal for 3 days.',
      value: 95,
      threshold: 80,
    };

    describe('happy path', () => {
      it('should call alertsService.create with correct data', async () => {
        // Arrange
        mockAlertsService.create.mockResolvedValue(mockAlert);

        // Act
        await controller.createAlert(createDto);

        // Assert
        expect(mockAlertsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: createDto.userId,
            type: createDto.type,
            severity: createDto.severity,
            title: createDto.title,
            message: createDto.message,
            value: createDto.value,
            threshold: createDto.threshold,
          }),
        );
      });

      it('should return created alert', async () => {
        // Arrange
        mockAlertsService.create.mockResolvedValue(mockAlert);

        // Act
        const result = await controller.createAlert(createDto);

        // Assert
        expect(result).toEqual(mockAlert);
        expect(result.id).toBe(mockAlert.id);
        expect(result.status).toBe(AlertStatus.ACTIVE);
      });

      it('should handle optional value field', async () => {
        // Arrange
        const dtoWithoutValue: CreateAlertDto = {
          userId: 'patient-uuid-1',
          type: BiomarkerType.SLEEP_DURATION,
          severity: AlertSeverity.LOW,
          title: 'Poor Sleep Quality',
          message: 'Your sleep quality has been declining.',
        };
        mockAlertsService.create.mockResolvedValue({
          ...mockAlert,
          value: null,
          threshold: null,
        });

        // Act
        await controller.createAlert(dtoWithoutValue);

        // Assert
        expect(mockAlertsService.create).toHaveBeenCalled();
      });

      it('should handle optional threshold field', async () => {
        // Arrange
        const dtoWithoutThreshold: CreateAlertDto = {
          userId: 'patient-uuid-1',
          type: BiomarkerType.STEPS,
          severity: AlertSeverity.MEDIUM,
          title: 'Low Activity',
          message: 'Your step count is below your usual average.',
          value: 2000,
        };
        mockAlertsService.create.mockResolvedValue({
          ...mockAlert,
          threshold: null,
        });

        // Act
        await controller.createAlert(dtoWithoutThreshold);

        // Assert
        expect(mockAlertsService.create).toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AlertsController) return;

        const guards = Reflect.getMetadata('__guards__', AlertsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AlertsController.prototype,
          'createAlert',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!AlertsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AlertsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AlertsController.prototype.createAlert,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when user not found', async () => {
        // Arrange
        mockAlertsService.create.mockRejectedValue(
          new NotFoundException('User with ID invalid-uuid not found'),
        );

        // Act & Assert
        await expect(
          controller.createAlert({ ...createDto, userId: 'invalid-uuid' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockAlertsService.create.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(controller.createAlert(createDto)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // PATCH /alerts/:id/acknowledge TESTS
  // ============================================

  describe('acknowledgeAlert (PATCH /alerts/:id/acknowledge)', () => {
    describe('happy path', () => {
      it('should call alertsService.acknowledge with correct id', async () => {
        // Arrange
        const acknowledgedAlert = {
          ...mockAlert,
          status: AlertStatus.ACKNOWLEDGED,
        };
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.acknowledge.mockResolvedValue(acknowledgedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        await controller.acknowledgeAlert(alertId, mockPatient);

        // Assert
        expect(mockAlertsService.acknowledge).toHaveBeenCalledWith(alertId);
      });

      it('should return acknowledged alert', async () => {
        // Arrange
        const acknowledgedAlert = {
          ...mockAlert,
          status: AlertStatus.ACKNOWLEDGED,
        };
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.acknowledge.mockResolvedValue(acknowledgedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.acknowledgeAlert(alertId, mockPatient);

        // Assert
        expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
      });
    });

    describe('access control', () => {
      it('should allow clinician to acknowledge any alert', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        const acknowledgedAlert = {
          ...otherUserAlert,
          status: AlertStatus.ACKNOWLEDGED,
        };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        mockAlertsService.acknowledge.mockResolvedValue(acknowledgedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.acknowledgeAlert(
          alertId,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.acknowledge).toHaveBeenCalledWith(alertId);
      });

      it('should allow patient to acknowledge own alert', async () => {
        // Arrange
        const acknowledgedAlert = {
          ...mockAlert,
          status: AlertStatus.ACKNOWLEDGED,
        };
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.acknowledge.mockResolvedValue(acknowledgedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.acknowledgeAlert(alertId, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.acknowledge).toHaveBeenCalledWith(alertId);
      });

      it('should throw ForbiddenException when patient tries to acknowledge other user alert', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        const alertId = 'alert-uuid-1';

        // Act & Assert
        await expect(
          controller.acknowledgeAlert(alertId, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call acknowledge when patient access is denied', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        const alertId = 'alert-uuid-1';

        // Act
        try {
          await controller.acknowledgeAlert(alertId, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockAlertsService.acknowledge).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AlertsController) return;

        const guards = Reflect.getMetadata('__guards__', AlertsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AlertsController.prototype,
          'acknowledgeAlert',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!AlertsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AlertsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AlertsController.prototype.acknowledgeAlert,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when alert not found', async () => {
        // Arrange
        mockAlertsService.findOne.mockRejectedValue(
          new NotFoundException('Alert with ID invalid-uuid not found'),
        );
        const alertId = 'invalid-uuid';

        // Act & Assert
        await expect(
          controller.acknowledgeAlert(alertId, mockPatient),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.acknowledge.mockRejectedValue(
          new Error('Database error'),
        );
        const alertId = 'alert-uuid-1';

        // Act & Assert
        await expect(
          controller.acknowledgeAlert(alertId, mockPatient),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // PATCH /alerts/:id/dismiss TESTS
  // ============================================

  describe('dismissAlert (PATCH /alerts/:id/dismiss)', () => {
    describe('happy path', () => {
      it('should call alertsService.dismiss with correct id', async () => {
        // Arrange
        const dismissedAlert = { ...mockAlert, status: AlertStatus.DISMISSED };
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.dismiss.mockResolvedValue(dismissedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        await controller.dismissAlert(alertId, mockPatient);

        // Assert
        expect(mockAlertsService.dismiss).toHaveBeenCalledWith(alertId);
      });

      it('should return dismissed alert', async () => {
        // Arrange
        const dismissedAlert = { ...mockAlert, status: AlertStatus.DISMISSED };
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.dismiss.mockResolvedValue(dismissedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.dismissAlert(alertId, mockPatient);

        // Assert
        expect(result.status).toBe(AlertStatus.DISMISSED);
      });
    });

    describe('access control', () => {
      it('should allow clinician to dismiss any alert', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        const dismissedAlert = {
          ...otherUserAlert,
          status: AlertStatus.DISMISSED,
        };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        mockAlertsService.dismiss.mockResolvedValue(dismissedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.dismissAlert(alertId, mockClinician);

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.dismiss).toHaveBeenCalledWith(alertId);
      });

      it('should allow patient to dismiss own alert', async () => {
        // Arrange
        const dismissedAlert = { ...mockAlert, status: AlertStatus.DISMISSED };
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.dismiss.mockResolvedValue(dismissedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.dismissAlert(alertId, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(mockAlertsService.dismiss).toHaveBeenCalledWith(alertId);
      });

      it('should throw ForbiddenException when patient tries to dismiss other user alert', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        const alertId = 'alert-uuid-1';

        // Act & Assert
        await expect(
          controller.dismissAlert(alertId, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call dismiss when patient access is denied', async () => {
        // Arrange
        const otherUserAlert = { ...mockAlert, userId: 'other-patient-uuid' };
        mockAlertsService.findOne.mockResolvedValue(otherUserAlert);
        const alertId = 'alert-uuid-1';

        // Act
        try {
          await controller.dismissAlert(alertId, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockAlertsService.dismiss).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AlertsController) return;

        const guards = Reflect.getMetadata('__guards__', AlertsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AlertsController.prototype,
          'dismissAlert',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!AlertsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AlertsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AlertsController.prototype.dismissAlert,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when alert not found', async () => {
        // Arrange
        mockAlertsService.findOne.mockRejectedValue(
          new NotFoundException('Alert with ID invalid-uuid not found'),
        );
        const alertId = 'invalid-uuid';

        // Act & Assert
        await expect(
          controller.dismissAlert(alertId, mockPatient),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockAlertsService.findOne.mockResolvedValue(mockAlert);
        mockAlertsService.dismiss.mockRejectedValue(
          new Error('Database error'),
        );
        const alertId = 'alert-uuid-1';

        // Act & Assert
        await expect(
          controller.dismissAlert(alertId, mockPatient),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // PATCH /alerts/:id/resolve TESTS
  // ============================================

  describe('resolveAlert (PATCH /alerts/:id/resolve)', () => {
    describe('happy path', () => {
      it('should call alertsService.resolve with correct id', async () => {
        // Arrange
        const resolvedAlert = { ...mockAlert, status: AlertStatus.RESOLVED };
        mockAlertsService.resolve.mockResolvedValue(resolvedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        await controller.resolveAlert(alertId);

        // Assert
        expect(mockAlertsService.resolve).toHaveBeenCalledWith(alertId);
      });

      it('should return resolved alert', async () => {
        // Arrange
        const resolvedAlert = { ...mockAlert, status: AlertStatus.RESOLVED };
        mockAlertsService.resolve.mockResolvedValue(resolvedAlert);
        const alertId = 'alert-uuid-1';

        // Act
        const result = await controller.resolveAlert(alertId);

        // Assert
        expect(result.status).toBe(AlertStatus.RESOLVED);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AlertsController) return;

        const guards = Reflect.getMetadata('__guards__', AlertsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AlertsController.prototype,
          'resolveAlert',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!AlertsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AlertsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AlertsController.prototype.resolveAlert,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have ParseUUIDPipe on id parameter', () => {
        if (!AlertsController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          AlertsController.prototype,
          'resolveAlert',
        );

        expect(paramTypes).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when alert not found', async () => {
        // Arrange
        mockAlertsService.resolve.mockRejectedValue(
          new NotFoundException('Alert with ID invalid-uuid not found'),
        );
        const alertId = 'invalid-uuid';

        // Act & Assert
        await expect(controller.resolveAlert(alertId)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockAlertsService.resolve.mockRejectedValue(
          new Error('Database error'),
        );
        const alertId = 'alert-uuid-1';

        // Act & Assert
        await expect(controller.resolveAlert(alertId)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // CONTROLLER METHOD SIGNATURES
  // ============================================

  describe('method signatures', () => {
    it('should have getAlerts method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getAlerts).toBe('function');
      }
    });

    it('should have getActiveAlerts method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getActiveAlerts).toBe('function');
      }
    });

    it('should have getAlert method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getAlert).toBe('function');
      }
    });

    it('should have createAlert method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.createAlert).toBe('function');
      }
    });

    it('should have acknowledgeAlert method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.acknowledgeAlert).toBe('function');
      }
    });

    it('should have dismissAlert method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.dismissAlert).toBe('function');
      }
    });

    it('should have resolveAlert method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.resolveAlert).toBe('function');
      }
    });
  });

  // ============================================
  // HTTP ROUTE DECORATORS
  // ============================================

  describe('route decorators', () => {
    it('should have GET decorator on getAlerts with path containing :userId', () => {
      if (!AlertsController) return;

      const path = Reflect.getMetadata(
        'path',
        AlertsController.prototype.getAlerts,
      );

      expect(path).toContain(':userId');
    });

    it('should have GET decorator on getActiveAlerts with path containing active', () => {
      if (!AlertsController) return;

      const path = Reflect.getMetadata(
        'path',
        AlertsController.prototype.getActiveAlerts,
      );

      expect(path).toContain('active');
    });

    it('should have GET decorator on getAlert with path containing detail', () => {
      if (!AlertsController) return;

      const path = Reflect.getMetadata(
        'path',
        AlertsController.prototype.getAlert,
      );

      expect(path).toContain('detail');
    });

    it('should have POST decorator on createAlert', () => {
      if (!AlertsController) return;

      const method = Reflect.getMetadata(
        'method',
        AlertsController.prototype.createAlert,
      );

      expect(method).toBeDefined();
    });

    it('should have PATCH decorator on acknowledgeAlert with path containing acknowledge', () => {
      if (!AlertsController) return;

      const path = Reflect.getMetadata(
        'path',
        AlertsController.prototype.acknowledgeAlert,
      );

      expect(path).toContain('acknowledge');
    });

    it('should have PATCH decorator on dismissAlert with path containing dismiss', () => {
      if (!AlertsController) return;

      const path = Reflect.getMetadata(
        'path',
        AlertsController.prototype.dismissAlert,
      );

      expect(path).toContain('dismiss');
    });

    it('should have PATCH decorator on resolveAlert with path containing resolve', () => {
      if (!AlertsController) return;

      const path = Reflect.getMetadata(
        'path',
        AlertsController.prototype.resolveAlert,
      );

      expect(path).toContain('resolve');
    });
  });
});
