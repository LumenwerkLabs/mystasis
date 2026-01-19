import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, User } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * TDD Tests for UsersService
 *
 * These tests define the expected behavior of UsersService:
 * 1. CRUD operations for user management
 * 2. Password hashing on create/update
 * 3. Role-based filtering
 * 4. Email uniqueness enforcement (via P2002 database constraint)
 */

// Define mock types for Prisma user delegate
interface MockUserDelegate {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
}

interface MockPrismaService {
  user: MockUserDelegate;
}

describe('UsersService', () => {
  let service: UsersService;
  let mockPrismaService: MockPrismaService;

  // Mock user data
  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    birthdate: new Date('1990-01-15'),
    role: UserRole.PATIENT,
    clinicId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrismaService = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('module setup', () => {
    it('should export UsersService class', () => {
      expect(UsersService).toBeDefined();
    });
  });

  describe('create', () => {
    const createUserDto = {
      email: 'newuser@example.com',
      password: 'plainTextPassword',
      birthdate: new Date('1990-01-15'),
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.PATIENT,
    };

    it('should create a user with hashed password', async () => {
      // Arrange
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
      });

      // Act
      await service.create(createUserDto);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      const createCall = mockPrismaService.user.create.mock.calls[0] as [
        { data: { password: string; email: string } },
      ];
      // Password should be hashed, not plain text
      expect(createCall[0].data.password).not.toBe(createUserDto.password);
      expect(createCall[0].data.email).toBe(createUserDto.email);
    });

    it('should throw ConflictException if email already exists (P2002)', async () => {
      // Arrange - database throws P2002 unique constraint violation
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['email'] },
        },
      );
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should re-throw non-P2002 Prisma errors', async () => {
      // Arrange - database throws a different error
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Some other database error',
        {
          code: 'P2003',
          clientVersion: '5.22.0',
        },
      );
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should return user without password field', async () => {
      // Arrange
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('id');
    });
  });

  describe('findAll', () => {
    const mockUsers: User[] = [
      mockUser,
      {
        ...mockUser,
        id: 'user-uuid-2',
        email: 'clinician@example.com',
        role: UserRole.CLINICIAN,
      },
    ];

    it('should return all users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });

    it('should filter by role when provided', async () => {
      // Arrange
      const patientsOnly = mockUsers.filter((u) => u.role === UserRole.PATIENT);
      mockPrismaService.user.findMany.mockResolvedValue(patientsOnly);

      // Act
      const result = await service.findAll({ role: UserRole.PATIENT });

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.PATIENT,
          }) as { role: UserRole },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne('user-uuid-1');

      // Assert
      expect(result).toEqual(expect.objectContaining({ id: 'user-uuid-1' }));
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(
        expect.objectContaining({ email: 'test@example.com' }),
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        }),
      );
    });

    it('should return null if email not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto = {
      firstName: 'UpdatedName',
      lastName: 'UpdatedLastName',
    };

    it('should update user fields', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      // Act
      const result = await service.update('user-uuid-1', updateUserDto);

      // Assert
      expect(result.firstName).toBe('UpdatedName');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
          data: expect.objectContaining(updateUserDto) as typeof updateUserDto,
        }),
      );
    });

    it('should hash password if provided in update', async () => {
      // Arrange
      const updateWithPassword = {
        ...updateUserDto,
        password: 'newPlainPassword',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      // Act
      await service.update('user-uuid-1', updateWithPassword);

      // Assert
      const updateCall = mockPrismaService.user.update.mock.calls[0] as [
        { data: { password: string } },
      ];
      expect(updateCall[0].data.password).not.toBe('newPlainPassword');
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('nonexistent-id', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      // Act
      await service.remove('user-uuid-1');

      // Assert
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllPaginated', () => {
    const mockUsers: User[] = [
      mockUser,
      {
        ...mockUser,
        id: 'user-uuid-2',
        email: 'patient2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    ];

    it('should return paginated users filtered by clinicId', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      // Act
      const result = await service.findAllPaginated({
        clinicId: 'clinic-uuid-1',
      });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: 'clinic-uuid-1',
          }) as { clinicId: string },
        }),
      );
    });

    it('should support role filtering', async () => {
      // Arrange
      const patientsOnly = mockUsers.filter((u) => u.role === UserRole.PATIENT);
      mockPrismaService.user.findMany.mockResolvedValue(patientsOnly);
      mockPrismaService.user.count.mockResolvedValue(patientsOnly.length);

      // Act
      const result = await service.findAllPaginated({
        clinicId: 'clinic-uuid-1',
        role: UserRole.PATIENT,
      });

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: 'clinic-uuid-1',
            role: UserRole.PATIENT,
          }) as { clinicId: string; role: UserRole },
        }),
      );
      expect(result.data).toHaveLength(patientsOnly.length);
    });

    it('should return correct pagination metadata', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(50);

      // Act
      const result = await service.findAllPaginated({
        clinicId: 'clinic-uuid-1',
        page: 2,
        limit: 20,
      });

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(50);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (page - 1) * limit = (2 - 1) * 20 = 20
          take: 20,
        }),
      );
    });

    it('should return empty array when no users match', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      const result = await service.findAllPaginated({
        clinicId: 'clinic-uuid-1',
      });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      // Act
      const result = await service.findAllPaginated({
        clinicId: 'clinic-uuid-1',
      });

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should exclude password from returned users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      // Act
      const result = await service.findAllPaginated({
        clinicId: 'clinic-uuid-1',
      });

      // Assert
      result.data.forEach((user: Record<string, unknown>) => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should handle clinicId as required parameter', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      // Act
      await service.findAllPaginated({
        clinicId: 'clinic-uuid-1',
      });

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: 'clinic-uuid-1',
          }) as { clinicId: string },
        }),
      );
    });
  });
});
