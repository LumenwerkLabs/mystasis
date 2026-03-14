import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import {
  AuthResponseDto,
  UserPayloadResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';
import { Throttle } from '../../common/decorators/throttle.decorator';
import { CookieService } from '../../common/services/cookie.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  /**
   * Registers a new user and returns access + refresh tokens.
   */
  @Post('register')
  @Throttle(3, 3600)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with PATIENT role and returns a token pair ' +
      '(short-lived access token + long-lived refresh token). ' +
      'Rate limited to 3 requests per hour.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string; refresh_token: string; user: unknown }> {
    const result = await this.authService.register(dto);
    this.cookieService.setAuthCookie(res, result.access_token);
    this.cookieService.setRefreshTokenCookie(res, result.refresh_token);
    return result;
  }

  /**
   * Authenticates a user and returns access + refresh tokens.
   */
  @Post('login')
  @Throttle(5, 60)
  @ApiOperation({
    summary: 'Login with credentials',
    description:
      'Authenticates a user and returns a token pair. ' +
      'Rate limited to 5 requests per minute.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string; refresh_token: string; user: unknown }> {
    const result = await this.authService.login(dto);
    this.cookieService.setAuthCookie(res, result.access_token);
    this.cookieService.setRefreshTokenCookie(res, result.refresh_token);
    return result;
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   */
  @Post('refresh')
  @Throttle(10, 60)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses a refresh token to obtain a new access + refresh token pair. ' +
      'The old refresh token is revoked (single-use rotation). ' +
      'Rate limited to 10 requests per minute.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'New token pair issued',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid, expired, or revoked refresh token',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string; refresh_token: string; user: unknown }> {
    const refreshToken =
      dto.refresh_token || req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const result = await this.authService.refreshTokens(refreshToken);
    this.cookieService.setAuthCookie(res, result.access_token);
    this.cookieService.setRefreshTokenCookie(res, result.refresh_token);
    return result;
  }

  /**
   * Returns the current authenticated user's profile.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the authenticated user profile extracted from the JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserPayloadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: UserPayload): UserPayload {
    return user;
  }

  /**
   * Logs out by blacklisting the access token and revoking the refresh token.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout current user',
    description:
      'Blacklists the current access token and revokes the refresh token. ' +
      'Both tokens become immediately unusable.',
  })
  @ApiBody({ type: LogoutDto, required: false })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
    @Body() body: LogoutDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    // Extract jti and exp from the current JWT
    const token = this.extractTokenFromRequest(req);
    if (token) {
      try {
        const decoded = this.cookieService.decodeToken(token);
        if (decoded?.jti && decoded?.exp) {
          await this.authService.logout(
            decoded.jti,
            user.sub,
            new Date(decoded.exp * 1000),
            body?.refresh_token,
          );
        }
      } catch {
        // Best effort — clear cookies regardless
      }
    }

    this.cookieService.clearAuthCookie(res);
    this.cookieService.clearRefreshTokenCookie(res);
    return { message: 'Successfully logged out' };
  }

  private extractTokenFromRequest(req: Request): string | null {
    // Try cookie first
    if (req.cookies?.access_token) {
      return req.cookies.access_token as string;
    }
    // Fall back to Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
