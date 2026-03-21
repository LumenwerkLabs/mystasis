import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma, UserRole, User } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * User type without password field for safe return values.
 * Used for all API responses to prevent password leakage.
 */
export type UserWithoutPassword = Omit<User, 'password'>;

/**
 * Removes password field from user object for safe return.
 *
 * @param user - The user object with password
 * @returns User object without the password field
 */
function excludePassword(user: User): UserWithoutPassword {
  const { password, ...userWithoutPassword } = user;
  void password; // Explicitly mark as intentionally unused
  return userWithoutPassword;
}

/**
 * Service for managing user accounts in the Mystasis platform.
 *
 * @description
 * Handles all user-related business logic including:
 * - User CRUD operations
 * - Secure password hashing with bcrypt
 * - Role-based filtering (PATIENT, CLINICIAN)
 * - Email uniqueness enforcement
 *
 * Security considerations:
 * - Passwords are hashed with bcrypt (10 rounds) before storage
 * - Password fields are excluded from all API responses
 * - Email uniqueness is enforced at the database level to prevent race conditions
 *
 * @example
 * // Create a new patient user
 * const user = await usersService.create({
 *   email: 'patient@example.com',
 *   password: 'securePassword123',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   role: UserRole.PATIENT,
 * });
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  /** Number of bcrypt salt rounds for password hashing */
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates a new user with a securely hashed password.
   *
   * @description
   * Creates a user account with the provided details. The password is
   * hashed using bcrypt before storage. Email uniqueness is enforced
   * by the database constraint, and a ConflictException is thrown if
   * the email already exists.
   *
   * @param data - User creation data
   * @param data.email - Unique email address for the user
   * @param data.password - Plain text password (will be hashed)
   * @param data.birthdate - User's date of birth
   * @param data.firstName - Optional first name
   * @param data.lastName - Optional last name
   * @param data.role - User role (defaults to PATIENT if not specified)
   *
   * @returns The created user without the password field
   *
   * @throws {ConflictException} When email already exists (P2002)
   *
   * @example
   * const user = await usersService.create({
   *   email: 'newuser@example.com',
   *   password: 'mySecurePassword',
   *   birthdate: new Date('1990-01-15'),
   *   role: UserRole.CLINICIAN,
   * });
   */
  async create(data: {
    email: string;
    password: string;
    birthdate: Date;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  }): Promise<UserWithoutPassword> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Create user - let database enforce uniqueness
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          birthdate: data.birthdate,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        },
      });

      return excludePassword(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Retrieves all users, optionally filtered by role.
   *
   * @param options - Optional filtering parameters
   * @param options.role - Filter by user role (PATIENT or CLINICIAN)
   *
   * @returns Array of users without password fields
   *
   * @example
   * // Get all users
   * const allUsers = await usersService.findAll();
   *
   * @example
   * // Get only clinicians
   * const clinicians = await usersService.findAll({ role: UserRole.CLINICIAN });
   */
  async findAll(options?: { role?: UserRole }): Promise<UserWithoutPassword[]> {
    const where = options?.role ? { role: options.role } : {};

    const users = await this.prisma.user.findMany({
      where,
    });

    return users.map(excludePassword);
  }

  /**
   * Retrieves a single user by their unique ID.
   *
   * @param id - The UUID of the user to retrieve
   *
   * @returns The user without password field
   *
   * @throws {NotFoundException} When no user exists with the given ID
   *
   * @example
   * const user = await usersService.findOne('123e4567-e89b-12d3-a456-426614174000');
   */
  async findOne(id: string): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return excludePassword(user);
  }

  /**
   * Retrieves a user by their email address.
   *
   * @description
   * This method is intended for authentication purposes and returns the
   * full user object including the password hash for credential verification.
   * Do NOT use this method for general user retrieval - use findOne() instead.
   *
   * @param email - The email address to search for
   *
   * @returns The full user object including password, or null if not found
   *
   * @example
   * // In auth service
   * const user = await usersService.findByEmail(loginDto.email);
   * if (user && await bcrypt.compare(loginDto.password, user.password)) {
   *   // Generate JWT token
   * }
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Updates an existing user's information.
   *
   * @description
   * Updates the specified fields for a user. If a password is provided,
   * it will be securely hashed before storage. Email cannot be updated
   * through this method.
   *
   * @param id - The UUID of the user to update
   * @param data - Fields to update
   * @param data.password - New password (will be hashed)
   * @param data.firstName - New first name
   * @param data.lastName - New last name
   * @param data.role - New role (PATIENT or CLINICIAN)
   *
   * @returns The updated user without password field
   *
   * @throws {NotFoundException} When no user exists with the given ID
   *
   * @example
   * // Update user's name
   * const user = await usersService.update(userId, {
   *   firstName: 'Jane',
   *   lastName: 'Smith',
   * });
   *
   * @example
   * // Change user's password
   * const user = await usersService.update(userId, {
   *   password: 'newSecurePassword',
   * });
   */
  async update(
    id: string,
    data: {
      password?: string;
      currentPassword?: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
      shareWithClinician?: boolean;
      anonymousResearch?: boolean;
      notifyLabResults?: boolean;
      notifyAppointments?: boolean;
      notifyHealthAlerts?: boolean;
      notifyWeeklyDigest?: boolean;
    },
  ): Promise<UserWithoutPassword> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password when changing password
    if (data.password) {
      if (!data.currentPassword) {
        throw new BadRequestException(
          'Current password is required when changing password',
        );
      }
      const isCurrentPasswordValid = await bcrypt.compare(
        data.currentPassword,
        existingUser.password,
      );
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // Audit log consent changes before updating
    if (data.shareWithClinician !== undefined &&
        data.shareWithClinician !== existingUser.shareWithClinician) {
      this.auditService.log({
        userId: id,
        action: 'CONSENT_CHANGE',
        resourceType: 'User',
        resourceId: id,
        metadata: {
          field: 'shareWithClinician',
          oldValue: existingUser.shareWithClinician,
          newValue: data.shareWithClinician,
        },
      });
    }
    if (data.anonymousResearch !== undefined &&
        data.anonymousResearch !== existingUser.anonymousResearch) {
      this.auditService.log({
        userId: id,
        action: 'CONSENT_CHANGE',
        resourceType: 'User',
        resourceId: id,
        metadata: {
          field: 'anonymousResearch',
          oldValue: existingUser.anonymousResearch,
          newValue: data.anonymousResearch,
        },
      });
    }

    // Audit log notification preference changes
    const notifFields = [
      'notifyLabResults',
      'notifyAppointments',
      'notifyHealthAlerts',
      'notifyWeeklyDigest',
    ] as const;
    for (const field of notifFields) {
      if (data[field] !== undefined &&
          data[field] !== (existingUser as Record<string, unknown>)[field]) {
        this.auditService.log({
          userId: id,
          action: 'PREFERENCE_CHANGE',
          resourceType: 'User',
          resourceId: id,
          metadata: {
            field,
            oldValue: (existingUser as Record<string, unknown>)[field],
            newValue: data[field],
          },
        });
      }
    }

    // Build update data, excluding currentPassword (not a DB field)
    const { currentPassword, ...fieldsToUpdate } = data;
    void currentPassword; // Explicitly mark as intentionally unused
    const updateData = { ...fieldsToUpdate };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, this.SALT_ROUNDS);
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return excludePassword(user);
  }

  /**
   * Permanently deletes a user account.
   *
   * @description
   * Removes the user and all associated data due to CASCADE delete rules.
   * This includes biomarker values, alerts, and LLM summaries.
   * This action is irreversible.
   *
   * @param id - The UUID of the user to delete
   *
   * @returns The deleted user without password field
   *
   * @throws {NotFoundException} When no user exists with the given ID
   *
   * @example
   * const deletedUser = await usersService.remove(userId);
   */
  async remove(id: string): Promise<UserWithoutPassword> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Delete user
    const user = await this.prisma.user.delete({
      where: { id },
    });

    return excludePassword(user);
  }

  /**
   * Retrieves paginated users filtered by clinic.
   *
   * @description
   * Returns a paginated list of users belonging to a specific clinic.
   * Supports optional filtering by role and custom pagination.
   * Used by clinicians to list patients in their clinic.
   *
   * @param options - Query options
   * @param options.clinicId - Required clinic ID for multi-tenancy filtering
   * @param options.role - Optional role filter (PATIENT or CLINICIAN)
   * @param options.page - Page number (1-indexed, defaults to 1)
   * @param options.limit - Items per page (defaults to 10)
   *
   * @returns Paginated response with users (without passwords), total count, and pagination metadata
   *
   * @example
   * // Get first page of patients in a clinic
   * const result = await usersService.findAllPaginated({
   *   clinicId: 'clinic-uuid',
   *   role: UserRole.PATIENT,
   *   page: 1,
   *   limit: 20,
   * });
   */
  async findAllPaginated(options: {
    clinicId: string;
    role?: UserRole;
    page?: number;
    limit?: number;
  }): Promise<{
    data: UserWithoutPassword[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: { clinicId: string; role?: UserRole } = {
      clinicId: options.clinicId,
    };

    if (options.role) {
      where.role = options.role;
    }

    // Execute count and findMany in parallel for efficiency
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(excludePassword),
      total,
      page,
      limit,
    };
  }
}
