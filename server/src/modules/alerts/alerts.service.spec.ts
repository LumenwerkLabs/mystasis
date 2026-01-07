import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  AlertSeverity,
  AlertStatus,
  BiomarkerType,
  Alert,
} from '@prisma/client';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * TDD Tests for AlertsService
 *
 * These tests define the expected behavior of AlertsService:
 * 1. CRUD operations for alerts
 * 2. Status management (dismiss, resolve, acknowledge)
 * 3. Filtering by status and severity
 * 4. Active alert retrieval
 */

// Define mock types for Prisma alert delegate
interface MockAlertDelegate {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

interface MockUserDelegate {
  findUnique: jest.Mock;
}

interface MockPrismaService {
  alert: MockAlertDelegate;
  user: MockUserDelegate;
}

describe('AlertsService', () => {
  let service: AlertsService;
  let mockPrismaService: MockPrismaService;

  // Mock alert data
  const mockAlert: Alert = {
    id: 'alert-uuid-1',
    userId: 'user-uuid-1',
    type: BiomarkerType.HEART_RATE,
    severity: AlertSeverity.HIGH,
    status: AlertStatus.ACTIVE,
    title: 'Elevated Heart Rate',
    message: 'Your heart rate has been elevated for the past 2 hours.',
    value: 105,
    threshold: 100,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockAlerts: Alert[] = [
    mockAlert,
    {
      ...mockAlert,
      id: 'alert-uuid-2',
      severity: AlertSeverity.MEDIUM,
      status: AlertStatus.ACTIVE,
      title: 'Low Activity',
      message: 'You have not met your step goal for 3 days.',
    },
    {
      ...mockAlert,
      id: 'alert-uuid-3',
      status: AlertStatus.DISMISSED,
      title: 'Previous Alert',
    },
  ];

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrismaService = {
      alert: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('module setup', () => {
    it('should export AlertsService class', () => {
      expect(AlertsService).toBeDefined();
    });
  });

  describe('create', () => {
    const createAlertDto = {
      userId: 'user-uuid-1',
      type: BiomarkerType.HEART_RATE,
      severity: AlertSeverity.HIGH,
      title: 'Elevated Heart Rate',
      message: 'Your heart rate has been elevated for the past 2 hours.',
      value: 105,
      threshold: 100,
    };

    it('should create alert with ACTIVE status', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
      });
      mockPrismaService.alert.create.mockResolvedValue(mockAlert);

      // Act
      const result = await service.create(createAlertDto);

      // Assert
      expect(result.status).toBe(AlertStatus.ACTIVE);
      expect(mockPrismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AlertStatus.ACTIVE,
          }) as { status: AlertStatus },
        }),
      );
    });

    it('should associate with correct user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
      });
      mockPrismaService.alert.create.mockResolvedValue(mockAlert);

      // Act
      await service.create(createAlertDto);

      // Assert
      expect(mockPrismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-uuid-1',
          }) as { userId: string },
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createAlertDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.alert.create).not.toHaveBeenCalled();
    });

    it('should validate user exists before creating alert', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
      });
      mockPrismaService.alert.create.mockResolvedValue(mockAlert);

      // Act
      await service.create(createAlertDto);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        select: { id: true },
      });
    });
  });

  describe('findAll', () => {
    const userId = 'user-uuid-1';

    it('should return all alerts for user', async () => {
      // Arrange
      mockPrismaService.alert.findMany.mockResolvedValue(mockAlerts);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }) as { userId: string },
        }),
      );
    });

    it('should filter by status', async () => {
      // Arrange
      const activeAlerts = mockAlerts.filter(
        (a) => a.status === AlertStatus.ACTIVE,
      );
      mockPrismaService.alert.findMany.mockResolvedValue(activeAlerts);

      // Act
      const result = await service.findAll(userId, {
        status: AlertStatus.ACTIVE,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            status: AlertStatus.ACTIVE,
          }) as { userId: string; status: AlertStatus },
        }),
      );
    });

    it('should filter by severity', async () => {
      // Arrange
      const highSeverityAlerts = mockAlerts.filter(
        (a) => a.severity === AlertSeverity.HIGH,
      );
      mockPrismaService.alert.findMany.mockResolvedValue(highSeverityAlerts);

      // Act
      await service.findAll(userId, {
        severity: AlertSeverity.HIGH,
      });

      // Assert
      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            severity: AlertSeverity.HIGH,
          }) as { userId: string; severity: AlertSeverity },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return alert by id', async () => {
      // Arrange
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);

      // Act
      const result = await service.findOne('alert-uuid-1');

      // Assert
      expect(result).toEqual(mockAlert);
      expect(mockPrismaService.alert.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-uuid-1' },
        }),
      );
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrismaService.alert.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update alert status', async () => {
      // Arrange
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrismaService.alert.update.mockResolvedValue({
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
      });

      // Act
      const result = await service.updateStatus(
        'alert-uuid-1',
        AlertStatus.ACKNOWLEDGED,
      );

      // Assert
      expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(mockPrismaService.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-uuid-1' },
          data: { status: AlertStatus.ACKNOWLEDGED },
        }),
      );
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrismaService.alert.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateStatus('nonexistent-id', AlertStatus.ACKNOWLEDGED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('dismiss', () => {
    it('should set status to DISMISSED', async () => {
      // Arrange
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrismaService.alert.update.mockResolvedValue({
        ...mockAlert,
        status: AlertStatus.DISMISSED,
      });

      // Act
      const result = await service.dismiss('alert-uuid-1');

      // Assert
      expect(result.status).toBe(AlertStatus.DISMISSED);
      expect(mockPrismaService.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-uuid-1' },
          data: { status: AlertStatus.DISMISSED },
        }),
      );
    });
  });

  describe('resolve', () => {
    it('should set status to RESOLVED', async () => {
      // Arrange
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrismaService.alert.update.mockResolvedValue({
        ...mockAlert,
        status: AlertStatus.RESOLVED,
      });

      // Act
      const result = await service.resolve('alert-uuid-1');

      // Assert
      expect(result.status).toBe(AlertStatus.RESOLVED);
      expect(mockPrismaService.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-uuid-1' },
          data: { status: AlertStatus.RESOLVED },
        }),
      );
    });
  });

  describe('acknowledge', () => {
    it('should set status to ACKNOWLEDGED', async () => {
      // Arrange
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrismaService.alert.update.mockResolvedValue({
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
      });

      // Act
      const result = await service.acknowledge('alert-uuid-1');

      // Assert
      expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(mockPrismaService.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-uuid-1' },
          data: { status: AlertStatus.ACKNOWLEDGED },
        }),
      );
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only ACTIVE alerts', async () => {
      // Arrange
      const activeAlerts = mockAlerts.filter(
        (a) => a.status === AlertStatus.ACTIVE,
      );
      mockPrismaService.alert.findMany.mockResolvedValue(activeAlerts);

      // Act
      const result = await service.getActiveAlerts('user-uuid-1');

      // Assert
      expect(result).toHaveLength(2);
      result.forEach((alert: Alert) => {
        expect(alert.status).toBe(AlertStatus.ACTIVE);
      });
      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-uuid-1',
            status: AlertStatus.ACTIVE,
          },
        }),
      );
    });
  });
});
