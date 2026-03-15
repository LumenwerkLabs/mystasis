import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * TDD Tests for AnamnesisService
 *
 * These tests define the expected behavior of AnamnesisService:
 * 1. CRUD operations for structured anamnesis records
 * 2. Patient validation on creation
 * 3. Pagination and date range filtering
 * 4. Existence checks before update and delete
 */

interface MockAnamnesisDelegate {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

interface MockUserDelegate {
  findUnique: jest.Mock;
}

interface MockPrismaService {
  anamnesis: MockAnamnesisDelegate;
  user: MockUserDelegate;
}

describe('AnamnesisService', () => {
  let service: AnamnesisService;
  let mockPrismaService: MockPrismaService;

  const mockAnamnesis = {
    id: 'anamnesis-uuid-1',
    patientId: 'patient-uuid-1',
    clinicianId: 'clinician-uuid-1',
    rawTranscript: 'Doctor: What brings you in? Patient: Headaches.',
    chiefComplaint: 'Recurring headaches',
    historyOfPresentIllness: 'Two weeks of bilateral frontal headaches',
    pastMedicalHistory: ['Appendectomy 2015'],
    currentMedications: ['Ibuprofen 400mg PRN'],
    allergies: ['Penicillin - rash'],
    familyHistory: ['Father - hypertension'],
    reviewOfSystems: ['Neurological: headaches, no dizziness'],
    socialHistory: ['Non-smoker', 'Software engineer'],
    isReviewed: true,
    recordedAt: new Date('2024-06-15T14:30:00Z'),
    createdAt: new Date('2024-06-15T15:00:00Z'),
    updatedAt: new Date('2024-06-15T15:00:00Z'),
  };

  const mockAnamneses = [
    mockAnamnesis,
    {
      ...mockAnamnesis,
      id: 'anamnesis-uuid-2',
      chiefComplaint: 'Follow-up visit',
      recordedAt: new Date('2024-06-20T10:00:00Z'),
    },
  ];

  beforeEach(async () => {
    mockPrismaService = {
      anamnesis: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
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
        AnamnesisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnamnesisService>(AnamnesisService);
  });

  describe('module setup', () => {
    it('should export AnamnesisService class', () => {
      expect(AnamnesisService).toBeDefined();
    });
  });

  // ==========================================
  // CREATE
  // ==========================================

  describe('create', () => {
    const createData = {
      patientId: 'patient-uuid-1',
      clinicianId: 'clinician-uuid-1',
      rawTranscript: 'Doctor: What brings you in? Patient: Headaches.',
      chiefComplaint: 'Recurring headaches',
      historyOfPresentIllness: 'Two weeks of bilateral frontal headaches',
      pastMedicalHistory: ['Appendectomy 2015'],
      currentMedications: ['Ibuprofen 400mg PRN'],
      allergies: ['Penicillin - rash'],
      familyHistory: ['Father - hypertension'],
      reviewOfSystems: ['Neurological: headaches, no dizziness'],
      socialHistory: ['Non-smoker'],
      recordedAt: new Date('2024-06-15T14:30:00Z'),
      isReviewed: true,
    };

    it('should create an anamnesis record', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'patient-uuid-1',
      });
      mockPrismaService.anamnesis.create.mockResolvedValue(mockAnamnesis);

      // Act
      const result = await service.create(createData);

      // Assert
      expect(result).toEqual(mockAnamnesis);
      expect(mockPrismaService.anamnesis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-uuid-1',
            clinicianId: 'clinician-uuid-1',
            chiefComplaint: 'Recurring headaches',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should validate patient exists before creating', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'patient-uuid-1',
      });
      mockPrismaService.anamnesis.create.mockResolvedValue(mockAnamnesis);

      // Act
      await service.create(createData);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'patient-uuid-1' },
        select: { id: true },
      });
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createData)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.anamnesis.create).not.toHaveBeenCalled();
    });

    it('should default isReviewed to false when not provided', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'patient-uuid-1',
      });
      mockPrismaService.anamnesis.create.mockResolvedValue(mockAnamnesis);

      const dataWithoutReviewed = { ...createData };
      delete (dataWithoutReviewed as Record<string, unknown>).isReviewed;

      // Act
      await service.create(dataWithoutReviewed);

      // Assert
      expect(mockPrismaService.anamnesis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isReviewed: false,
          }) as Record<string, unknown>,
        }),
      );
    });
  });

  // ==========================================
  // FIND ALL FOR PATIENT
  // ==========================================

  describe('findAllForPatient', () => {
    const patientId = 'patient-uuid-1';

    it('should return paginated anamnesis records', async () => {
      // Arrange
      mockPrismaService.anamnesis.findMany.mockResolvedValue(mockAnamneses);
      mockPrismaService.anamnesis.count.mockResolvedValue(2);

      // Act
      const result = await service.findAllForPatient(patientId, {
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      mockPrismaService.anamnesis.findMany.mockResolvedValue(mockAnamneses);
      mockPrismaService.anamnesis.count.mockResolvedValue(2);

      // Act
      await service.findAllForPatient(patientId);

      // Assert
      expect(mockPrismaService.anamnesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by patientId', async () => {
      // Arrange
      mockPrismaService.anamnesis.findMany.mockResolvedValue(mockAnamneses);
      mockPrismaService.anamnesis.count.mockResolvedValue(2);

      // Act
      await service.findAllForPatient(patientId);

      // Assert
      expect(mockPrismaService.anamnesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      mockPrismaService.anamnesis.findMany.mockResolvedValue(mockAnamneses);
      mockPrismaService.anamnesis.count.mockResolvedValue(2);

      // Act
      await service.findAllForPatient(patientId, { startDate, endDate });

      // Assert
      expect(mockPrismaService.anamnesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId,
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should order by recordedAt descending', async () => {
      // Arrange
      mockPrismaService.anamnesis.findMany.mockResolvedValue(mockAnamneses);
      mockPrismaService.anamnesis.count.mockResolvedValue(2);

      // Act
      await service.findAllForPatient(patientId);

      // Assert
      expect(mockPrismaService.anamnesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { recordedAt: 'desc' },
        }),
      );
    });
  });

  // ==========================================
  // FIND ONE
  // ==========================================

  describe('findOne', () => {
    it('should return an anamnesis by ID', async () => {
      // Arrange
      mockPrismaService.anamnesis.findUnique.mockResolvedValue(mockAnamnesis);

      // Act
      const result = await service.findOne('anamnesis-uuid-1');

      // Assert
      expect(result).toEqual(mockAnamnesis);
      expect(mockPrismaService.anamnesis.findUnique).toHaveBeenCalledWith({
        where: { id: 'anamnesis-uuid-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrismaService.anamnesis.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================
  // UPDATE
  // ==========================================

  describe('update', () => {
    it('should update anamnesis fields', async () => {
      // Arrange
      const updated = {
        ...mockAnamnesis,
        chiefComplaint: 'Updated chief complaint',
      };
      mockPrismaService.anamnesis.findUnique.mockResolvedValue(mockAnamnesis);
      mockPrismaService.anamnesis.update.mockResolvedValue(updated);

      // Act
      const result = await service.update('anamnesis-uuid-1', {
        chiefComplaint: 'Updated chief complaint',
      });

      // Assert
      expect(result.chiefComplaint).toBe('Updated chief complaint');
      expect(mockPrismaService.anamnesis.update).toHaveBeenCalledWith({
        where: { id: 'anamnesis-uuid-1' },
        data: { chiefComplaint: 'Updated chief complaint' },
      });
    });

    it('should update isReviewed flag', async () => {
      // Arrange
      const updated = { ...mockAnamnesis, isReviewed: true };
      mockPrismaService.anamnesis.findUnique.mockResolvedValue(mockAnamnesis);
      mockPrismaService.anamnesis.update.mockResolvedValue(updated);

      // Act
      const result = await service.update('anamnesis-uuid-1', {
        isReviewed: true,
      });

      // Assert
      expect(result.isReviewed).toBe(true);
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrismaService.anamnesis.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('nonexistent-id', { chiefComplaint: 'test' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.anamnesis.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // REMOVE
  // ==========================================

  describe('remove', () => {
    it('should delete anamnesis record', async () => {
      // Arrange
      mockPrismaService.anamnesis.findUnique.mockResolvedValue(mockAnamnesis);
      mockPrismaService.anamnesis.delete.mockResolvedValue(mockAnamnesis);

      // Act
      await service.remove('anamnesis-uuid-1');

      // Assert
      expect(mockPrismaService.anamnesis.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'anamnesis-uuid-1' },
        }),
      );
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrismaService.anamnesis.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
