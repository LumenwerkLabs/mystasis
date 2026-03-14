import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

/**
 * Cookie name for storing JWT access token.
 */
export const AUTH_COOKIE_NAME = process.env.COOKIE_NAME || 'access_token';

/**
 * Cookie name for storing refresh token.
 */
export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Service for managing authentication cookies.
 *
 * Security features:
 * - HttpOnly: Prevents JavaScript access (XSS protection)
 * - Secure: HTTPS only in production
 * - SameSite: Lax for cross-origin redirect support
 * - Access token cookie: short-lived (15m), available on all paths
 * - Refresh token cookie: long-lived (7d), scoped to /auth/refresh
 */
@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Sets HttpOnly cookie with JWT access token.
   * Short-lived (matches access token expiration).
   */
  setAuthCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes — matches access token expiration
      path: '/',
    });
  }

  /**
   * Sets HttpOnly cookie with refresh token.
   * Long-lived, scoped to /auth/refresh for security.
   */
  setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const days =
      this.configService.get<number>('auth.refreshTokenExpirationDays') || 7;

    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: days * 24 * 60 * 60 * 1000,
      path: '/auth/refresh', // Only sent to the refresh endpoint
    });
  }

  /**
   * Clears the access token cookie.
   */
  clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  /**
   * Clears the refresh token cookie.
   */
  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
    });
  }

  /**
   * Decode a JWT token without verifying signature.
   * Used to extract jti and exp claims during logout.
   */
  decodeToken(token: string): { jti?: string; exp?: number } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload;
    } catch {
      return null;
    }
  }
}
