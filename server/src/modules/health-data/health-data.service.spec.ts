import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BiomarkerType, BiomarkerValue } from '@prisma/client';
import { HealthDataService } from './health-data.service';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * TDD Tests for HealthDataService
 *
 * These tests define the expected behavior of HealthDataService:
 * 1. CRUD operations for biomarker values
 * 2. Batch creation of biomarker data
 * 3. Filtering by type, date range, and user
 * 4. Trend analysis with date ranges
 */

// Define mock types for Prisma biomarkerValue delegate
interface MockBiomarkerValueDelegate {
  create: jest.Mock;
  createMany: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
}

interface MockUserDelegate {
  findUnique: jest.Mock;
}

interface MockPrismaService {
  biomarkerValue: MockBiomarkerValueDelegate;
  user: MockUserDelegate;
}

describe('HealthDataService', () => {
  let service: HealthDataService;
  let mockPrismaService: MockPrismaService;

  // Mock biomarker data
  const mockBiomarkerValue: BiomarkerValue = {
    id: 'biomarker-uuid-1',
    userId: 'user-uuid-1',
    type: BiomarkerType.HEART_RATE,
    value: 72,
    unit: 'bpm',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    source: 'apple_health',
    metadata: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockBiomarkerValues: BiomarkerValue[] = [
    mockBiomarkerValue,
    {
      ...mockBiomarkerValue,
      id: 'biomarker-uuid-2',
      timestamp: new Date('2024-01-15T11:00:00Z'),
      value: 75,
    },
    {
      ...mockBiomarkerValue,
      id: 'biomarker-uuid-3',
      timestamp: new Date('2024-01-15T12:00:00Z'),
      value: 68,
    },
  ];

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrismaService = {
      biomarkerValue: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthDataService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthDataService>(HealthDataService);
  });

  describe('module setup', () => {
    it('should export HealthDataService class', () => {
      expect(HealthDataService).toBeDefined();
    });
  });

  describe('create', () => {
    const createBiomarkerDto = {
      userId: 'user-uuid-1',
      type: BiomarkerType.HEART_RATE,
      value: 72,
      unit: 'bpm',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      source: 'apple_health',
    };

    it('should create a biomarker value', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
      });
      mockPrismaService.biomarkerValue.create.mockResolvedValue(
        mockBiomarkerValue,
      );

      // Act
      const result = await service.create(createBiomarkerDto);

      // Assert
      expect(result).toEqual(mockBiomarkerValue);
      expect(mockPrismaService.biomarkerValue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: BiomarkerType.HEART_RATE,
            value: 72,
            unit: 'bpm',
          }) as { type: BiomarkerType; value: number; unit: string },
        }),
      );
    });

    it('should associate with correct user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
      });
      mockPrismaService.biomarkerValue.create.mockResolvedValue(
        mockBiomarkerValue,
      );

      // Act
      await service.create(createBiomarkerDto);

      // Assert
      expect(mockPrismaService.biomarkerValue.create).toHaveBeenCalledWith(
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
      await expect(service.create(createBiomarkerDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.biomarkerValue.create).not.toHaveBeenCalled();
    });

    it('should validate user exists before creating biomarker', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
      });
      mockPrismaService.biomarkerValue.create.mockResolvedValue(
        mockBiomarkerValue,
      );

      // Act
      await service.create(createBiomarkerDto);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        select: { id: true },
      });
    });
  });

  describe('createMany', () => {
    const createManyDto = [
      {
        userId: 'user-uuid-1',
        type: BiomarkerType.HEART_RATE,
        value: 72,
        unit: 'bpm',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      },
      {
        userId: 'user-uuid-1',
        type: BiomarkerType.HEART_RATE,
        value: 75,
        unit: 'bpm',
        timestamp: new Date('2024-01-15T11:00:00Z'),
      },
      {
        userId: 'user-uuid-1',
        type: BiomarkerType.STEPS,
        value: 5000,
        unit: 'steps',
        timestamp: new Date('2024-01-15T12:00:00Z'),
      },
    ];

    it('should batch create multiple biomarker values', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.createMany.mockResolvedValue({
        count: 3,
      });

      // Act
      await service.createMany(createManyDto);

      // Assert
      expect(mockPrismaService.biomarkerValue.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ type: BiomarkerType.HEART_RATE }),
            expect.objectContaining({ type: BiomarkerType.STEPS }),
          ]) as Array<{ type: BiomarkerType }>,
        }),
      );
    });

    it('should return count of created records', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.createMany.mockResolvedValue({
        count: 3,
      });

      // Act
      const result = await service.createMany(createManyDto);

      // Assert
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('findAll', () => {
    const userId = 'user-uuid-1';

    it('should return paginated biomarker values for user', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.findMany.mockResolvedValue(
        mockBiomarkerValues,
      );
      mockPrismaService.biomarkerValue.count.mockResolvedValue(3);

      // Act
      const result = await service.findAll(userId, { page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(3);
      expect(mockPrismaService.biomarkerValue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }) as { userId: string },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by biomarker type', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.findMany.mockResolvedValue([
        mockBiomarkerValue,
      ]);
      mockPrismaService.biomarkerValue.count.mockResolvedValue(1);

      // Act
      await service.findAll(userId, {
        type: BiomarkerType.HEART_RATE,
      });

      // Assert
      expect(mockPrismaService.biomarkerValue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            type: BiomarkerType.HEART_RATE,
          }) as { userId: string; type: BiomarkerType },
        }),
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      mockPrismaService.biomarkerValue.findMany.mockResolvedValue(
        mockBiomarkerValues,
      );
      mockPrismaService.biomarkerValue.count.mockResolvedValue(3);

      // Act
      await service.findAll(userId, { startDate, endDate });

      // Assert
      expect(mockPrismaService.biomarkerValue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }) as { userId: string; timestamp: { gte: Date; lte: Date } },
        }),
      );
    });
  });

  describe('findLatest', () => {
    const userId = 'user-uuid-1';

    it('should return most recent value for type', async () => {
      // Arrange
      const latestValue: BiomarkerValue = {
        ...mockBiomarkerValue,
        timestamp: new Date('2024-01-15T12:00:00Z'),
        value: 68,
      };
      mockPrismaService.biomarkerValue.findFirst.mockResolvedValue(latestValue);

      // Act
      const result = await service.findLatest(userId, BiomarkerType.HEART_RATE);

      // Assert
      expect(result).toEqual(latestValue);
      expect(mockPrismaService.biomarkerValue.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            type: BiomarkerType.HEART_RATE,
          },
          orderBy: {
            timestamp: 'desc',
          },
        }),
      );
    });

    it('should return null if no values exist', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findLatest(userId, BiomarkerType.GLUCOSE);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getTrend', () => {
    const userId = 'user-uuid-1';
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should return values within date range', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.findMany.mockResolvedValue(
        mockBiomarkerValues,
      );

      // Act
      const result = await service.getTrend(
        userId,
        BiomarkerType.HEART_RATE,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toEqual(mockBiomarkerValues);
      expect(mockPrismaService.biomarkerValue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            type: BiomarkerType.HEART_RATE,
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      );
    });

    it('should order by timestamp ascending', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.findMany.mockResolvedValue(
        mockBiomarkerValues,
      );

      // Act
      await service.getTrend(
        userId,
        BiomarkerType.HEART_RATE,
        startDate,
        endDate,
      );

      // Assert
      expect(mockPrismaService.biomarkerValue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            timestamp: 'asc',
          },
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete biomarker value', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.findUnique.mockResolvedValue(
        mockBiomarkerValue,
      );
      mockPrismaService.biomarkerValue.delete.mockResolvedValue(
        mockBiomarkerValue,
      );

      // Act
      await service.remove('biomarker-uuid-1');

      // Assert
      expect(mockPrismaService.biomarkerValue.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'biomarker-uuid-1' },
        }),
      );
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrismaService.biomarkerValue.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
