import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * TDD Tests for RolesGuard
 *
 * These tests define the expected behavior of RolesGuard:
 * 1. Allow access when user has required role
 * 2. Deny access when user lacks required role
 * 3. Allow access when no roles are required (public endpoint)
 * 4. Handle CLINICIAN role check correctly
 * 5. Handle PATIENT role check correctly
 * 6. Get roles from @Roles() decorator metadata
 *
 * The guard should:
 * - Use Reflector to read roles metadata from handler and class
 * - Check if user.role is included in required roles array
 * - Allow access if no roles are specified (public or auth-only endpoint)
 * - Throw ForbiddenException when role check fails
 */

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  // Mock user data
  const mockPatient = {
    id: 'patient-uuid-1',
    email: 'patient@example.com',
    role: UserRole.PATIENT,
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockClinician = {
    id: 'clinician-uuid-1',
    email: 'clinician@example.com',
    role: UserRole.CLINICIAN,
    firstName: 'Dr. Jane',
    lastName: 'Smith',
  };

  // Helper to create mock ExecutionContext
  const createMockExecutionContext = (
    user: typeof mockPatient | typeof mockClinician | null,
  ): ExecutionContext => {
    const mockRequest = {
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  describe('module setup', () => {
    it('should export RolesGuard class', () => {
      expect(RolesGuard).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(guard).toBeDefined();
    });

    it('should implement CanActivate interface', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });

  describe('canActivate - no roles required', () => {
    it('should allow access when no roles are required (public endpoint)', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(mockPatient);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should allow access when roles array is empty', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext(mockPatient);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access for unauthenticated user when no roles required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(null);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('canActivate - PATIENT role', () => {
    it('should allow access when user has PATIENT role and PATIENT is required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
      const context = createMockExecutionContext(mockPatient);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user has PATIENT role but CLINICIAN is required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.CLINICIAN]);
      const context = createMockExecutionContext(mockPatient);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access when PATIENT is one of multiple allowed roles', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.PATIENT,
        UserRole.CLINICIAN,
      ]);
      const context = createMockExecutionContext(mockPatient);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('canActivate - CLINICIAN role', () => {
    it('should allow access when user has CLINICIAN role and CLINICIAN is required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.CLINICIAN]);
      const context = createMockExecutionContext(mockClinician);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user has CLINICIAN role but PATIENT is required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
      const context = createMockExecutionContext(mockClinician);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access when CLINICIAN is one of multiple allowed roles', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.PATIENT,
        UserRole.CLINICIAN,
      ]);
      const context = createMockExecutionContext(mockClinician);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('canActivate - error handling', () => {
    it('should throw ForbiddenException when user lacks required role', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.CLINICIAN]);
      const context = createMockExecutionContext(mockPatient);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when no user in request but role required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
      const context = createMockExecutionContext(null);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with descriptive message', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.CLINICIAN]);
      const context = createMockExecutionContext(mockPatient);

      // Act & Assert
      try {
        guard.canActivate(context);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toMatch(
          /insufficient|permission|access|role/i,
        );
      }
    });
  });

  describe('canActivate - metadata extraction', () => {
    it('should use ROLES_KEY to extract metadata', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
      const context = createMockExecutionContext(mockPatient);

      // Act
      guard.canActivate(context);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        ROLES_KEY,
        expect.any(Array),
      );
    });

    it('should check both handler and class for roles metadata', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
      const context = createMockExecutionContext(mockPatient);

      // Act
      guard.canActivate(context);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should override class-level roles with handler-level roles', () => {
      // This test verifies that getAllAndOverride is used (not getAllAndMerge)
      // which means handler-level roles take precedence over class-level

      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.CLINICIAN]);
      const context = createMockExecutionContext(mockClinician);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      // The key behavior is that getAllAndOverride was called, not getAllAndMerge
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
    });
  });

  describe('integration with @Roles decorator', () => {
    // These tests verify the guard works correctly with the @Roles decorator pattern
    // The actual decorator is tested separately, but these ensure the contract is met

    it('should handle single role from decorator', () => {
      // Arrange - simulating @Roles(UserRole.CLINICIAN)
      reflector.getAllAndOverride.mockReturnValue([UserRole.CLINICIAN]);
      const context = createMockExecutionContext(mockClinician);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle multiple roles from decorator', () => {
      // Arrange - simulating @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.PATIENT,
        UserRole.CLINICIAN,
      ]);
      const context = createMockExecutionContext(mockPatient);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
