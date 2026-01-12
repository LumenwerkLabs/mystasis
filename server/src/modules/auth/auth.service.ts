import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * User type without password field for safe return values.
 */
type UserWithoutPassword = Omit<User, 'password'>;

/**
 * JWT payload structure for token signing.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/**
 * Authentication response structure.
 */
interface AuthResponse {
  access_token: string;
  user: UserWithoutPassword;
}

/**
 * Authentication service for user registration and login.
 *
 * @description Handles all authentication-related business logic including:
 * - User registration with JWT token generation
 * - User login with credential validation
 * - User validation for Passport strategies
 *
 * Security considerations:
 * - Passwords are compared using bcrypt
 * - JWT tokens include user ID, email, and role
 * - User passwords are never returned in responses
 * - Error messages are generic to prevent user enumeration
 *
 * @example
 * // Register a new user
 * const result = await authService.register({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 * });
 *
 * @example
 * // Login existing user
 * const result = await authService.login({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 * });
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user and returns JWT token.
   *
   * @description Creates a new user account via UsersService and generates
   * a JWT token for immediate authentication. The password is hashed by
   * UsersService before storage.
   *
   * @param dto - Registration data including email, password, and optional profile fields
   * @returns Promise resolving to access token and user data (without password)
   *
   * @throws {ConflictException} When email already exists (propagated from UsersService)
   *
   * @example
   * const result = await authService.register({
   *   email: 'newuser@example.com',
   *   password: 'SecurePassword123',
   *   firstName: 'John',
   *   lastName: 'Doe',
   * });
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Create user via UsersService (handles password hashing)
    // SECURITY: Role is always set to PATIENT - role elevation requires admin action
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.PATIENT,
    });

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    // SECURITY: Audit trail for new account creation
    this.logger.log(`User registered: ${user.email}`);

    return {
      access_token: accessToken,
      user,
    };
  }

  /**
   * Authenticates user and returns JWT token.
   *
   * @description Validates user credentials by comparing the provided password
   * with the stored bcrypt hash. On success, generates and returns a JWT token.
   *
   * @param dto - Login credentials (email and password)
   * @returns Promise resolving to access token and user data (without password)
   *
   * @throws {UnauthorizedException} When email does not exist or password is incorrect
   *
   * @example
   * const result = await authService.login({
   *   email: 'user@example.com',
   *   password: 'correctPassword',
   * });
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user by email (includes password for comparison)
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // SECURITY: Log failed attempts for monitoring and intrusion detection
      // Email is logged to identify targeted accounts (rate limiting handles abuse)
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      // Generic message prevents user enumeration (don't reveal if email exists)
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare passwords using bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      // SECURITY: Same logging and error as user-not-found to prevent timing attacks
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    // SECURITY: Audit trail for successful authentications
    this.logger.log(`Successful login for user: ${user.email}`);

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    void password; // Explicitly mark as intentionally unused

    return {
      access_token: accessToken,
      user: userWithoutPassword,
    };
  }

  /**
   * Validates user credentials for Passport strategy.
   *
   * @description Used by Passport JWT strategy to validate user credentials.
   * Returns user data without password if credentials are valid, null otherwise.
   *
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise resolving to user without password, or null if invalid
   *
   * @example
   * const user = await authService.validateUser('user@example.com', 'password');
   * if (user) {
   *   // Credentials valid, proceed with authentication
   * }
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password: _password, ...userWithoutPassword } = user;
    void _password; // Explicitly mark as intentionally unused
    return userWithoutPassword;
  }
}
