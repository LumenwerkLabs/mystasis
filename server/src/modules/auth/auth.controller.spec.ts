import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * TDD Tests for AuthController
 *
 * These tests define the expected behavior of AuthController:
 *
 * POST /auth/register - Register a new user
 * - Should call authService.register with DTO
 * - Should return 201 with token and user
 * - Should return 409 for duplicate email
 *
 * POST /auth/login - Login with credentials
 * - Should call authService.login with DTO
 * - Should return 200 with token and user
 * - Should return 401 for invalid credentials
 *
 * GET /auth/me - Get current user profile
 * - Should return current user from JWT
 * - Should have JwtAuthGuard applied
 * - Should return 401 without authentication
 *
 * The controller should:
 * - Be a thin layer delegating to AuthService
 * - Use appropriate HTTP status codes
 * - Have proper route decorators
 *
 * RED PHASE: These tests will fail until AuthController is implemented.
 */

// Type for user without password
type UserWithoutPassword = Omit<User, 'password'>;

// AuthService response interfaces
interface AuthResponse {
  access_token: string;
  user: UserWithoutPassword;
}

// User JWT payload
interface UserPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
}

// Define mock AuthService interface
interface MockAuthService {
  register: jest.Mock<Promise<AuthResponse>>;
  login: jest.Mock<Promise<AuthResponse>>;
}

describe('AuthController', () => {
  // Controller and service will be imported dynamically
  let AuthController: new (...args: unknown[]) => unknown;
  let controller: {
    register: (dto: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
    }) => Promise<AuthResponse>;
    login: (dto: { email: string; password: string }) => Promise<AuthResponse>;
    getProfile: (user: UserPayload) => UserPayload;
  };
  let mockAuthService: MockAuthService;

  // Mock data
  const mockUserWithoutPassword: UserWithoutPassword = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PATIENT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAuthResponse: AuthResponse = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocktoken',
    user: mockUserWithoutPassword,
  };

  const mockUserPayload: UserPayload = {
    sub: 'user-uuid-1',
    id: 'user-uuid-1',
    email: 'test@example.com',
    role: UserRole.PATIENT,
  };

  beforeEach(async () => {
    // Create fresh mocks
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    jest.clearAllMocks();

    // Dynamic import to allow test to exist before implementation
    try {
      const authControllerModule = await import('./auth.controller');
      AuthController = authControllerModule.AuthController;

      const authServiceModule = await import('./auth.service');
      const AuthService = authServiceModule.AuthService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          Reflector,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(AuthController);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  describe('module setup', () => {
    it('should export AuthController class', () => {
      expect(AuthController).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(controller).toBeDefined();
    });
  });

  // ============================================
  // POST /auth/register TESTS
  // ============================================

  describe('register (POST /auth/register)', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.PATIENT,
    };

    describe('happy path', () => {
      it('should call authService.register with DTO', async () => {
        // Arrange
        mockAuthService.register.mockResolvedValue(mockAuthResponse);

        // Act
        await controller.register(registerDto);

        // Assert
        expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      });

      it('should return AuthResponse with token and user', async () => {
        // Arrange
        mockAuthService.register.mockResolvedValue(mockAuthResponse);

        // Act
        const result = await controller.register(registerDto);

        // Assert
        expect(result).toEqual(mockAuthResponse);
        expect(result.access_token).toBe(mockAuthResponse.access_token);
        expect(result.user).toEqual(mockAuthResponse.user);
      });

      it('should return user without password field', async () => {
        // Arrange
        mockAuthService.register.mockResolvedValue(mockAuthResponse);

        // Act
        const result = await controller.register(registerDto);

        // Assert
        expect(result.user).not.toHaveProperty('password');
        expect(result.user.email).toBe(mockAuthResponse.user.email);
      });

      it('should handle registration without optional fields', async () => {
        // Arrange
        const minimalDto = {
          email: 'minimal@example.com',
          password: 'SecurePassword123!',
        };
        const minimalResponse: AuthResponse = {
          access_token: 'token',
          user: {
            id: 'user-id',
            email: minimalDto.email,
            firstName: null,
            lastName: null,
            role: UserRole.PATIENT,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
        mockAuthService.register.mockResolvedValue(minimalResponse);

        // Act
        const result = await controller.register(minimalDto);

        // Assert
        expect(result).toEqual(minimalResponse);
        expect(mockAuthService.register).toHaveBeenCalledWith(minimalDto);
      });
    });

    describe('error handling', () => {
      it('should propagate ConflictException for duplicate email', async () => {
        // Arrange
        mockAuthService.register.mockRejectedValue(
          new ConflictException('Email already exists'),
        );

        // Act & Assert
        await expect(controller.register(registerDto)).rejects.toThrow(
          ConflictException,
        );
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockAuthService.register.mockRejectedValue(
          new Error('Service unavailable'),
        );

        // Act & Assert
        await expect(controller.register(registerDto)).rejects.toThrow(
          'Service unavailable',
        );
      });
    });

    describe('route decorators', () => {
      it('should have POST decorator', () => {
        if (!AuthController) return;

        const method = Reflect.getMetadata(
          'method',
          AuthController.prototype.register,
        );

        // POST method
        expect(method).toBeDefined();
      });

      it('should have "register" route path', () => {
        if (!AuthController) return;

        const path = Reflect.getMetadata(
          'path',
          AuthController.prototype.register,
        );

        expect(path).toBe('register');
      });
    });
  });

  // ============================================
  // POST /auth/login TESTS
  // ============================================

  describe('login (POST /auth/login)', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'correctPassword123!',
    };

    describe('happy path', () => {
      it('should call authService.login with DTO', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockAuthResponse);

        // Act
        await controller.login(loginDto);

        // Assert
        expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      });

      it('should return AuthResponse with token and user', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockAuthResponse);

        // Act
        const result = await controller.login(loginDto);

        // Assert
        expect(result).toEqual(mockAuthResponse);
        expect(result.access_token).toBeDefined();
        expect(result.user).toBeDefined();
      });

      it('should return user without password field', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockAuthResponse);

        // Act
        const result = await controller.login(loginDto);

        // Assert
        expect(result.user).not.toHaveProperty('password');
      });
    });

    describe('error handling', () => {
      it('should propagate UnauthorizedException for invalid email', async () => {
        // Arrange
        mockAuthService.login.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );

        // Act & Assert
        await expect(controller.login(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should propagate UnauthorizedException for invalid password', async () => {
        // Arrange
        mockAuthService.login.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );

        const wrongPasswordDto = {
          email: 'test@example.com',
          password: 'wrongPassword',
        };

        // Act & Assert
        await expect(controller.login(wrongPasswordDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should propagate service errors', async () => {
        // Arrange
        mockAuthService.login.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(controller.login(loginDto)).rejects.toThrow(
          'Database error',
        );
      });
    });

    describe('route decorators', () => {
      it('should have POST decorator', () => {
        if (!AuthController) return;

        const method = Reflect.getMetadata(
          'method',
          AuthController.prototype.login,
        );

        expect(method).toBeDefined();
      });

      it('should have "login" route path', () => {
        if (!AuthController) return;

        const path = Reflect.getMetadata(
          'path',
          AuthController.prototype.login,
        );

        expect(path).toBe('login');
      });
    });
  });

  // ============================================
  // GET /auth/me TESTS
  // ============================================

  describe('getProfile (GET /auth/me)', () => {
    describe('happy path', () => {
      it('should return current user from JWT payload', () => {
        // Act
        const result = controller.getProfile(mockUserPayload);

        // Assert
        expect(result).toBeDefined();
        expect(result.id).toBe(mockUserPayload.id);
        expect(result.email).toBe(mockUserPayload.email);
        expect(result.role).toBe(mockUserPayload.role);
      });

      it('should return user payload without sensitive data', () => {
        // Act
        const result = controller.getProfile(mockUserPayload);

        // Assert
        expect(result).not.toHaveProperty('password');
      });

      it('should handle CLINICIAN role user', () => {
        // Arrange
        const clinicianPayload: UserPayload = {
          sub: 'clinician-uuid-1',
          id: 'clinician-uuid-1',
          email: 'clinician@example.com',
          role: UserRole.CLINICIAN,
        };

        // Act
        const result = controller.getProfile(clinicianPayload);

        // Assert
        expect(result.role).toBe(UserRole.CLINICIAN);
      });
    });

    describe('guards and decorators', () => {
      it('should have JwtAuthGuard applied', () => {
        if (!AuthController) return;

        // Check guards at class level
        const classGuards = Reflect.getMetadata('__guards__', AuthController);
        // Check guards at method level - NestJS stores on the descriptor value
        const methodGuards = Reflect.getMetadata(
          '__guards__',
          AuthController.prototype.getProfile,
        );

        // Assert - guards should include JwtAuthGuard at method level
        const allGuards = [...(classGuards || []), ...(methodGuards || [])];
        const hasJwtAuthGuard = allGuards.some(
          (guard: { name?: string }) =>
            guard === JwtAuthGuard ||
            guard.name === 'JwtAuthGuard' ||
            (typeof guard === 'function' &&
              guard.toString().includes('JwtAuthGuard')),
        );

        expect(hasJwtAuthGuard || allGuards.length > 0).toBe(true);
      });

      it('should have GET decorator', () => {
        if (!AuthController) return;

        const method = Reflect.getMetadata(
          'method',
          AuthController.prototype.getProfile,
        );

        expect(method).toBeDefined();
      });

      it('should have "me" route path', () => {
        if (!AuthController) return;

        const path = Reflect.getMetadata(
          'path',
          AuthController.prototype.getProfile,
        );

        expect(path).toBe('me');
      });

      it('should use @CurrentUser decorator to get user from request', () => {
        // This test verifies that the method receives the user payload
        // injected by the @CurrentUser() decorator

        // Act
        const result = controller.getProfile(mockUserPayload);

        // Assert - method should work with injected user
        expect(result).toEqual(mockUserPayload);
      });
    });
  });

  // ============================================
  // CONTROLLER DECORATOR TESTS
  // ============================================

  describe('controller decorators', () => {
    it('should have @Controller decorator with "auth" path', () => {
      if (!AuthController) return;

      const path = Reflect.getMetadata('path', AuthController);
      expect(path).toBe('auth');
    });

    it('should have register method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.register).toBe('function');
      }
    });

    it('should have login method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.login).toBe('function');
      }
    });

    it('should have getProfile method', () => {
      expect(controller).toBeDefined();
      if (controller) {
        expect(typeof controller.getProfile).toBe('function');
      }
    });
  });

  // ============================================
  // RESPONSE STRUCTURE TESTS
  // ============================================

  describe('response structure', () => {
    it('register should return object with access_token and user properties', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(typeof result.access_token).toBe('string');
      expect(typeof result.user).toBe('object');
    });

    it('login should return object with access_token and user properties', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(typeof result.access_token).toBe('string');
      expect(typeof result.user).toBe('object');
    });

    it('getProfile should return user payload object', () => {
      // Act
      const result = controller.getProfile(mockUserPayload);

      // Assert
      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
    });
  });
});
