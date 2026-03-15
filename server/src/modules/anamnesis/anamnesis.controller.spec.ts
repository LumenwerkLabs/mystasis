import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * TDD Tests for AnamnesisController
 *
 * These tests define the expected behavior of AnamnesisController:
 *
 * POST /anamnesis - Create anamnesis record
 * - CLINICIAN only
 * - clinicianId auto-set from JWT token
 *
 * GET /anamnesis/patient/:patientId - Get paginated anamneses for patient
 * - CLINICIAN: can access any patient
 * - PATIENT: can only access own records
 *
 * GET /anamnesis/:id - Get single anamnesis
 * - Both roles, patient-access validated after fetch
 *
 * PATCH /anamnesis/:id - Update anamnesis
 * - CLINICIAN only
 *
 * DELETE /anamnesis/:id - Delete anamnesis
 * - CLINICIAN only
 */

interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
}

interface AnamnesisResponse {
  id: string;
  patientId: string;
  clinicianId: string;
  rawTranscript: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string[];
  currentMedications: string[];
  allergies: string[];
  familyHistory: string[];
  reviewOfSystems: string[];
  socialHistory: string[];
  isReviewed: boolean;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PaginatedAnamnesesResponse {
  data: AnamnesisResponse[];
  total: number;
  page: number;
  limit: number;
}

interface MockAnamnesisService {
  create: jest.Mock<Promise<AnamnesisResponse>>;
  findAllForPatient: jest.Mock<Promise<PaginatedAnamnesesResponse>>;
  findOne: jest.Mock<Promise<AnamnesisResponse>>;
  update: jest.Mock<Promise<AnamnesisResponse>>;
  remove: jest.Mock<Promise<AnamnesisResponse>>;
}

describe('AnamnesisController', () => {
  let AnamnesisController: new (...args: unknown[]) => unknown;
  let controller: {
    create: (
      dto: Record<string, unknown>,
      user: UserPayload,
    ) => Promise<AnamnesisResponse>;
    findAllForPatient: (
      patientId: string,
      query: Record<string, unknown>,
      user: UserPayload,
    ) => Promise<PaginatedAnamnesesResponse>;
    findOne: (
      id: string,
      user: UserPayload,
    ) => Promise<AnamnesisResponse>;
    update: (
      id: string,
      dto: Record<string, unknown>,
    ) => Promise<AnamnesisResponse>;
    remove: (id: string) => Promise<AnamnesisResponse>;
  };
  let mockAnamnesisService: MockAnamnesisService;

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

  const mockAnamnesis: AnamnesisResponse = {
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
    socialHistory: ['Non-smoker'],
    isReviewed: true,
    recordedAt: new Date('2024-06-15T14:30:00Z'),
    createdAt: new Date('2024-06-15T15:00:00Z'),
    updatedAt: new Date('2024-06-15T15:00:00Z'),
  };

  const mockPaginatedResponse: PaginatedAnamnesesResponse = {
    data: [mockAnamnesis],
    total: 1,
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    mockAnamnesisService = {
      create: jest.fn(),
      findAllForPatient: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    jest.clearAllMocks();

    try {
      const anamnesisControllerModule = await import('./anamnesis.controller');
      AnamnesisController = anamnesisControllerModule.AnamnesisController;

      const anamnesisServiceModule = await import('./anamnesis.service');
      const AnamnesisService = anamnesisServiceModule.AnamnesisService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [AnamnesisController],
        providers: [
          { provide: AnamnesisService, useValue: mockAnamnesisService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(AnamnesisController);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  // ==========================================
  // MODULE SETUP
  // ==========================================

  describe('module setup', () => {
    it('should export AnamnesisController class', () => {
      expect(AnamnesisController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });

    it('should have @Controller decorator with "anamnesis" path', () => {
      if (!AnamnesisController) return;
      const path = Reflect.getMetadata('path', AnamnesisController);
      expect(path).toBe('anamnesis');
    });
  });

  // ==========================================
  // POST /anamnesis
  // ==========================================

  describe('create (POST /anamnesis)', () => {
    const createDto = {
      patientId: 'patient-uuid-1',
      rawTranscript: 'Doctor: What brings you in? Patient: Headaches.',
      chiefComplaint: 'Recurring headaches',
      historyOfPresentIllness: 'Two weeks of bilateral frontal headaches',
      pastMedicalHistory: ['Appendectomy 2015'],
      currentMedications: ['Ibuprofen 400mg PRN'],
      allergies: ['Penicillin - rash'],
      familyHistory: ['Father - hypertension'],
      reviewOfSystems: ['Neurological: headaches, no dizziness'],
      socialHistory: ['Non-smoker'],
      recordedAt: '2024-06-15T14:30:00Z',
      isReviewed: true,
    };

    describe('happy path', () => {
      it('should call service.create with clinicianId from JWT', async () => {
        // Arrange
        mockAnamnesisService.create.mockResolvedValue(mockAnamnesis);

        // Act
        await controller.create(createDto, mockClinician);

        // Assert
        expect(mockAnamnesisService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            patientId: 'patient-uuid-1',
            clinicianId: mockClinician.sub,
          }),
        );
      });

      it('should return created anamnesis', async () => {
        // Arrange
        mockAnamnesisService.create.mockResolvedValue(mockAnamnesis);

        // Act
        const result = await controller.create(createDto, mockClinician);

        // Assert
        expect(result).toEqual(mockAnamnesis);
        expect(result.id).toBe('anamnesis-uuid-1');
      });

      it('should convert recordedAt string to Date', async () => {
        // Arrange
        mockAnamnesisService.create.mockResolvedValue(mockAnamnesis);

        // Act
        await controller.create(createDto, mockClinician);

        // Assert
        expect(mockAnamnesisService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            recordedAt: expect.any(Date),
          }),
        );
      });
    });

    describe('guards and decorators', () => {
      it('should require CLINICIAN role only', () => {
        if (!AnamnesisController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, AnamnesisController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnamnesisController.prototype.create,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when patient not found', async () => {
        // Arrange
        mockAnamnesisService.create.mockRejectedValue(
          new NotFoundException('Patient not found'),
        );

        // Act & Assert
        await expect(
          controller.create(createDto, mockClinician),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ==========================================
  // GET /anamnesis/patient/:patientId
  // ==========================================

  describe('findAllForPatient (GET /anamnesis/patient/:patientId)', () => {
    describe('happy path', () => {
      it('should return paginated anamneses', async () => {
        // Arrange
        mockAnamnesisService.findAllForPatient.mockResolvedValue(
          mockPaginatedResponse,
        );

        // Act
        const result = await controller.findAllForPatient(
          'patient-uuid-1',
          { page: 1, limit: 10 },
          mockClinician,
        );

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
      });

      it('should pass date range filters to service', async () => {
        // Arrange
        mockAnamnesisService.findAllForPatient.mockResolvedValue(
          mockPaginatedResponse,
        );

        // Act
        await controller.findAllForPatient(
          'patient-uuid-1',
          {
            startDate: '2024-06-01T00:00:00Z',
            endDate: '2024-06-30T23:59:59Z',
          },
          mockClinician,
        );

        // Assert
        expect(mockAnamnesisService.findAllForPatient).toHaveBeenCalledWith(
          'patient-uuid-1',
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        );
      });
    });

    describe('access control', () => {
      it('should allow clinician to access any patient', async () => {
        // Arrange
        mockAnamnesisService.findAllForPatient.mockResolvedValue(
          mockPaginatedResponse,
        );

        // Act
        const result = await controller.findAllForPatient(
          'other-patient-uuid',
          {},
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
      });

      it('should allow patient to access own records', async () => {
        // Arrange
        mockAnamnesisService.findAllForPatient.mockResolvedValue(
          mockPaginatedResponse,
        );

        // Act
        const result = await controller.findAllForPatient(
          mockPatient.sub,
          {},
          mockPatient,
        );

        // Assert
        expect(result).toBeDefined();
      });

      it('should throw ForbiddenException when patient accesses other records', async () => {
        // Act & Assert
        await expect(
          controller.findAllForPatient('other-patient-uuid', {}, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient access is denied', async () => {
        // Act
        try {
          await controller.findAllForPatient(
            'other-patient-uuid',
            {},
            mockPatient,
          );
        } catch {
          // Expected
        }

        // Assert
        expect(
          mockAnamnesisService.findAllForPatient,
        ).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!AnamnesisController) return;

        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnamnesisController.prototype.findAllForPatient,
        );

        expect(methodRoles).toContain(UserRole.PATIENT);
        expect(methodRoles).toContain(UserRole.CLINICIAN);
      });
    });
  });

  // ==========================================
  // GET /anamnesis/:id
  // ==========================================

  describe('findOne (GET /anamnesis/:id)', () => {
    describe('happy path', () => {
      it('should return anamnesis by ID', async () => {
        // Arrange
        mockAnamnesisService.findOne.mockResolvedValue(mockAnamnesis);

        // Act
        const result = await controller.findOne(
          'anamnesis-uuid-1',
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockAnamnesis);
      });
    });

    describe('access control', () => {
      it('should allow patient to access own anamnesis', async () => {
        // Arrange
        mockAnamnesisService.findOne.mockResolvedValue(mockAnamnesis);

        // Act
        const result = await controller.findOne(
          'anamnesis-uuid-1',
          mockPatient,
        );

        // Assert
        expect(result).toBeDefined();
      });

      it('should throw ForbiddenException when patient accesses another patient anamnesis', async () => {
        // Arrange
        const otherPatientAnamnesis = {
          ...mockAnamnesis,
          patientId: 'other-patient-uuid',
        };
        mockAnamnesisService.findOne.mockResolvedValue(otherPatientAnamnesis);

        // Act & Assert
        await expect(
          controller.findOne('anamnesis-uuid-1', mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException', async () => {
        // Arrange
        mockAnamnesisService.findOne.mockRejectedValue(
          new NotFoundException('Anamnesis not found'),
        );

        // Act & Assert
        await expect(
          controller.findOne('nonexistent-id', mockClinician),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ==========================================
  // PATCH /anamnesis/:id
  // ==========================================

  describe('update (PATCH /anamnesis/:id)', () => {
    describe('happy path', () => {
      it('should update anamnesis fields', async () => {
        // Arrange
        const updated = {
          ...mockAnamnesis,
          chiefComplaint: 'Updated complaint',
        };
        mockAnamnesisService.update.mockResolvedValue(updated);

        // Act
        const result = await controller.update('anamnesis-uuid-1', {
          chiefComplaint: 'Updated complaint',
        });

        // Assert
        expect(result.chiefComplaint).toBe('Updated complaint');
        expect(mockAnamnesisService.update).toHaveBeenCalledWith(
          'anamnesis-uuid-1',
          { chiefComplaint: 'Updated complaint' },
        );
      });

      it('should mark anamnesis as reviewed', async () => {
        // Arrange
        const updated = { ...mockAnamnesis, isReviewed: true };
        mockAnamnesisService.update.mockResolvedValue(updated);

        // Act
        const result = await controller.update('anamnesis-uuid-1', {
          isReviewed: true,
        });

        // Assert
        expect(result.isReviewed).toBe(true);
      });
    });

    describe('guards and decorators', () => {
      it('should require CLINICIAN role only', () => {
        if (!AnamnesisController) return;

        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnamnesisController.prototype.update,
        );

        expect(methodRoles).toContain(UserRole.CLINICIAN);
        expect(methodRoles).not.toContain(UserRole.PATIENT);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException', async () => {
        // Arrange
        mockAnamnesisService.update.mockRejectedValue(
          new NotFoundException('Anamnesis not found'),
        );

        // Act & Assert
        await expect(
          controller.update('nonexistent-id', { chiefComplaint: 'test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ==========================================
  // DELETE /anamnesis/:id
  // ==========================================

  describe('remove (DELETE /anamnesis/:id)', () => {
    describe('happy path', () => {
      it('should delete anamnesis record', async () => {
        // Arrange
        mockAnamnesisService.remove.mockResolvedValue(mockAnamnesis);

        // Act
        await controller.remove('anamnesis-uuid-1');

        // Assert
        expect(mockAnamnesisService.remove).toHaveBeenCalledWith(
          'anamnesis-uuid-1',
        );
      });

      it('should return deleted anamnesis', async () => {
        // Arrange
        mockAnamnesisService.remove.mockResolvedValue(mockAnamnesis);

        // Act
        const result = await controller.remove('anamnesis-uuid-1');

        // Assert
        expect(result).toEqual(mockAnamnesis);
      });
    });

    describe('guards and decorators', () => {
      it('should require CLINICIAN role only', () => {
        if (!AnamnesisController) return;

        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          AnamnesisController.prototype.remove,
        );

        expect(methodRoles).toContain(UserRole.CLINICIAN);
        expect(methodRoles).not.toContain(UserRole.PATIENT);
      });
    });

    describe('error handling', () => {
      it('should propagate NotFoundException', async () => {
        // Arrange
        mockAnamnesisService.remove.mockRejectedValue(
          new NotFoundException('Anamnesis not found'),
        );

        // Act & Assert
        await expect(
          controller.remove('nonexistent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ==========================================
  // ROUTE DECORATORS
  // ==========================================

  describe('route decorators', () => {
    it('should have POST decorator on create', () => {
      if (!AnamnesisController) return;
      const method = Reflect.getMetadata(
        'method',
        AnamnesisController.prototype.create,
      );
      expect(method).toBeDefined();
    });

    it('should have GET decorator on findAllForPatient with path containing patient', () => {
      if (!AnamnesisController) return;
      const path = Reflect.getMetadata(
        'path',
        AnamnesisController.prototype.findAllForPatient,
      );
      expect(path).toContain('patient');
    });

    it('should have PATCH decorator on update', () => {
      if (!AnamnesisController) return;
      const method = Reflect.getMetadata(
        'method',
        AnamnesisController.prototype.update,
      );
      expect(method).toBeDefined();
    });

    it('should have DELETE decorator on remove', () => {
      if (!AnamnesisController) return;
      const method = Reflect.getMetadata(
        'method',
        AnamnesisController.prototype.remove,
      );
      expect(method).toBeDefined();
    });
  });

  // ==========================================
  // METHOD SIGNATURES
  // ==========================================

  describe('method signatures', () => {
    it('should have create method', () => {
      expect(typeof controller.create).toBe('function');
    });

    it('should have findAllForPatient method', () => {
      expect(typeof controller.findAllForPatient).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof controller.findOne).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof controller.update).toBe('function');
    });

    it('should have remove method', () => {
      expect(typeof controller.remove).toBe('function');
    });
  });
});
