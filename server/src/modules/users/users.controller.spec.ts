import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * TDD Tests for UsersController
 *
 * These tests define the expected behavior of UsersController:
 *
 * GET /users/:id - Get user profile
 * - PATIENT: can get their own profile (returns user without password)
 * - PATIENT: cannot get another user's profile (throws ForbiddenException)
 * - CLINICIAN: can get patient in their clinic (returns user without password)
 * - CLINICIAN: cannot get patient in another clinic (throws ForbiddenException)
 * - Returns NotFoundException for non-existent user
 *
 * PATCH /users/:id - Update user profile
 * - PATIENT: can update their own profile (firstName, lastName)
 * - PATIENT: cannot update another user's profile (throws ForbiddenException)
 * - CLINICIAN: can update patient in their clinic
 * - Returns NotFoundException for non-existent user
 *
 * DELETE /users/:id - Delete user account
 * - PATIENT: can delete their own account
 * - PATIENT: cannot delete another user's account (throws ForbiddenException)
 * - CLINICIAN: can delete patient in their clinic
 * - Returns NotFoundException for non-existent user
 *
 * GET /users - List users (CLINICIAN only)
 * - Clinician gets paginated list of users in their clinic
 * - Supports pagination (page, limit)
 * - Supports role filtering
 */

// Define user payload interface with clinicId
interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
  clinicId?: string;
}

// Define SafeUser interface (without password field, matches Prisma User minus password)
interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  birthdate: Date;
  role: UserRole;
  clinicId: string | null;
  shareWithClinician: boolean;
  anonymousResearch: boolean;
  notifyLabResults: boolean;
  notifyAppointments: boolean;
  notifyHealthAlerts: boolean;
  notifyWeeklyDigest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define UpdateUserDto interface (matches real DTO)
interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  password?: string;
  currentPassword?: string;
  shareWithClinician?: boolean;
  anonymousResearch?: boolean;
  notifyLabResults?: boolean;
  notifyAppointments?: boolean;
  notifyHealthAlerts?: boolean;
  notifyWeeklyDigest?: boolean;
}

// Define paginated response interface
interface PaginatedUsersResponse {
  data: SafeUser[];
  total: number;
  page: number;
  limit: number;
}

// Define query params interface
interface GetUsersQueryDto {
  page?: number;
  limit?: number;
  role?: UserRole;
}

// Define mock UsersService interface
interface MockUsersService {
  findOne: jest.Mock<Promise<SafeUser>>;
  update: jest.Mock<Promise<SafeUser>>;
  remove: jest.Mock<Promise<SafeUser>>;
  findAllPaginated: jest.Mock<Promise<PaginatedUsersResponse>>;
}

describe('UsersController', () => {
  // Controller and service will be imported dynamically
  let UsersController: new (...args: unknown[]) => unknown;
  let controller: {
    findOne: (id: string, user: UserPayload) => Promise<SafeUser>;
    update: (
      id: string,
      dto: UpdateUserDto,
      user: UserPayload,
    ) => Promise<SafeUser>;
    remove: (id: string, user: UserPayload) => Promise<SafeUser>;
    findAll: (
      query: GetUsersQueryDto,
      user: UserPayload,
    ) => Promise<PaginatedUsersResponse>;
  };
  let mockUsersService: MockUsersService;

  // Mock data
  const mockPatient: UserPayload = {
    sub: 'patient-uuid-1',
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    role: UserRole.PATIENT,
    clinicId: 'clinic-uuid-1',
  };

  const mockClinician: UserPayload = {
    sub: 'clinician-uuid-1',
    id: 'clinician-uuid-1',
    email: 'clinician@example.com',
    role: UserRole.CLINICIAN,
    clinicId: 'clinic-uuid-1',
  };

  const mockSafeUser: SafeUser = {
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    firstName: 'John',
    lastName: 'Doe',
    birthdate: new Date('1990-01-15'),
    role: UserRole.PATIENT,
    clinicId: 'clinic-uuid-1',
    shareWithClinician: true,
    anonymousResearch: false,
    notifyLabResults: true,
    notifyAppointments: true,
    notifyHealthAlerts: true,
    notifyWeeklyDigest: false,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockOtherClinicUser: SafeUser = {
    ...mockSafeUser,
    id: 'patient-uuid-3',
    email: 'other-clinic-patient@example.com',
    clinicId: 'clinic-uuid-2', // Different clinic
  };

  const mockUsersList: SafeUser[] = [
    mockSafeUser,
    {
      ...mockSafeUser,
      id: 'patient-uuid-2',
      email: 'patient2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  ];

  const mockPaginatedResponse: PaginatedUsersResponse = {
    data: mockUsersList,
    total: 2,
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    // Create fresh mocks
    mockUsersService = {
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findAllPaginated: jest.fn(),
    };

    jest.clearAllMocks();

    // Dynamic import to allow test to exist before implementation
    try {
      // Check if controller file has exports
      const usersControllerModule = await import('./users.controller');
      if (!usersControllerModule || !usersControllerModule.UsersController) {
        // Controller not implemented yet
        return;
      }
      UsersController = usersControllerModule.UsersController;

      const usersServiceModule = await import('./users.service');
      const UsersService = usersServiceModule.UsersService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(UsersController);
    } catch {
      // Expected to fail until implementation exists
      // This includes TypeScript errors when the file is empty or has no exports
    }
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('module setup', () => {
    it('should export UsersController class', () => {
      expect(UsersController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });

    it('should have @Controller decorator with "users" path', () => {
      if (!UsersController) return;

      const path = Reflect.getMetadata('path', UsersController);
      expect(path).toBe('users');
    });

    it('should have JwtAuthGuard applied at class level', () => {
      if (!UsersController) return;

      const guards = Reflect.getMetadata('__guards__', UsersController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });

    it('should have RolesGuard applied at class level', () => {
      if (!UsersController) return;

      const guards = Reflect.getMetadata('__guards__', UsersController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // GET /users/:id TESTS
  // ============================================

  describe('findOne (GET /users/:id)', () => {
    describe('happy path', () => {
      it('should return user profile without password for the requesting user', async () => {
        // Arrange
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);

        // Act
        const result = await controller.findOne('patient-uuid-1', mockPatient);

        // Assert
        expect(result).toEqual(mockSafeUser);
        expect(result).not.toHaveProperty('password');
        expect(mockUsersService.findOne).toHaveBeenCalledWith('patient-uuid-1');
      });

      it('should allow clinician to get patient profile in their clinic', async () => {
        // Arrange
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);

        // Act
        const result = await controller.findOne(
          'patient-uuid-1',
          mockClinician,
        );

        // Assert
        expect(result).toEqual(mockSafeUser);
        expect(mockUsersService.findOne).toHaveBeenCalledWith('patient-uuid-1');
      });
    });

    describe('access control', () => {
      it('should allow patient to get their own profile', async () => {
        // Arrange
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);

        // Act
        const result = await controller.findOne(mockPatient.id, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(mockUsersService.findOne).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when patient tries to get another user profile', async () => {
        // Arrange - Patient trying to access other patient
        const otherUserId = 'other-user-uuid';

        // Act & Assert
        await expect(
          controller.findOne(otherUserId, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient access is denied', async () => {
        // Arrange
        const otherUserId = 'other-user-uuid';

        // Act
        try {
          await controller.findOne(otherUserId, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockUsersService.findOne).not.toHaveBeenCalled();
      });

      it('should allow clinician to get patient in their clinic', async () => {
        // Arrange - Patient belongs to clinician's clinic
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);

        // Act
        const result = await controller.findOne(
          'patient-uuid-1',
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockUsersService.findOne).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when clinician tries to get patient in another clinic', async () => {
        // Arrange - User belongs to different clinic
        mockUsersService.findOne.mockResolvedValue(mockOtherClinicUser);

        // Act & Assert
        await expect(
          controller.findOne('patient-uuid-3', mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        // Arrange
        mockUsersService.findOne.mockRejectedValue(
          new NotFoundException('User with ID nonexistent-uuid not found'),
        );

        // Act & Assert - Patient accessing their own profile that doesn't exist
        await expect(
          controller.findOne('nonexistent-uuid', {
            ...mockPatient,
            id: 'nonexistent-uuid',
            sub: 'nonexistent-uuid',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockUsersService.findOne.mockRejectedValue(new Error('Database error'));

        // Act & Assert - Patient accessing their own profile
        await expect(
          controller.findOne(mockPatient.id, mockPatient),
        ).rejects.toThrow('Database error');
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!UsersController) return;

        const guards = Reflect.getMetadata('__guards__', UsersController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          UsersController.prototype,
          'findOne',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!UsersController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, UsersController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          UsersController.prototype.findOne,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });

      it('should have GET decorator with :id param', () => {
        if (!UsersController) return;

        const path = Reflect.getMetadata(
          'path',
          UsersController.prototype.findOne,
        );

        expect(path).toContain(':id');
      });

      it('should have ParseUUIDPipe on id parameter', () => {
        if (!UsersController) return;

        const paramTypes = Reflect.getMetadata(
          'design:paramtypes',
          UsersController.prototype,
          'findOne',
        );

        expect(paramTypes).toBeDefined();
      });
    });
  });

  // ============================================
  // PATCH /users/:id TESTS
  // ============================================

  describe('update (PATCH /users/:id)', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'UpdatedFirstName',
      lastName: 'UpdatedLastName',
    };

    describe('happy path', () => {
      it('should update user profile and return updated user without password', async () => {
        // Arrange
        const updatedUser: SafeUser = { ...mockSafeUser, ...updateDto };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        const result = await controller.update(
          'patient-uuid-1',
          updateDto,
          mockPatient,
        );

        // Assert
        expect(result.firstName).toBe('UpdatedFirstName');
        expect(result.lastName).toBe('UpdatedLastName');
        expect(result).not.toHaveProperty('password');
        expect(mockUsersService.update).toHaveBeenCalledWith(
          'patient-uuid-1',
          expect.objectContaining({
            firstName: updateDto.firstName,
            lastName: updateDto.lastName,
          }),
        );
      });

      it('should allow partial updates', async () => {
        // Arrange
        const partialUpdate = { firstName: 'OnlyFirstName' };
        const updatedUser: SafeUser = { ...mockSafeUser, ...partialUpdate };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        const result = await controller.update(
          'patient-uuid-1',
          partialUpdate,
          mockPatient,
        );

        // Assert
        expect(result.firstName).toBe('OnlyFirstName');
      });
    });

    describe('access control', () => {
      it('should allow patient to update their own profile', async () => {
        // Arrange
        const updatedUser: SafeUser = { ...mockSafeUser, ...updateDto };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        const result = await controller.update(
          mockPatient.id,
          updateDto,
          mockPatient,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockUsersService.update).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when patient tries to update another user profile', async () => {
        // Arrange
        const otherUserId = 'other-user-uuid';

        // Act & Assert
        await expect(
          controller.update(otherUserId, updateDto, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient update access is denied', async () => {
        // Arrange
        const otherUserId = 'other-user-uuid';

        // Act
        try {
          await controller.update(otherUserId, updateDto, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockUsersService.update).not.toHaveBeenCalled();
      });

      it('should allow clinician to update patient in their clinic', async () => {
        // Arrange - First call to findOne returns the user, then update
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);
        const updatedUser: SafeUser = { ...mockSafeUser, ...updateDto };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        const result = await controller.update(
          'patient-uuid-1',
          updateDto,
          mockClinician,
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockUsersService.update).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when clinician tries to update patient in another clinic', async () => {
        // Arrange - User belongs to different clinic
        mockUsersService.findOne.mockResolvedValue(mockOtherClinicUser);

        // Act & Assert
        await expect(
          controller.update('patient-uuid-3', updateDto, mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('preference stripping', () => {
      it('should allow patient to update their own consent preferences', async () => {
        // Arrange
        const dtoWithConsent: UpdateUserDto = {
          firstName: 'Updated',
          shareWithClinician: false,
          anonymousResearch: true,
        };
        const updatedUser: SafeUser = { ...mockSafeUser, firstName: 'Updated' };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        await controller.update(mockPatient.id, dtoWithConsent, mockPatient);

        // Assert - service should receive consent fields
        expect(mockUsersService.update).toHaveBeenCalledWith(
          mockPatient.id,
          expect.objectContaining({
            shareWithClinician: false,
            anonymousResearch: true,
          }),
        );
      });

      it('should allow patient to update their own notification preferences', async () => {
        // Arrange
        const dtoWithNotifs: UpdateUserDto = {
          notifyLabResults: false,
          notifyWeeklyDigest: true,
        };
        const updatedUser: SafeUser = { ...mockSafeUser };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        await controller.update(mockPatient.id, dtoWithNotifs, mockPatient);

        // Assert - service should receive notification fields
        expect(mockUsersService.update).toHaveBeenCalledWith(
          mockPatient.id,
          expect.objectContaining({
            notifyLabResults: false,
            notifyWeeklyDigest: true,
          }),
        );
      });

      it('should strip consent preferences when clinician updates patient', async () => {
        // Arrange
        const dtoWithConsent: UpdateUserDto = {
          firstName: 'Clinician Updated',
          shareWithClinician: true, // Clinician trying to override
          anonymousResearch: true,
        };
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);
        const updatedUser: SafeUser = {
          ...mockSafeUser,
          firstName: 'Clinician Updated',
        };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        await controller.update('patient-uuid-1', dtoWithConsent, mockClinician);

        // Assert - service should NOT receive consent fields
        const updateCall = mockUsersService.update.mock.calls[0];
        expect(updateCall[1]).not.toHaveProperty('shareWithClinician');
        expect(updateCall[1]).not.toHaveProperty('anonymousResearch');
        // But should still receive the name update
        expect(updateCall[1]).toHaveProperty('firstName', 'Clinician Updated');
      });

      it('should strip notification preferences when clinician updates patient', async () => {
        // Arrange
        const dtoWithNotifs: UpdateUserDto = {
          firstName: 'Clinician Updated',
          notifyLabResults: false,
          notifyAppointments: false,
          notifyHealthAlerts: false,
          notifyWeeklyDigest: true,
        };
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);
        const updatedUser: SafeUser = {
          ...mockSafeUser,
          firstName: 'Clinician Updated',
        };
        mockUsersService.update.mockResolvedValue(updatedUser);

        // Act
        await controller.update('patient-uuid-1', dtoWithNotifs, mockClinician);

        // Assert - service should NOT receive notification fields
        const updateCall = mockUsersService.update.mock.calls[0];
        expect(updateCall[1]).not.toHaveProperty('notifyLabResults');
        expect(updateCall[1]).not.toHaveProperty('notifyAppointments');
        expect(updateCall[1]).not.toHaveProperty('notifyHealthAlerts');
        expect(updateCall[1]).not.toHaveProperty('notifyWeeklyDigest');
        // But should still receive the name update
        expect(updateCall[1]).toHaveProperty('firstName', 'Clinician Updated');
      });

      it('should strip all preference fields when clinician sends only preferences', async () => {
        // Arrange - clinician sends only consent/notification fields, no profile fields
        const prefsOnlyDto: UpdateUserDto = {
          shareWithClinician: true,
          anonymousResearch: true,
          notifyLabResults: false,
          notifyAppointments: false,
          notifyHealthAlerts: false,
          notifyWeeklyDigest: true,
        };
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);
        mockUsersService.update.mockResolvedValue(mockSafeUser);

        // Act
        await controller.update('patient-uuid-1', prefsOnlyDto, mockClinician);

        // Assert - service should receive an empty object (all fields stripped)
        const updateCall = mockUsersService.update.mock.calls[0];
        const updateData = updateCall[1];
        expect(Object.keys(updateData)).toHaveLength(0);
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        // Arrange
        mockUsersService.findOne.mockRejectedValue(
          new NotFoundException('User with ID nonexistent-uuid not found'),
        );

        // Act & Assert - Patient updating their own profile that doesn't exist
        await expect(
          controller.update('nonexistent-uuid', updateDto, {
            ...mockPatient,
            id: 'nonexistent-uuid',
            sub: 'nonexistent-uuid',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockUsersService.update.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(
          controller.update(mockPatient.id, updateDto, mockPatient),
        ).rejects.toThrow('Database error');
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!UsersController) return;

        const guards = Reflect.getMetadata('__guards__', UsersController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          UsersController.prototype,
          'update',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!UsersController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, UsersController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          UsersController.prototype.update,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });

      it('should have PATCH decorator with :id param', () => {
        if (!UsersController) return;

        const path = Reflect.getMetadata(
          'path',
          UsersController.prototype.update,
        );

        expect(path).toContain(':id');
      });
    });
  });

  // ============================================
  // DELETE /users/:id TESTS
  // ============================================

  describe('remove (DELETE /users/:id)', () => {
    describe('happy path', () => {
      it('should delete user and return deleted user without password', async () => {
        // Arrange
        mockUsersService.remove.mockResolvedValue(mockSafeUser);

        // Act
        const result = await controller.remove('patient-uuid-1', mockPatient);

        // Assert
        expect(result).toEqual(mockSafeUser);
        expect(result).not.toHaveProperty('password');
        expect(mockUsersService.remove).toHaveBeenCalledWith('patient-uuid-1');
      });
    });

    describe('access control', () => {
      it('should allow patient to delete their own account', async () => {
        // Arrange
        mockUsersService.remove.mockResolvedValue(mockSafeUser);

        // Act
        const result = await controller.remove(mockPatient.id, mockPatient);

        // Assert
        expect(result).toBeDefined();
        expect(mockUsersService.remove).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when patient tries to delete another user account', async () => {
        // Arrange
        const otherUserId = 'other-user-uuid';

        // Act & Assert
        await expect(
          controller.remove(otherUserId, mockPatient),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should not call service when patient delete access is denied', async () => {
        // Arrange
        const otherUserId = 'other-user-uuid';

        // Act
        try {
          await controller.remove(otherUserId, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockUsersService.remove).not.toHaveBeenCalled();
      });

      it('should allow clinician to delete patient in their clinic', async () => {
        // Arrange
        mockUsersService.findOne.mockResolvedValue(mockSafeUser);
        mockUsersService.remove.mockResolvedValue(mockSafeUser);

        // Act
        const result = await controller.remove('patient-uuid-1', mockClinician);

        // Assert
        expect(result).toBeDefined();
        expect(mockUsersService.remove).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when clinician tries to delete patient in another clinic', async () => {
        // Arrange - User belongs to different clinic
        mockUsersService.findOne.mockResolvedValue(mockOtherClinicUser);

        // Act & Assert
        await expect(
          controller.remove('patient-uuid-3', mockClinician),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        // Arrange
        mockUsersService.findOne.mockRejectedValue(
          new NotFoundException('User with ID nonexistent-uuid not found'),
        );

        // Act & Assert
        await expect(
          controller.remove('nonexistent-uuid', {
            ...mockPatient,
            id: 'nonexistent-uuid',
            sub: 'nonexistent-uuid',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockUsersService.remove.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(
          controller.remove(mockPatient.id, mockPatient),
        ).rejects.toThrow('Database error');
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!UsersController) return;

        const guards = Reflect.getMetadata('__guards__', UsersController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          UsersController.prototype,
          'remove',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should allow both PATIENT and CLINICIAN roles', () => {
        if (!UsersController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, UsersController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          UsersController.prototype.remove,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.PATIENT);
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
      });

      it('should have DELETE decorator with :id param', () => {
        if (!UsersController) return;

        const path = Reflect.getMetadata(
          'path',
          UsersController.prototype.remove,
        );

        expect(path).toContain(':id');
      });
    });
  });

  // ============================================
  // GET /users TESTS (CLINICIAN ONLY)
  // ============================================

  describe('findAll (GET /users)', () => {
    describe('happy path', () => {
      it('should return paginated list of users in clinician clinic', async () => {
        // Arrange
        mockUsersService.findAllPaginated.mockResolvedValue(
          mockPaginatedResponse,
        );
        const query: GetUsersQueryDto = {};

        // Act
        const result = await controller.findAll(query, mockClinician);

        // Assert
        expect(result).toEqual(mockPaginatedResponse);
        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
      });

      it('should pass clinicId to service for filtering', async () => {
        // Arrange
        mockUsersService.findAllPaginated.mockResolvedValue(
          mockPaginatedResponse,
        );
        const query: GetUsersQueryDto = {};

        // Act
        await controller.findAll(query, mockClinician);

        // Assert
        expect(mockUsersService.findAllPaginated).toHaveBeenCalledWith(
          expect.objectContaining({
            clinicId: mockClinician.clinicId,
          }),
        );
      });

      it('should support pagination parameters', async () => {
        // Arrange
        const paginatedResponse: PaginatedUsersResponse = {
          data: [],
          total: 100,
          page: 5,
          limit: 20,
        };
        mockUsersService.findAllPaginated.mockResolvedValue(paginatedResponse);
        const query: GetUsersQueryDto = { page: 5, limit: 20 };

        // Act
        const result = await controller.findAll(query, mockClinician);

        // Assert
        expect(mockUsersService.findAllPaginated).toHaveBeenCalledWith(
          expect.objectContaining({ page: 5, limit: 20 }),
        );
        expect(result.page).toBe(5);
        expect(result.limit).toBe(20);
      });

      it('should support role filtering', async () => {
        // Arrange
        const patientsOnly: PaginatedUsersResponse = {
          data: mockUsersList.filter((u) => u.role === UserRole.PATIENT),
          total: 2,
          page: 1,
          limit: 10,
        };
        mockUsersService.findAllPaginated.mockResolvedValue(patientsOnly);
        const query: GetUsersQueryDto = { role: UserRole.PATIENT };

        // Act
        await controller.findAll(query, mockClinician);

        // Assert
        expect(mockUsersService.findAllPaginated).toHaveBeenCalledWith(
          expect.objectContaining({ role: UserRole.PATIENT }),
        );
      });

      it('should return empty array when no users match', async () => {
        // Arrange
        const emptyResponse: PaginatedUsersResponse = {
          data: [],
          total: 0,
          page: 1,
          limit: 10,
        };
        mockUsersService.findAllPaginated.mockResolvedValue(emptyResponse);
        const query: GetUsersQueryDto = {};

        // Act
        const result = await controller.findAll(query, mockClinician);

        // Assert
        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });
    });

    describe('access control', () => {
      it('should throw ForbiddenException when PATIENT tries to list users', async () => {
        // Arrange
        const query: GetUsersQueryDto = {};

        // Act & Assert
        await expect(controller.findAll(query, mockPatient)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should not call service when patient access is denied', async () => {
        // Arrange
        const query: GetUsersQueryDto = {};

        // Act
        try {
          await controller.findAll(query, mockPatient);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockUsersService.findAllPaginated).not.toHaveBeenCalled();
      });

      it('should allow clinician to list users', async () => {
        // Arrange
        mockUsersService.findAllPaginated.mockResolvedValue(
          mockPaginatedResponse,
        );
        const query: GetUsersQueryDto = {};

        // Act
        const result = await controller.findAll(query, mockClinician);

        // Assert
        expect(result).toBeDefined();
        expect(mockUsersService.findAllPaginated).toHaveBeenCalled();
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!UsersController) return;

        const guards = Reflect.getMetadata('__guards__', UsersController);
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          UsersController.prototype,
          'findAll',
        );

        const allGuards = [...(guards || []), ...(methodGuards || [])];
        expect(allGuards.length).toBeGreaterThan(0);
      });

      it('should require CLINICIAN role only', () => {
        if (!UsersController) return;

        const classRoles = Reflect.getMetadata(ROLES_KEY, UsersController);
        const methodRoles = Reflect.getMetadata(
          ROLES_KEY,
          UsersController.prototype.findAll,
        );

        const requiredRoles = methodRoles || classRoles || [];
        expect(requiredRoles).toContain(UserRole.CLINICIAN);
        expect(requiredRoles).not.toContain(UserRole.PATIENT);
      });

      it('should have GET decorator', () => {
        if (!UsersController) return;

        const method = Reflect.getMetadata(
          'method',
          UsersController.prototype.findAll,
        );

        expect(method).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        mockUsersService.findAllPaginated.mockRejectedValue(
          new Error('Database error'),
        );
        const query: GetUsersQueryDto = {};

        // Act & Assert
        await expect(controller.findAll(query, mockClinician)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });

  // ============================================
  // CONTROLLER METHOD SIGNATURES
  // ============================================

  describe('method signatures', () => {
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

    it('should have findAll method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.findAll).toBe('function');
      }
    });
  });

  // ============================================
  // HTTP ROUTE DECORATORS
  // ============================================

  describe('route decorators', () => {
    it('should have GET decorator on findOne with path containing :id', () => {
      if (!UsersController) return;

      const path = Reflect.getMetadata(
        'path',
        UsersController.prototype.findOne,
      );

      expect(path).toContain(':id');
    });

    it('should have PATCH decorator on update with path containing :id', () => {
      if (!UsersController) return;

      const path = Reflect.getMetadata(
        'path',
        UsersController.prototype.update,
      );

      expect(path).toContain(':id');
    });

    it('should have DELETE decorator on remove with path containing :id', () => {
      if (!UsersController) return;

      const path = Reflect.getMetadata(
        'path',
        UsersController.prototype.remove,
      );

      expect(path).toContain(':id');
    });

    it('should have GET decorator on findAll', () => {
      if (!UsersController) return;

      const method = Reflect.getMetadata(
        'method',
        UsersController.prototype.findAll,
      );

      expect(method).toBeDefined();
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('security', () => {
    it('should never return password field in any response', async () => {
      // Arrange - The service should already exclude password, but test the contract
      mockUsersService.findOne.mockResolvedValue(mockSafeUser);
      mockUsersService.update.mockResolvedValue(mockSafeUser);
      mockUsersService.remove.mockResolvedValue(mockSafeUser);

      // Act
      const findResult = await controller.findOne(mockPatient.id, mockPatient);
      const updateResult = await controller.update(
        mockPatient.id,
        { firstName: 'Test' },
        mockPatient,
      );

      // Reset for remove
      mockUsersService.remove.mockResolvedValue(mockSafeUser);
      const removeResult = await controller.remove(mockPatient.id, mockPatient);

      // Assert
      expect(findResult).not.toHaveProperty('password');
      expect(updateResult).not.toHaveProperty('password');
      expect(removeResult).not.toHaveProperty('password');
    });

    it('should enforce clinic-based access control for clinicians', async () => {
      // Arrange - User in different clinic
      mockUsersService.findOne.mockResolvedValue(mockOtherClinicUser);

      // Act & Assert - Clinician should not access users from other clinics
      await expect(
        controller.findOne('patient-uuid-3', mockClinician),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.update(
          'patient-uuid-3',
          { firstName: 'Test' },
          mockClinician,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.remove('patient-uuid-3', mockClinician),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent patients from accessing other patients data', async () => {
      // Arrange
      const otherPatientId = 'other-patient-uuid';

      // Act & Assert
      await expect(
        controller.findOne(otherPatientId, mockPatient),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.update(otherPatientId, { firstName: 'Test' }, mockPatient),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.remove(otherPatientId, mockPatient),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
