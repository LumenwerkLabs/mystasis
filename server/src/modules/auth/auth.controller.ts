import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';
import { Throttle } from '../../common/decorators/throttle.decorator';

/**
 * AuthController - HTTP layer for authentication endpoints.
 *
 * @description Provides endpoints for user registration, login, and profile access.
 * This controller is a thin layer that delegates all business logic to AuthService.
 *
 * Endpoints:
 * - POST /auth/register: Register a new user and receive JWT token
 * - POST /auth/login: Login with credentials and receive JWT token
 * - GET /auth/me: Get current authenticated user profile
 *
 * @example
 * // Register a new user
 * POST /auth/register
 * { "email": "user@example.com", "password": "SecurePass123" }
 *
 * @example
 * // Login
 * POST /auth/login
 * { "email": "user@example.com", "password": "SecurePass123" }
 *
 * @example
 * // Get current user profile
 * GET /auth/me
 * Authorization: Bearer <token>
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user.
   *
   * @description Creates a new user account and returns a JWT token
   * for immediate authentication. All users register as PATIENT role.
   *
   * @param dto - Registration data (email, password, optional firstName, lastName)
   * @returns Promise resolving to access token and user data
   *
   * @throws {ConflictException} When email already exists (409)
   * @throws {BadRequestException} When validation fails (400)
   */
  // Rate limit: 3 requests per hour (3600s)
  // Stricter than login to prevent mass account creation attacks
  // and reduce abuse vectors for spam/bot registrations
  @Throttle(3, 3600)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ access_token: string; user: unknown }> {
    return this.authService.register(dto);
  }

  /**
   * Authenticates a user and returns a JWT token.
   *
   * @description Validates user credentials and generates a JWT token
   * for subsequent authenticated requests.
   *
   * @param dto - Login credentials (email, password)
   * @returns Promise resolving to access token and user data
   *
   * @throws {UnauthorizedException} When credentials are invalid (401)
   */
  // Rate limit: 5 requests per minute (60s)
  // Prevents brute force password attacks while allowing
  // reasonable retry attempts for users who mistype credentials
  @Throttle(5, 60)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ access_token: string; user: unknown }> {
    return this.authService.login(dto);
  }

  /**
   * Returns the current authenticated user's profile.
   *
   * @description Protected endpoint that returns the user information
   * extracted from the JWT token. Requires a valid Bearer token in
   * the Authorization header.
   *
   * @param user - The authenticated user payload from JWT
   * @returns The user payload containing id, email, and role
   *
   * @throws {UnauthorizedException} When not authenticated (401)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: UserPayload): UserPayload {
    return user;
  }
}
