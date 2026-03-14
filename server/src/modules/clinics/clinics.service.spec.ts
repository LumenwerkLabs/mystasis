import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * TDD Tests for ClinicsService
 *
 * These tests define the expected behavior of ClinicsService:
 *
 * create(data: CreateClinicDto): Promise<Clinic>
 * - Create a new clinic
 * - Should associate clinic with the creating clinician
 *
 * findAll(): Promise<Clinic[]>
 * - List all clinics
 * - Should return empty array when no clinics exist
 *
 * findOne(id: string): Promise<Clinic>
 * - Get clinic by ID
 * - Should throw NotFoundException if not found
 *
 * update(id: string, data: UpdateClinicDto): Promise<Clinic>
 * - Update clinic details
 * - Should throw NotFoundException if clinic not found
 *
 * remove(id: string): Promise<Clinic>
 * - Delete clinic
 * - Should throw NotFoundException if clinic not found
 *
 * enrollPatient(clinicId: string, patientId: string, clinicianClinicId: string): Promise<SafeUser>
 * - Assign patient to clinic
 * - Should throw NotFoundException if clinic or patient not found
 * - Should throw ForbiddenException if clinician tries to modify another clinic's patients
 * - Should throw BadRequestException if trying to enroll a CLINICIAN as a patient
 *
 * unenrollPatient(clinicId: string, patientId: string, clinicianClinicId: string): Promise<SafeUser>
 * - Remove patient from clinic
 * - Should throw NotFoundException if clinic or patient not found
 * - Should throw ForbiddenException if clinician tries to modify another clinic's patients
 *
 * getPatients(clinicId: string): Promise<SafeUser[]>
 * - List patients in clinic
 * - Should return empty array when no patients enrolled
 */

// Define Clinic interface
interface Clinic {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define SafeUser interface (without password field)
interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  clinicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define CreateClinicDto interface
interface CreateClinicDto {
  name: string;
  address?: string;
  phone?: string;
}

// Define UpdateClinicDto interface
interface UpdateClinicDto {
  name?: string;
  address?: string;
  phone?: string;
}

// Define mock Prisma delegates
interface MockClinicDelegate {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

interface MockUserDelegate {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
}

interface MockPrismaService {
  clinic: MockClinicDelegate;
  user: MockUserDelegate;
  $transaction: jest.Mock;
}

// Define CreateClinicResponse interface
interface CreateClinicResponse {
  clinic: Clinic;
  accessToken: string;
  tokenType: string;
}

describe('ClinicsService', () => {
  // Service will be imported dynamically
  let ClinicsService: new (...args: unknown[]) => unknown;
  let service: {
    create: (
      data: CreateClinicDto,
      clinicianId: string,
    ) => Promise<CreateClinicResponse>;
    findAll: () => Promise<Clinic[]>;
    findOne: (id: string) => Promise<Clinic>;
    update: (id: string, data: UpdateClinicDto) => Promise<Clinic>;
    remove: (id: string) => Promise<Clinic>;
    enrollPatient: (
      clinicId: string,
      patientId: string,
      clinicianClinicId: string,
    ) => Promise<SafeUser>;
    unenrollPatient: (
      clinicId: string,
      patientId: string,
      clinicianClinicId: string,
    ) => Promise<SafeUser>;
    getPatients: (clinicId: string) => Promise<SafeUser[]>;
  };
  let mockPrismaService: MockPrismaService;

  // Mock data
  const mockClinic: Clinic = {
    id: 'clinic-uuid-1',
    name: 'Downtown Health Clinic',
    address: '123 Main Street',
    phone: '+1-555-0100',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockClinicsList: Clinic[] = [
    mockClinic,
    {
      id: 'clinic-uuid-2',
      name: 'Uptown Medical Center',
      address: '456 Oak Avenue',
      phone: '+1-555-0200',
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:00:00Z'),
    },
  ];

  const mockPatient: SafeUser = {
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PATIENT,
    clinicId: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockEnrolledPatient: SafeUser = {
    ...mockPatient,
    clinicId: 'clinic-uuid-1',
  };

  const mockClinician: SafeUser = {
    id: 'clinician-uuid-1',
    email: 'clinician@example.com',
    firstName: 'Dr.',
    lastName: 'Smith',
    role: UserRole.CLINICIAN,
    clinicId: 'clinic-uuid-1',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockPatientsList: SafeUser[] = [
    mockEnrolledPatient,
    {
      ...mockPatient,
      id: 'patient-uuid-2',
      email: 'patient2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      clinicId: 'clinic-uuid-1',
    },
  ];

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrismaService = {
      clinic: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          clinic: mockPrismaService.clinic,
          user: mockPrismaService.user,
        }),
      ),
    };

    jest.clearAllMocks();

    // Mock JwtService
    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    // Dynamic import to allow test to exist before implementation
    try {
      const clinicsServiceModule = await import('./clinics.service');
      ClinicsService = clinicsServiceModule.ClinicsService;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClinicsService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
        ],
      }).compile();

      service = module.get(ClinicsService);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('module setup', () => {
    it('should export ClinicsService class', () => {
      expect(ClinicsService).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // CREATE TESTS
  // ============================================

  describe('create', () => {
    const createClinicDto: CreateClinicDto = {
      name: 'Downtown Health Clinic',
      address: '123 Main Street',
      phone: '+1-555-0100',
    };
    const clinicianId = 'clinician-uuid-1';

    describe('happy path', () => {
      it('should create a new clinic with provided data', async () => {
        // Arrange
        mockPrismaService.clinic.create.mockResolvedValue(mockClinic);
        mockPrismaService.user.update.mockResolvedValue({
          id: clinicianId,
          email: mockClinician.email,
          role: mockClinician.role,
          clinicId: mockClinic.id,
        });

        // Act
        const result = await service.create(createClinicDto, clinicianId);

        // Assert
        expect(result.clinic).toEqual(mockClinic);
        expect(result.accessToken).toBe('mock-jwt-token');
        expect(result.tokenType).toBe('Bearer');
        expect(mockPrismaService.clinic.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: createClinicDto.name,
              address: createClinicDto.address,
              phone: createClinicDto.phone,
            }),
          }),
        );
      });

      it('should associate the creating clinician with the new clinic', async () => {
        // Arrange
        mockPrismaService.clinic.create.mockResolvedValue(mockClinic);
        mockPrismaService.user.update.mockResolvedValue({
          id: clinicianId,
          email: mockClinician.email,
          role: mockClinician.role,
          clinicId: mockClinic.id,
        });

        // Act
        await service.create(createClinicDto, clinicianId);

        // Assert
        expect(mockPrismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: clinicianId },
            data: { clinicId: mockClinic.id },
          }),
        );
      });

      it('should create clinic with only required fields', async () => {
        // Arrange
        const minimalDto: CreateClinicDto = { name: 'Minimal Clinic' };
        const minimalClinic: Clinic = {
          ...mockClinic,
          name: 'Minimal Clinic',
          address: null,
          phone: null,
        };
        mockPrismaService.clinic.create.mockResolvedValue(minimalClinic);
        mockPrismaService.user.update.mockResolvedValue({
          id: clinicianId,
          email: mockClinician.email,
          role: mockClinician.role,
          clinicId: minimalClinic.id,
        });

        // Act
        const result = await service.create(minimalDto, clinicianId);

        // Assert
        expect(result.clinic.name).toBe('Minimal Clinic');
        expect(mockPrismaService.clinic.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: 'Minimal Clinic',
            }),
          }),
        );
      });

      it('should generate id and timestamps automatically', async () => {
        // Arrange
        mockPrismaService.clinic.create.mockResolvedValue(mockClinic);
        mockPrismaService.user.update.mockResolvedValue({
          id: clinicianId,
          email: mockClinician.email,
          role: mockClinician.role,
          clinicId: mockClinic.id,
        });

        // Act
        const result = await service.create(createClinicDto, clinicianId);

        // Assert
        expect(result.clinic.id).toBeDefined();
        expect(result.clinic.createdAt).toBeDefined();
        expect(result.clinic.updatedAt).toBeDefined();
      });

      it('should use a transaction for clinic creation and user update', async () => {
        // Arrange
        mockPrismaService.clinic.create.mockResolvedValue(mockClinic);
        mockPrismaService.user.update.mockResolvedValue({
          id: clinicianId,
          email: mockClinician.email,
          role: mockClinician.role,
          clinicId: mockClinic.id,
        });

        // Act
        await service.create(createClinicDto, clinicianId);

        // Assert
        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      it('should return a new access token with updated clinicId', async () => {
        // Arrange
        mockPrismaService.clinic.create.mockResolvedValue(mockClinic);
        mockPrismaService.user.update.mockResolvedValue({
          id: clinicianId,
          email: mockClinician.email,
          role: mockClinician.role,
          clinicId: mockClinic.id,
        });

        // Act
        const result = await service.create(createClinicDto, clinicianId);

        // Assert
        expect(result.accessToken).toBeDefined();
        expect(result.tokenType).toBe('Bearer');
      });
    });

    describe('error handling', () => {
      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.$transaction.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          service.create(createClinicDto, clinicianId),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // FIND ALL TESTS
  // ============================================

  describe('findAll', () => {
    describe('happy path', () => {
      it('should return all clinics', async () => {
        // Arrange
        mockPrismaService.clinic.findMany.mockResolvedValue(mockClinicsList);

        // Act
        const result = await service.findAll();

        // Assert
        expect(result).toEqual(mockClinicsList);
        expect(result).toHaveLength(2);
        expect(mockPrismaService.clinic.findMany).toHaveBeenCalled();
      });

      it('should return empty array when no clinics exist', async () => {
        // Arrange
        mockPrismaService.clinic.findMany.mockResolvedValue([]);

        // Act
        const result = await service.findAll();

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should order clinics by createdAt descending', async () => {
        // Arrange
        mockPrismaService.clinic.findMany.mockResolvedValue(mockClinicsList);

        // Act
        await service.findAll();

        // Assert
        expect(mockPrismaService.clinic.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.clinic.findMany.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(service.findAll()).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // FIND ONE TESTS
  // ============================================

  describe('findOne', () => {
    describe('happy path', () => {
      it('should return clinic by id', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);

        // Act
        const result = await service.findOne('clinic-uuid-1');

        // Assert
        expect(result).toEqual(mockClinic);
        expect(mockPrismaService.clinic.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'clinic-uuid-1' },
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when clinic not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.findOne('nonexistent-id')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should include clinic id in error message', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.findOne('nonexistent-id')).rejects.toThrow(
          /nonexistent-id/,
        );
      });

      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(service.findOne('clinic-uuid-1')).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('update', () => {
    const updateClinicDto: UpdateClinicDto = {
      name: 'Updated Clinic Name',
      address: '789 New Street',
    };

    describe('happy path', () => {
      it('should update clinic with provided data', async () => {
        // Arrange
        const updatedClinic: Clinic = {
          ...mockClinic,
          name: 'Updated Clinic Name',
          address: '789 New Street',
        };
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.clinic.update.mockResolvedValue(updatedClinic);

        // Act
        const result = await service.update('clinic-uuid-1', updateClinicDto);

        // Assert
        expect(result.name).toBe('Updated Clinic Name');
        expect(result.address).toBe('789 New Street');
        expect(mockPrismaService.clinic.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'clinic-uuid-1' },
            data: expect.objectContaining({
              name: 'Updated Clinic Name',
              address: '789 New Street',
            }),
          }),
        );
      });

      it('should update only provided fields', async () => {
        // Arrange
        const partialUpdate: UpdateClinicDto = { phone: '+1-555-9999' };
        const updatedClinic: Clinic = {
          ...mockClinic,
          phone: '+1-555-9999',
        };
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.clinic.update.mockResolvedValue(updatedClinic);

        // Act
        const result = await service.update('clinic-uuid-1', partialUpdate);

        // Assert
        expect(result.phone).toBe('+1-555-9999');
        expect(result.name).toBe(mockClinic.name);
        expect(result.address).toBe(mockClinic.address);
      });

      it('should update updatedAt timestamp', async () => {
        // Arrange
        const newUpdatedAt = new Date('2024-06-15T10:00:00Z');
        const updatedClinic: Clinic = {
          ...mockClinic,
          ...updateClinicDto,
          updatedAt: newUpdatedAt,
        };
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.clinic.update.mockResolvedValue(updatedClinic);

        // Act
        const result = await service.update('clinic-uuid-1', updateClinicDto);

        // Assert
        expect(result.updatedAt).toEqual(newUpdatedAt);
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when clinic not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.update('nonexistent-id', updateClinicDto),
        ).rejects.toThrow(NotFoundException);
      });

      it('should validate clinic exists before updating', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act
        try {
          await service.update('nonexistent-id', updateClinicDto);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockPrismaService.clinic.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'nonexistent-id' },
          }),
        );
        expect(mockPrismaService.clinic.update).not.toHaveBeenCalled();
      });

      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.clinic.update.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          service.update('clinic-uuid-1', updateClinicDto),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // REMOVE TESTS
  // ============================================

  describe('remove', () => {
    describe('happy path', () => {
      it('should delete clinic by id', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.clinic.delete.mockResolvedValue(mockClinic);

        // Act
        const result = await service.remove('clinic-uuid-1');

        // Assert
        expect(result).toEqual(mockClinic);
        expect(mockPrismaService.clinic.delete).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'clinic-uuid-1' },
          }),
        );
      });

      it('should return the deleted clinic', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.clinic.delete.mockResolvedValue(mockClinic);

        // Act
        const result = await service.remove('clinic-uuid-1');

        // Assert
        expect(result.id).toBe('clinic-uuid-1');
        expect(result.name).toBe(mockClinic.name);
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when clinic not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.remove('nonexistent-id')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should validate clinic exists before deleting', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act
        try {
          await service.remove('nonexistent-id');
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockPrismaService.clinic.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'nonexistent-id' },
          }),
        );
        expect(mockPrismaService.clinic.delete).not.toHaveBeenCalled();
      });

      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.clinic.delete.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(service.remove('clinic-uuid-1')).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // ENROLL PATIENT TESTS
  // ============================================

  describe('enrollPatient', () => {
    describe('happy path', () => {
      it('should assign patient to clinic', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);
        mockPrismaService.user.update.mockResolvedValue(mockEnrolledPatient);

        // Act
        const result = await service.enrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          'clinic-uuid-1', // clinicianClinicId matches
        );

        // Assert
        expect(result.clinicId).toBe('clinic-uuid-1');
        expect(mockPrismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'patient-uuid-1' },
            data: { clinicId: 'clinic-uuid-1' },
          }),
        );
      });

      it('should return the enrolled patient', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);
        mockPrismaService.user.update.mockResolvedValue(mockEnrolledPatient);

        // Act
        const result = await service.enrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          'clinic-uuid-1',
        );

        // Assert
        expect(result.id).toBe('patient-uuid-1');
        expect(result.role).toBe(UserRole.PATIENT);
      });
    });

    describe('access control', () => {
      it('should throw ForbiddenException when clinician tries to enroll patient in different clinic', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);

        // Act & Assert
        await expect(
          service.enrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            'clinic-uuid-2', // Different clinic
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not update user when access is denied', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);

        // Act
        try {
          await service.enrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            'clinic-uuid-2', // Different clinic
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      });
    });

    describe('role validation', () => {
      it('should throw BadRequestException when trying to enroll a CLINICIAN as patient', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(mockClinician); // CLINICIAN role

        // Act & Assert
        await expect(
          service.enrollPatient(
            'clinic-uuid-1',
            'clinician-uuid-1',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should include appropriate message when trying to enroll clinician', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(mockClinician);

        // Act & Assert
        await expect(
          service.enrollPatient(
            'clinic-uuid-1',
            'clinician-uuid-1',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow(/PATIENT/i);
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when clinic not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.enrollPatient(
            'nonexistent-clinic',
            'patient-uuid-1',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException when patient not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.enrollPatient(
            'clinic-uuid-1',
            'nonexistent-patient',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should validate clinic exists before patient lookup', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act
        try {
          await service.enrollPatient(
            'nonexistent-clinic',
            'patient-uuid-1',
            'clinic-uuid-1',
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockPrismaService.clinic.findUnique).toHaveBeenCalled();
      });

      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);
        mockPrismaService.user.update.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          service.enrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // UNENROLL PATIENT TESTS
  // ============================================

  describe('unenrollPatient', () => {
    describe('happy path', () => {
      it('should remove patient from clinic', async () => {
        // Arrange
        const unenrolledPatient: SafeUser = {
          ...mockEnrolledPatient,
          clinicId: null,
        };
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(
          mockEnrolledPatient,
        );
        mockPrismaService.user.update.mockResolvedValue(unenrolledPatient);

        // Act
        const result = await service.unenrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          'clinic-uuid-1',
        );

        // Assert
        expect(result.clinicId).toBeNull();
        expect(mockPrismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'patient-uuid-1' },
            data: { clinicId: null },
          }),
        );
      });

      it('should return the unenrolled patient', async () => {
        // Arrange
        const unenrolledPatient: SafeUser = {
          ...mockEnrolledPatient,
          clinicId: null,
        };
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(
          mockEnrolledPatient,
        );
        mockPrismaService.user.update.mockResolvedValue(unenrolledPatient);

        // Act
        const result = await service.unenrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          'clinic-uuid-1',
        );

        // Assert
        expect(result.id).toBe('patient-uuid-1');
      });
    });

    describe('access control', () => {
      it('should throw ForbiddenException when clinician tries to unenroll patient from different clinic', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(
          mockEnrolledPatient,
        );

        // Act & Assert
        await expect(
          service.unenrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            'clinic-uuid-2', // Different clinic
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not update user when access is denied', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(
          mockEnrolledPatient,
        );

        // Act
        try {
          await service.unenrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            'clinic-uuid-2',
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when clinic not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.unenrollPatient(
            'nonexistent-clinic',
            'patient-uuid-1',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException when patient not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.unenrollPatient(
            'clinic-uuid-1',
            'nonexistent-patient',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findUnique.mockResolvedValue(
          mockEnrolledPatient,
        );
        mockPrismaService.user.update.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          service.unenrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            'clinic-uuid-1',
          ),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET PATIENTS TESTS
  // ============================================

  describe('getPatients', () => {
    describe('happy path', () => {
      it('should return all patients in clinic without password fields', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findMany.mockResolvedValue(mockPatientsList);

        // Act
        const result = await service.getPatients('clinic-uuid-1');

        // Assert
        expect(result).toEqual(mockPatientsList);
        expect(result).toHaveLength(2);
        expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              clinicId: 'clinic-uuid-1',
              role: UserRole.PATIENT,
            },
            select: expect.objectContaining({
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              clinicId: true,
              createdAt: true,
              updatedAt: true,
            }),
          }),
        );
      });

      it('should return empty array when no patients enrolled', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findMany.mockResolvedValue([]);

        // Act
        const result = await service.getPatients('clinic-uuid-1');

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should only return users with PATIENT role', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findMany.mockResolvedValue(mockPatientsList);

        // Act
        const result = await service.getPatients('clinic-uuid-1');

        // Assert
        result.forEach((user: SafeUser) => {
          expect(user.role).toBe(UserRole.PATIENT);
        });
      });

      it('should order patients by lastName ascending', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findMany.mockResolvedValue(mockPatientsList);

        // Act
        await service.getPatients('clinic-uuid-1');

        // Assert
        expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { lastName: 'asc' },
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when clinic not found', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.getPatients('nonexistent-clinic')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should validate clinic exists before fetching patients', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(null);

        // Act
        try {
          await service.getPatients('nonexistent-clinic');
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockPrismaService.clinic.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'nonexistent-clinic' },
          }),
        );
        expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
      });

      it('should propagate database errors', async () => {
        // Arrange
        mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
        mockPrismaService.user.findMany.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(service.getPatients('clinic-uuid-1')).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // METHOD SIGNATURES
  // ============================================

  describe('method signatures', () => {
    it('should have create method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.create).toBe('function');
      }
    });

    it('should have findAll method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.findAll).toBe('function');
      }
    });

    it('should have findOne method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.findOne).toBe('function');
      }
    });

    it('should have update method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.update).toBe('function');
      }
    });

    it('should have remove method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.remove).toBe('function');
      }
    });

    it('should have enrollPatient method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.enrollPatient).toBe('function');
      }
    });

    it('should have unenrollPatient method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.unenrollPatient).toBe('function');
      }
    });

    it('should have getPatients method', () => {
      expect(service).toBeDefined();
      if (service) {
        expect(typeof service.getPatients).toBe('function');
      }
    });
  });
});
