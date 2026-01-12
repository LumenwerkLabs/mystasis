import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

/**
 * TDD Tests for AuthService
 *
 * These tests define the expected behavior of AuthService:
 * 1. register() - Creates user and returns JWT token
 * 2. login() - Validates credentials and returns JWT token
 * 3. validateUser() - Validates user credentials for Passport strategy
 *
 * Security considerations:
 * - Passwords are compared using bcrypt (via UsersService)
 * - JWT tokens are signed with configurable secret and expiration
 * - User password is never returned in responses
 *
 * RED PHASE: These tests will fail until AuthService is implemented.
 */

// Define mock types for dependencies
interface MockUsersService {
  create: jest.Mock;
  findByEmail: jest.Mock;
}

interface MockJwtService {
  sign: jest.Mock;
  signAsync: jest.Mock;
}

// Type for user without password
type UserWithoutPassword = Omit<User, 'password'>;

// AuthService response interfaces
interface AuthResponse {
  access_token: string;
  user: UserWithoutPassword;
}

describe('AuthService', () => {
  // Service will be imported dynamically
  let AuthService: new (...args: unknown[]) => unknown;
  let service: {
    register: (dto: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
    }) => Promise<AuthResponse>;
    login: (dto: { email: string; password: string }) => Promise<AuthResponse>;
    validateUser: (
      email: string,
      password: string,
    ) => Promise<UserWithoutPassword | null>;
  };
  let mockUsersService: MockUsersService;
  let mockJwtService: MockJwtService;

  // Mock user data
  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: '$2b$10$hashedPasswordHere',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PATIENT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUserWithoutPassword: UserWithoutPassword = {
    id: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    role: mockUser.role,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocktoken';

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
      signAsync: jest.fn(),
    };

    jest.clearAllMocks();

    // Dynamic import to allow test to exist before implementation
    try {
      const authServiceModule = await import('./auth.service');
      AuthService = authServiceModule.AuthService;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UsersService, useValue: mockUsersService },
          { provide: JwtService, useValue: mockJwtService },
        ],
      }).compile();

      service = module.get(AuthService);
    } catch {
      // Expected to fail until implementation exists
    }
  });

  describe('module setup', () => {
    it('should export AuthService class', () => {
      expect(AuthService).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // REGISTER TESTS
  // ============================================

  describe('register', () => {
    // Note: role is intentionally excluded from DTO - all users register as PATIENT
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    describe('happy path', () => {
      it('should create user and return JWT token on successful registration', async () => {
        // Arrange
        const createdUser: UserWithoutPassword = {
          id: 'new-user-uuid',
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role: UserRole.PATIENT, // Always PATIENT for new registrations
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsersService.create.mockResolvedValue(createdUser);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

        // Act
        const result = await service.register(registerDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.access_token).toBe(mockJwtToken);
        expect(result.user).toEqual(createdUser);
      });

      it('should call UsersService.create with registration data and PATIENT role', async () => {
        // Arrange
        mockUsersService.create.mockResolvedValue(mockUserWithoutPassword);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

        // Act
        await service.register(registerDto);

        // Assert - SECURITY: Role should always be PATIENT
        expect(mockUsersService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: registerDto.email,
            password: registerDto.password,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            role: UserRole.PATIENT,
          }),
        );
      });

      it('should sign JWT with user id and email in payload', async () => {
        // Arrange
        const createdUser: UserWithoutPassword = {
          id: 'new-user-uuid',
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role: UserRole.PATIENT,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsersService.create.mockResolvedValue(createdUser);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

        // Act
        await service.register(registerDto);

        // Assert
        expect(mockJwtService.signAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: createdUser.id,
            email: createdUser.email,
            role: createdUser.role,
          }),
        );
      });

      it('should return user without password field', async () => {
        // Arrange
        mockUsersService.create.mockResolvedValue(mockUserWithoutPassword);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

        // Act
        const result = await service.register(registerDto);

        // Assert
        expect(result.user).not.toHaveProperty('password');
        expect(result.user).toHaveProperty('email');
        expect(result.user).toHaveProperty('id');
      });

      it('should register user with default PATIENT role when role not specified', async () => {
        // Arrange
        const dtoWithoutRole = {
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          firstName: 'Jane',
          lastName: 'Smith',
        };
        const createdUser: UserWithoutPassword = {
          id: 'new-user-uuid',
          email: dtoWithoutRole.email,
          firstName: dtoWithoutRole.firstName,
          lastName: dtoWithoutRole.lastName,
          role: UserRole.PATIENT,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsersService.create.mockResolvedValue(createdUser);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

        // Act
        const result = await service.register(dtoWithoutRole);

        // Assert
        expect(result.user.role).toBe(UserRole.PATIENT);
      });
    });

    describe('error cases', () => {
      it('should throw ConflictException when email already exists', async () => {
        // Arrange
        mockUsersService.create.mockRejectedValue(
          new ConflictException('Email already exists'),
        );

        // Act & Assert
        await expect(service.register(registerDto)).rejects.toThrow(
          ConflictException,
        );
      });

      it('should propagate UsersService errors', async () => {
        // Arrange
        mockUsersService.create.mockRejectedValue(
          new Error('Database connection failed'),
        );

        // Act & Assert
        await expect(service.register(registerDto)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });
  });

  // ============================================
  // LOGIN TESTS
  // ============================================

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'correctPassword123!',
    };

    describe('happy path', () => {
      it('should return JWT token for valid credentials', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.access_token).toBe(mockJwtToken);
      });

      it('should return user without password in response', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(result.user).toBeDefined();
        expect(result.user).not.toHaveProperty('password');
        expect(result.user.email).toBe(mockUser.email);
        expect(result.user.id).toBe(mockUser.id);
      });

      it('should sign JWT with user id, email, and role in payload', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        mockJwtService.signAsync.mockResolvedValue(mockJwtToken);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Act
        await service.login(loginDto);

        // Assert
        expect(mockJwtService.signAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          }),
        );
      });
    });

    describe('error cases', () => {
      it('should throw UnauthorizedException when email does not exist', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(null);

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException when password is incorrect', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const wrongPasswordDto = {
          email: 'test@example.com',
          password: 'wrongPassword',
        };

        // Act & Assert
        await expect(service.login(wrongPasswordDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException with generic message (no email hint)', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(null);

        // Act & Assert
        try {
          await service.login(loginDto);
          fail('Expected UnauthorizedException');
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          // Message should not reveal whether email exists
          const errorMessage = (error as UnauthorizedException).message;
          expect(errorMessage).not.toContain('email');
          expect(errorMessage).toMatch(/invalid|credentials|unauthorized/i);
        }
      });

      it('should not call JWT service when credentials are invalid', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(null);

        // Act
        try {
          await service.login(loginDto);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // VALIDATE USER TESTS (for Passport strategy)
  // ============================================

  describe('validateUser', () => {
    describe('happy path', () => {
      it('should return user without password for valid credentials', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Act
        const result = await service.validateUser(
          'test@example.com',
          'correctPassword',
        );

        // Assert
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('password');
        expect(result?.email).toBe(mockUser.email);
        expect(result?.id).toBe(mockUser.id);
      });

      it('should include user role in returned object', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Act
        const result = await service.validateUser(
          'test@example.com',
          'correctPassword',
        );

        // Assert
        expect(result?.role).toBe(mockUser.role);
      });
    });

    describe('error cases', () => {
      it('should return null when email does not exist', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(null);

        // Act
        const result = await service.validateUser(
          'nonexistent@example.com',
          'anyPassword',
        );

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when password is incorrect', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        // Act
        const result = await service.validateUser(
          'test@example.com',
          'wrongPassword',
        );

        // Assert
        expect(result).toBeNull();
      });

      it('should call findByEmail with provided email', async () => {
        // Arrange
        mockUsersService.findByEmail.mockResolvedValue(null);

        // Act
        await service.validateUser('test@example.com', 'anyPassword');

        // Assert
        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
          'test@example.com',
        );
      });
    });
  });

  // ============================================
  // JWT PAYLOAD STRUCTURE TESTS
  // ============================================

  describe('JWT payload structure', () => {
    it('should include sub (user id) in JWT payload', async () => {
      // Arrange
      mockUsersService.create.mockResolvedValue(mockUserWithoutPassword);
      mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

      // Act
      await service.register({
        email: 'new@example.com',
        password: 'password123',
      });

      // Assert
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: expect.any(String),
        }),
      );
    });

    it('should include email in JWT payload', async () => {
      // Arrange
      mockUsersService.create.mockResolvedValue(mockUserWithoutPassword);
      mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

      // Act
      await service.register({
        email: 'new@example.com',
        password: 'password123',
      });

      // Assert
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.any(String),
        }),
      );
    });

    it('should include role in JWT payload', async () => {
      // Arrange
      mockUsersService.create.mockResolvedValue(mockUserWithoutPassword);
      mockJwtService.signAsync.mockResolvedValue(mockJwtToken);

      // Act
      await service.register({
        email: 'new@example.com',
        password: 'password123',
      });

      // Assert
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          role: expect.any(String),
        }),
      );
    });
  });
});
