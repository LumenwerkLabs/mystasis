import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuthResponseDto,
  UserPayloadResponseDto,
} from './dto/auth-response.dto';
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
@ApiTags('Auth')
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
  @Post('register')
  @Throttle(3, 3600)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with PATIENT role and returns a JWT token for immediate authentication. Rate limited to 3 requests per hour.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid email format or weak password',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - email already registered',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded (3/hour)',
  })
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
  @Post('login')
  @Throttle(5, 60)
  @ApiOperation({
    summary: 'Login with credentials',
    description:
      'Authenticates a user with email and password, returns a JWT token for subsequent authenticated requests. Rate limited to 5 requests per minute.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid email or password',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded (5/minute)',
  })
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
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the authenticated user profile extracted from the JWT token. Requires valid Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserPayloadResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  getProfile(@CurrentUser() user: UserPayload): UserPayload {
    return user;
  }
}
