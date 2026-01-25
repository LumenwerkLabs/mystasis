import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

/**
 * Cookie name for storing JWT token.
 * Used by web clients with HttpOnly cookies for XSS protection.
 */
export const AUTH_COOKIE_NAME = process.env.COOKIE_NAME || 'access_token';

/**
 * Service for managing authentication cookies.
 *
 * @description Provides secure cookie operations for JWT tokens.
 * Centralizes cookie configuration to ensure consistent security
 * settings across all modules.
 *
 * Security features:
 * - HttpOnly: Prevents JavaScript access (XSS protection)
 * - Secure: HTTPS only in production
 * - SameSite: Strict CSRF protection
 *
 * @example
 * // In a controller
 * @Post('login')
 * async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
 *   const result = await this.authService.login(dto);
 *   this.cookieService.setAuthCookie(res, result.accessToken);
 *   return result;
 * }
 */
@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Sets HttpOnly cookie with JWT token for web clients.
   *
   * @description Configures cookie with security settings appropriate
   * for the current environment (development vs production).
   *
   * @param res - Express Response object
   * @param token - JWT access token to store in cookie
   */
  setAuthCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const maxAge =
      this.configService.get<number>('auth.cookieMaxAge') ||
      7 * 24 * 60 * 60 * 1000; // 7 days default

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge,
      path: '/', // Cookie available for all paths
    });
  }

  /**
   * Clears the authentication cookie.
   *
   * @description Used for logout operations. Must use the same
   * cookie options as setAuthCookie for the clear to work properly.
   *
   * @param res - Express Response object
   */
  clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}
