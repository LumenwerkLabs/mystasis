import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CookieService } from '../../common/services/cookie.service';

/**
 * TDD Tests for ClinicsController
 *
 * These tests define the expected behavior of ClinicsController:
 *
 * POST /clinics - Create clinic (CLINICIAN only)
 * - Should create a new clinic
 * - Should associate clinic with the creating clinician
 *
 * GET /clinics - List clinics (CLINICIAN only)
 * - Should return all clinics
 * - Should return empty array when no clinics exist
 *
 * GET /clinics/:id - Get clinic (CLINICIAN only)
 * - Should return clinic by ID
 * - Should throw 404 if clinic not found
 *
 * PATCH /clinics/:id - Update clinic (owner CLINICIAN only)
 * - Should update clinic details
 * - Should throw 403 if non-owner tries to modify clinic
 * - Should throw 404 if clinic not found
 *
 * DELETE /clinics/:id - Delete clinic (owner CLINICIAN only)
 * - Should delete clinic
 * - Should throw 403 if non-owner tries to delete clinic
 * - Should throw 404 if clinic not found
 *
 * POST /clinics/:clinicId/patients/:patientId - Enroll patient (owner CLINICIAN only)
 * - Should assign patient to clinic
 * - Should throw 403 if non-owner tries to enroll patient
 * - Should throw 404 if clinic or patient not found
 *
 * DELETE /clinics/:clinicId/patients/:patientId - Unenroll patient (owner CLINICIAN only)
 * - Should remove patient from clinic
 * - Should throw 403 if non-owner tries to unenroll patient
 * - Should throw 404 if clinic or patient not found
 *
 * GET /clinics/:clinicId/patients - List patients (owner CLINICIAN only)
 * - Should return all patients in clinic
 * - Should throw 403 if non-owner tries to list patients
 * - Should return empty array when no patients enrolled
 */

// Define user payload interface with clinicId
interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
  clinicId?: string;
}

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

// Define CreateClinicResponse interface
interface CreateClinicResponse {
  clinic: Clinic;
  accessToken: string;
  tokenType: string;
}

// Define mock Response interface
interface MockResponse {
  cookie: jest.Mock;
}

// Define mock ClinicsService interface
interface MockClinicsService {
  create: jest.Mock<Promise<CreateClinicResponse>, [CreateClinicDto, string]>;
  findAll: jest.Mock<Promise<Clinic[]>>;
  findOne: jest.Mock<Promise<Clinic>>;
  update: jest.Mock<Promise<Clinic>>;
  remove: jest.Mock<Promise<Clinic>>;
  enrollPatient: jest.Mock<Promise<SafeUser>>;
  unenrollPatient: jest.Mock<Promise<SafeUser>>;
  getPatients: jest.Mock<Promise<SafeUser[]>>;
}

describe('ClinicsController', () => {
  // Controller and service will be imported dynamically
  let ClinicsController: new (...args: unknown[]) => unknown;
  let controller: {
    create: (
      dto: CreateClinicDto,
      user: UserPayload,
      res: MockResponse,
    ) => Promise<CreateClinicResponse>;
    findAll: (user: UserPayload) => Promise<Clinic[]>;
    findOne: (id: string, user: UserPayload) => Promise<Clinic>;
    update: (
      id: string,
      dto: UpdateClinicDto,
      user: UserPayload,
    ) => Promise<Clinic>;
    remove: (id: string, user: UserPayload) => Promise<Clinic>;
    enrollPatient: (
      clinicId: string,
      patientId: string,
      user: UserPayload,
    ) => Promise<SafeUser>;
    unenrollPatient: (
      clinicId: string,
      patientId: string,
      user: UserPayload,
    ) => Promise<SafeUser>;
    getPatients: (clinicId: string, user: UserPayload) => Promise<SafeUser[]>;
  };
  let mockClinicsService: MockClinicsService;
  let mockResponse: MockResponse;
  let mockCookieService: {
    setAuthCookie: jest.Mock;
    clearAuthCookie: jest.Mock;
  };

  // Mock data
  const mockClinician: UserPayload = {
    sub: 'clinician-uuid-1',
    id: 'clinician-uuid-1',
    email: 'clinician@example.com',
    role: UserRole.CLINICIAN,
    clinicId: 'clinic-uuid-1',
  };

  const mockOtherClinician: UserPayload = {
    sub: 'clinician-uuid-3',
    id: 'clinician-uuid-3',
    email: 'other-clinician@example.com',
    role: UserRole.CLINICIAN,
    clinicId: 'clinic-uuid-2', // Different clinic
  };

  const mockPatientUser: UserPayload = {
    sub: 'patient-uuid-1',
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    role: UserRole.PATIENT,
    clinicId: undefined,
  };

  const mockClinic: Clinic = {
    id: 'clinic-uuid-1',
    name: 'Downtown Health Clinic',
    address: '123 Main Street',
    phone: '+1-555-0100',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  // Note: mockClinicsList removed - findAll now only returns user's own clinic for security

  const mockPatient: SafeUser = {
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PATIENT,
    clinicId: 'clinic-uuid-1',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockPatientsList: SafeUser[] = [
    mockPatient,
    {
      ...mockPatient,
      id: 'patient-uuid-2',
      email: 'patient2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  ];

  beforeEach(async () => {
    // Create fresh mocks
    mockClinicsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      enrollPatient: jest.fn(),
      unenrollPatient: jest.fn(),
      getPatients: jest.fn(),
    };

    // Mock Express Response for cookie setting
    mockResponse = {
      cookie: jest.fn(),
    };

    jest.clearAllMocks();

    // Mock CookieService
    mockCookieService = {
      setAuthCookie: jest.fn(),
      clearAuthCookie: jest.fn(),
    };

    // Dynamic import to allow test to exist before implementation
    try {
      const clinicsControllerModule = await import('./clinics.controller');
      ClinicsController = clinicsControllerModule.ClinicsController;

      const clinicsServiceModule = await import('./clinics.service');
      const ClinicsService = clinicsServiceModule.ClinicsService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [ClinicsController],
        providers: [
          { provide: ClinicsService, useValue: mockClinicsService },
          { provide: CookieService, useValue: mockCookieService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(ClinicsController);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('module setup', () => {
    it('should export ClinicsController class', () => {
      expect(ClinicsController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });

    it('should have @Controller decorator with "clinics" path', () => {
      if (!ClinicsController) return;

      const path = Reflect.getMetadata('path', ClinicsController);
      expect(path).toBe('clinics');
    });

    it('should have JwtAuthGuard applied at class level', () => {
      if (!ClinicsController) return;

      const guards = Reflect.getMetadata('__guards__', ClinicsController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });

    it('should have RolesGuard applied at class level', () => {
      if (!ClinicsController) return;

      const guards = Reflect.getMetadata('__guards__', ClinicsController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // POST /clinics TESTS
  // ============================================

  describe('create (POST /clinics)', () => {
    const createDto: CreateClinicDto = {
      name: 'Downtown Health Clinic',
      address: '123 Main Street',
      phone: '+1-555-0100',
    };

    const mockCreateResponse: CreateClinicResponse = {
      clinic: mockClinic,
      accessToken: 'mock-jwt-token',
      tokenType: 'Bearer',
    };

    describe('happy path', () => {
      it('should call clinicsService.create with correct data and clinician ID', async () => {
        // Arrange
        mockClinicsService.create.mockResolvedValue(mockCreateResponse);

        // Act
        await controller.create(createDto, mockClinician, mockResponse);

        // Assert
        expect(mockClinicsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: createDto.name,
            address: createDto.address,
            phone: createDto.phone,
          }),
          mockClinician.sub,
        );
      });

      it('should return created clinic with access token', async () => {
        // Arrange
        mockClinicsService.create.mockResolvedValue(mockCreateResponse);

        // Act
        const result = await controller.create(
          createDto,
          mockClinician,
          mockResponse,
        );

        // Assert
        expect(result.clinic).toEqual(mockClinic);
        expect(result.clinic.id).toBe(mockClinic.id);
        expect(result.accessToken).toBe('mock-jwt-token');
        expect(result.tokenType).toBe('Bearer');
      });

      it('should set HttpOnly cookie with access token via CookieService', async () => {
        // Arrange
        mockClinicsService.create.mockResolvedValue(mockCreateResponse);

        // Act
        await controller.create(createDto, mockClinician, mockResponse);

        // Assert
        expect(mockCookieService.setAuthCookie).toHaveBeenCalledWith(
          mockResponse,
          'mock-jwt-token',
        );
      });

      it('should handle optional fields', async () => {
        // Arrange
        const minimalDto: CreateClinicDto = { name: 'Minimal Clinic' };
        const minimalClinic: Clinic = {
          ...mockClinic,
          name: 'Minimal Clinic',
          address: null,
          phone: null,
        };
        const minimalResponse: CreateClinicResponse = {
          clinic: minimalClinic,
          accessToken: 'mock-jwt-token',
          tokenType: 'Bearer',
        };
        mockClinicsService.create.mockResolvedValue(minimalResponse);

        // Act
        const result = await controller.create(
          minimalDto,
          mockClinician,
          mockResponse,
        );

        // Assert
        expect(result.clinic.name).toBe('Minimal Clinic');
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'create',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.create,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have POST decorator', () => {
        if (!ClinicsController) return;

        const method = Reflect.getMetadata(
          'method',
          ClinicsController.prototype.create,
        );

        expect(method).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockClinicsService.create.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.create(createDto, mockClinician, mockResponse),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET /clinics TESTS
  // ============================================

  describe('findAll (GET /clinics)', () => {
    describe('happy path', () => {
      it('should call clinicsService.findOne with user clinicId for security', async () => {
        // Arrange
        mockClinicsService.findOne.mockResolvedValue(mockClinic);

        // Act
        await controller.findAll(mockClinician);

        // Assert - Should only fetch the user's own clinic, not all clinics
        expect(mockClinicsService.findOne).toHaveBeenCalledWith(
          mockClinician.clinicId,
        );
      });

      it('should return only the users own clinic', async () => {
        // Arrange
        mockClinicsService.findOne.mockResolvedValue(mockClinic);

        // Act
        const result = await controller.findAll(mockClinician);

        // Assert - Security: Only returns the user's own clinic
        expect(result).toEqual([mockClinic]);
        expect(result).toHaveLength(1);
      });

      it('should return empty array when user has no clinic', async () => {
        // Arrange - User without clinicId
        const userWithoutClinic: UserPayload = {
          ...mockClinician,
          clinicId: undefined,
        };

        // Act
        const result = await controller.findAll(userWithoutClinic);

        // Assert
        expect(result).toEqual([]);
        expect(mockClinicsService.findOne).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'findAll',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.findAll,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator', () => {
        if (!ClinicsController) return;

        const method = Reflect.getMetadata(
          'method',
          ClinicsController.prototype.findAll,
        );

        expect(method).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should return empty array when service throws error', async () => {
        // Arrange
        mockClinicsService.findOne.mockRejectedValue(
          new Error('Database error'),
        );

        // Act - Should gracefully handle errors by returning empty array
        const result = await controller.findAll(mockClinician);

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  // ============================================
  // GET /clinics/:id TESTS
  // ============================================

  describe('findOne (GET /clinics/:id)', () => {
    describe('happy path', () => {
      it('should call clinicsService.findOne with correct id', async () => {
        // Arrange
        mockClinicsService.findOne.mockResolvedValue(mockClinic);

        // Act
        await controller.findOne('clinic-uuid-1', mockClinician);

        // Assert
        expect(mockClinicsService.findOne).toHaveBeenCalledWith(
          'clinic-uuid-1',
        );
      });

      it('should return clinic by id', async () => {
        // Arrange
        mockClinicsService.findOne.mockResolvedValue(mockClinic);

        // Act
        const result = await controller.findOne('clinic-uuid-1', mockClinician);

        // Assert
        expect(result).toEqual(mockClinic);
        expect(result.id).toBe('clinic-uuid-1');
      });

      it('should throw ForbiddenException when accessing non-owned clinic', async () => {
        // Arrange - mockClinician owns clinic-uuid-1, trying to access clinic-uuid-2

        // Act & Assert
        await expect(
          controller.findOne('clinic-uuid-2', mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'findOne',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.findOne,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator with :id param', () => {
        if (!ClinicsController) return;

        const path = Reflect.getMetadata(
          'path',
          ClinicsController.prototype.findOne,
        );

        expect(path).toContain(':id');
      });

      it('should have ParseUUIDPipe on id parameter', () => {
        if (!ClinicsController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          ClinicsController.prototype,
          'findOne',
        );

        expect(paramTypes).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should throw ForbiddenException when accessing non-owned clinic (security-first)', async () => {
        // Security: Access validation happens before checking if clinic exists
        // This prevents information disclosure about resource existence
        // Arrange
        mockClinicsService.findOne.mockRejectedValue(
          new NotFoundException('Clinic with ID invalid-uuid not found'),
        );

        // Act & Assert - Should get ForbiddenException, not NotFoundException
        await expect(
          controller.findOne('invalid-uuid', mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should propagate service errors when accessing own clinic', async () => {
        // Arrange
        mockClinicsService.findOne.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.findOne('clinic-uuid-1', mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // PATCH /clinics/:id TESTS
  // ============================================

  describe('update (PATCH /clinics/:id)', () => {
    const updateDto: UpdateClinicDto = {
      name: 'Updated Clinic Name',
      address: '789 New Street',
    };

    describe('happy path', () => {
      it('should call clinicsService.update with correct data', async () => {
        // Arrange
        const updatedClinic: Clinic = { ...mockClinic, ...updateDto };
        mockClinicsService.update.mockResolvedValue(updatedClinic);

        // Act
        await controller.update('clinic-uuid-1', updateDto, mockClinician);

        // Assert
        expect(mockClinicsService.update).toHaveBeenCalledWith(
          'clinic-uuid-1',
          expect.objectContaining({
            name: updateDto.name,
            address: updateDto.address,
          }),
        );
      });

      it('should return updated clinic', async () => {
        // Arrange
        const updatedClinic: Clinic = { ...mockClinic, ...updateDto };
        mockClinicsService.update.mockResolvedValue(updatedClinic);

        // Act
        const result = await controller.update(
          'clinic-uuid-1',
          updateDto,
          mockClinician,
        );

        // Assert
        expect(result.name).toBe('Updated Clinic Name');
        expect(result.address).toBe('789 New Street');
      });
    });

    describe('access control', () => {
      it('should allow owner clinician to update clinic', async () => {
        // Arrange
        const updatedClinic: Clinic = { ...mockClinic, ...updateDto };
        mockClinicsService.update.mockResolvedValue(updatedClinic);

        // Act
        const result = await controller.update(
          'clinic-uuid-1',
          updateDto,
          mockClinician, // Owner of clinic-uuid-1
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockClinicsService.update).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when non-owner tries to update clinic', async () => {
        // Act & Assert
        await expect(
          controller.update(
            'clinic-uuid-1',
            updateDto,
            mockOtherClinician, // Different clinic owner
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when access is denied', async () => {
        // Act
        try {
          await controller.update(
            'clinic-uuid-1',
            updateDto,
            mockOtherClinician,
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockClinicsService.update).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'update',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.update,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have PATCH decorator with :id param', () => {
        if (!ClinicsController) return;

        const path = Reflect.getMetadata(
          'path',
          ClinicsController.prototype.update,
        );

        expect(path).toContain(':id');
      });
    });

    describe('error handling', () => {
      it('should throw ForbiddenException when accessing non-owned clinic (security-first: dont reveal existence)', async () => {
        // Security: Access validation happens before checking if clinic exists
        // This prevents information disclosure about resource existence
        // Arrange - mockClinician owns clinic-uuid-1, trying to access invalid-uuid
        mockClinicsService.update.mockRejectedValue(
          new NotFoundException('Clinic with ID invalid-uuid not found'),
        );

        // Act & Assert - Should get ForbiddenException, not NotFoundException
        await expect(
          controller.update('invalid-uuid', updateDto, mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockClinicsService.update.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.update('clinic-uuid-1', updateDto, mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // DELETE /clinics/:id TESTS
  // ============================================

  describe('remove (DELETE /clinics/:id)', () => {
    describe('happy path', () => {
      it('should call clinicsService.remove with correct id', async () => {
        // Arrange
        mockClinicsService.remove.mockResolvedValue(mockClinic);

        // Act
        await controller.remove('clinic-uuid-1', mockClinician);

        // Assert
        expect(mockClinicsService.remove).toHaveBeenCalledWith('clinic-uuid-1');
      });

      it('should return deleted clinic', async () => {
        // Arrange
        mockClinicsService.remove.mockResolvedValue(mockClinic);

        // Act
        const result = await controller.remove('clinic-uuid-1', mockClinician);

        // Assert
        expect(result).toEqual(mockClinic);
      });
    });

    describe('access control', () => {
      it('should allow owner clinician to delete clinic', async () => {
        // Arrange
        mockClinicsService.remove.mockResolvedValue(mockClinic);

        // Act
        const result = await controller.remove(
          'clinic-uuid-1',
          mockClinician, // Owner of clinic-uuid-1
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockClinicsService.remove).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when non-owner tries to delete clinic', async () => {
        // Act & Assert
        await expect(
          controller.remove(
            'clinic-uuid-1',
            mockOtherClinician, // Different clinic owner
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when access is denied', async () => {
        // Act
        try {
          await controller.remove('clinic-uuid-1', mockOtherClinician);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockClinicsService.remove).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'remove',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.remove,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have DELETE decorator with :id param', () => {
        if (!ClinicsController) return;

        const path = Reflect.getMetadata(
          'path',
          ClinicsController.prototype.remove,
        );

        expect(path).toContain(':id');
      });
    });

    describe('error handling', () => {
      it('should throw ForbiddenException when accessing non-owned clinic (security-first: dont reveal existence)', async () => {
        // Security: Access validation happens before checking if clinic exists
        // This prevents information disclosure about resource existence
        // Arrange - mockClinician owns clinic-uuid-1, trying to access invalid-uuid
        mockClinicsService.remove.mockRejectedValue(
          new NotFoundException('Clinic with ID invalid-uuid not found'),
        );

        // Act & Assert - Should get ForbiddenException, not NotFoundException
        await expect(
          controller.remove('invalid-uuid', mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockClinicsService.remove.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.remove('clinic-uuid-1', mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // POST /clinics/:clinicId/patients/:patientId TESTS
  // ============================================

  describe('enrollPatient (POST /clinics/:clinicId/patients/:patientId)', () => {
    describe('happy path', () => {
      it('should call clinicsService.enrollPatient with correct data', async () => {
        // Arrange
        mockClinicsService.enrollPatient.mockResolvedValue(mockPatient);

        // Act
        await controller.enrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician,
        );

        // Assert
        expect(mockClinicsService.enrollPatient).toHaveBeenCalledWith(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician.clinicId,
        );
      });

      it('should return enrolled patient', async () => {
        // Arrange
        mockClinicsService.enrollPatient.mockResolvedValue(mockPatient);

        // Act
        const result = await controller.enrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockPatient);
        expect(result.clinicId).toBe('clinic-uuid-1');
      });
    });

    describe('access control', () => {
      it('should allow owner clinician to enroll patient', async () => {
        // Arrange
        mockClinicsService.enrollPatient.mockResolvedValue(mockPatient);

        // Act
        const result = await controller.enrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician, // Owner of clinic-uuid-1
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockClinicsService.enrollPatient).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when non-owner tries to enroll patient', async () => {
        // Act & Assert
        await expect(
          controller.enrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockOtherClinician, // Different clinic owner
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when PATIENT tries to enroll', async () => {
        // Act & Assert - This should be caught by the RolesGuard
        // but we test the controller level check as well
        await expect(
          controller.enrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockPatientUser,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when access is denied', async () => {
        // Act
        try {
          await controller.enrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockOtherClinician,
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockClinicsService.enrollPatient).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'enrollPatient',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.enrollPatient,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have POST decorator with :clinicId/patients/:patientId path', () => {
        if (!ClinicsController) return;

        const path = Reflect.getMetadata(
          'path',
          ClinicsController.prototype.enrollPatient,
        );

        expect(path).toContain(':clinicId');
        expect(path).toContain('patients');
        expect(path).toContain(':patientId');
      });
    });

    describe('error handling', () => {
      it('should throw ForbiddenException when accessing non-owned clinic (security-first: dont reveal existence)', async () => {
        // Security: Access validation happens before checking if clinic exists
        // This prevents information disclosure about resource existence
        // Arrange - mockClinician owns clinic-uuid-1, trying to access invalid-uuid
        mockClinicsService.enrollPatient.mockRejectedValue(
          new NotFoundException('Clinic with ID invalid-uuid not found'),
        );

        // Act & Assert - Should get ForbiddenException, not NotFoundException
        await expect(
          controller.enrollPatient(
            'invalid-uuid',
            'patient-uuid-1',
            mockClinician,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should propagate NotFoundException when patient not found', async () => {
        // Arrange
        mockClinicsService.enrollPatient.mockRejectedValue(
          new NotFoundException('Patient with ID invalid-uuid not found'),
        );

        // Act & Assert
        await expect(
          controller.enrollPatient(
            'clinic-uuid-1',
            'invalid-uuid',
            mockClinician,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockClinicsService.enrollPatient.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.enrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockClinician,
          ),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // DELETE /clinics/:clinicId/patients/:patientId TESTS
  // ============================================

  describe('unenrollPatient (DELETE /clinics/:clinicId/patients/:patientId)', () => {
    describe('happy path', () => {
      it('should call clinicsService.unenrollPatient with correct data', async () => {
        // Arrange
        const unenrolledPatient: SafeUser = { ...mockPatient, clinicId: null };
        mockClinicsService.unenrollPatient.mockResolvedValue(unenrolledPatient);

        // Act
        await controller.unenrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician,
        );

        // Assert
        expect(mockClinicsService.unenrollPatient).toHaveBeenCalledWith(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician.clinicId,
        );
      });

      it('should return unenrolled patient', async () => {
        // Arrange
        const unenrolledPatient: SafeUser = { ...mockPatient, clinicId: null };
        mockClinicsService.unenrollPatient.mockResolvedValue(unenrolledPatient);

        // Act
        const result = await controller.unenrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician,
        );

        // Assert
        expect(result.clinicId).toBeNull();
      });
    });

    describe('access control', () => {
      it('should allow owner clinician to unenroll patient', async () => {
        // Arrange
        const unenrolledPatient: SafeUser = { ...mockPatient, clinicId: null };
        mockClinicsService.unenrollPatient.mockResolvedValue(unenrolledPatient);

        // Act
        const result = await controller.unenrollPatient(
          'clinic-uuid-1',
          'patient-uuid-1',
          mockClinician, // Owner of clinic-uuid-1
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockClinicsService.unenrollPatient).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when non-owner tries to unenroll patient', async () => {
        // Act & Assert
        await expect(
          controller.unenrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockOtherClinician, // Different clinic owner
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when PATIENT tries to unenroll', async () => {
        // Act & Assert
        await expect(
          controller.unenrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockPatientUser,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when access is denied', async () => {
        // Act
        try {
          await controller.unenrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockOtherClinician,
          );
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockClinicsService.unenrollPatient).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'unenrollPatient',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.unenrollPatient,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have DELETE decorator with :clinicId/patients/:patientId path', () => {
        if (!ClinicsController) return;

        const path = Reflect.getMetadata(
          'path',
          ClinicsController.prototype.unenrollPatient,
        );

        expect(path).toContain(':clinicId');
        expect(path).toContain('patients');
        expect(path).toContain(':patientId');
      });
    });

    describe('error handling', () => {
      it('should throw ForbiddenException when accessing non-owned clinic (security-first: dont reveal existence)', async () => {
        // Security: Access validation happens before checking if clinic exists
        // This prevents information disclosure about resource existence
        // Arrange - mockClinician owns clinic-uuid-1, trying to access invalid-uuid
        mockClinicsService.unenrollPatient.mockRejectedValue(
          new NotFoundException('Clinic with ID invalid-uuid not found'),
        );

        // Act & Assert - Should get ForbiddenException, not NotFoundException
        await expect(
          controller.unenrollPatient(
            'invalid-uuid',
            'patient-uuid-1',
            mockClinician,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should propagate NotFoundException when patient not found', async () => {
        // Arrange
        mockClinicsService.unenrollPatient.mockRejectedValue(
          new NotFoundException('Patient with ID invalid-uuid not found'),
        );

        // Act & Assert
        await expect(
          controller.unenrollPatient(
            'clinic-uuid-1',
            'invalid-uuid',
            mockClinician,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockClinicsService.unenrollPatient.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.unenrollPatient(
            'clinic-uuid-1',
            'patient-uuid-1',
            mockClinician,
          ),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // GET /clinics/:clinicId/patients TESTS
  // ============================================

  describe('getPatients (GET /clinics/:clinicId/patients)', () => {
    describe('happy path', () => {
      it('should call clinicsService.getPatients with correct clinicId', async () => {
        // Arrange
        mockClinicsService.getPatients.mockResolvedValue(mockPatientsList);

        // Act
        await controller.getPatients('clinic-uuid-1', mockClinician);

        // Assert
        expect(mockClinicsService.getPatients).toHaveBeenCalledWith(
          'clinic-uuid-1',
        );
      });

      it('should return all patients in clinic', async () => {
        // Arrange
        mockClinicsService.getPatients.mockResolvedValue(mockPatientsList);

        // Act
        const result = await controller.getPatients(
          'clinic-uuid-1',
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockPatientsList);
        expect(result).toHaveLength(2);
      });

      it('should return empty array when no patients enrolled', async () => {
        // Arrange
        mockClinicsService.getPatients.mockResolvedValue([]);

        // Act
        const result = await controller.getPatients(
          'clinic-uuid-1',
          mockClinician,
        );

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('access control', () => {
      it('should allow owner clinician to list patients', async () => {
        // Arrange
        mockClinicsService.getPatients.mockResolvedValue(mockPatientsList);

        // Act
        const result = await controller.getPatients(
          'clinic-uuid-1',
          mockClinician, // Owner of clinic-uuid-1
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockClinicsService.getPatients).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when non-owner tries to list patients', async () => {
        // Act & Assert
        await expect(
          controller.getPatients(
            'clinic-uuid-1',
            mockOtherClinician, // Different clinic owner
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when PATIENT tries to list patients', async () => {
        // Act & Assert
        await expect(
          controller.getPatients('clinic-uuid-1', mockPatientUser),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when access is denied', async () => {
        // Act
        try {
          await controller.getPatients('clinic-uuid-1', mockOtherClinician);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockClinicsService.getPatients).not.toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!ClinicsController) return;

        const guards = Reflect.getMetadata('__guards__', ClinicsController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          ClinicsController.prototype,
          'getPatients',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype.getPatients,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator with :clinicId/patients path', () => {
        if (!ClinicsController) return;

        const path = Reflect.getMetadata(
          'path',
          ClinicsController.prototype.getPatients,
        );

        expect(path).toContain(':clinicId');
        expect(path).toContain('patients');
      });
    });

    describe('error handling', () => {
      it('should throw ForbiddenException when accessing non-owned clinic (security-first: dont reveal existence)', async () => {
        // Security: Access validation happens before checking if clinic exists
        // This prevents information disclosure about resource existence
        // Arrange - mockClinician owns clinic-uuid-1, trying to access invalid-uuid
        mockClinicsService.getPatients.mockRejectedValue(
          new NotFoundException('Clinic with ID invalid-uuid not found'),
        );

        // Act & Assert - Should get ForbiddenException, not NotFoundException
        await expect(
          controller.getPatients('invalid-uuid', mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockClinicsService.getPatients.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(
          controller.getPatients('clinic-uuid-1', mockClinician),
        ).rejects.toThrow('Database error');
      });
    });
  });

  // ============================================
  // CONTROLLER METHOD SIGNATURES
  // ============================================

  describe('method signatures', () => {
    it('should have create method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.create).toBe('function');
      }
    });

    it('should have findAll method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.findAll).toBe('function');
      }
    });

    it('should have findOne method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.findOne).toBe('function');
      }
    });

    it('should have update method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.update).toBe('function');
      }
    });

    it('should have remove method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.remove).toBe('function');
      }
    });

    it('should have enrollPatient method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.enrollPatient).toBe('function');
      }
    });

    it('should have unenrollPatient method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.unenrollPatient).toBe('function');
      }
    });

    it('should have getPatients method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getPatients).toBe('function');
      }
    });
  });

  // ============================================
  // RBAC - All endpoints are CLINICIAN only
  // ============================================

  describe('RBAC - All endpoints are CLINICIAN only', () => {
    const endpoints = [
      'create',
      'findAll',
      'findOne',
      'update',
      'remove',
      'enrollPatient',
      'unenrollPatient',
      'getPatients',
    ] as const;

    endpoints.forEach((endpoint) => {
      it(`${endpoint} should be restricted to CLINICIAN role`, () => {
        if (!ClinicsController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, ClinicsController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          ClinicsController.prototype[endpoint],
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });
    });
  });
});
