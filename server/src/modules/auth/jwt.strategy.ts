import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { UserPayload } from '../../common/interfaces/user-payload.interface';
import { AUTH_COOKIE_NAME } from '../../common/services/cookie.service';

/**
 * JWT payload structure from token.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  clinicId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extracts JWT token from either HttpOnly cookie or Authorization header.
 * Prioritizes cookie for web clients, falls back to header for mobile clients.
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // First, try to extract from HttpOnly cookie (web clients)
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  // Fall back to Authorization header (mobile clients)
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

/**
 * Passport JWT authentication strategy.
 *
 * @description Implements JWT token validation for protected routes using
 * Passport.js. Extracts the JWT token from either an HttpOnly cookie (for web
 * clients with XSS protection) or the Authorization header (for mobile clients).
 *
 * @remarks
 * This strategy is used by JwtAuthGuard to protect routes. The validate()
 * method is called after the token is verified, and its return value is
 * attached to request.user.
 *
 * Configuration:
 * - JWT secret is loaded from auth.jwtSecret config
 * - Token is extracted from cookie first, then Authorization header
 * - Expired tokens are rejected
 *
 * Security:
 * - Web clients use HttpOnly cookies (immune to XSS)
 * - Mobile clients use Authorization header (stored in secure storage)
 *
 * @example
 * // The strategy is automatically used when JwtAuthGuard is applied
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedResource(@CurrentUser() user: UserPayload) {
 *   return user;
 * }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('auth.jwtSecret');
    if (!secret) {
      throw new Error('JWT secret is not configured');
    }

    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validates the JWT payload and returns the user payload.
   *
   * @description Called by Passport after the JWT signature is verified.
   * Transforms the raw JWT payload into a UserPayload object that will
   * be attached to request.user.
   *
   * @param payload - The decoded JWT payload
   * @returns UserPayload object with user identification data
   *
   * @example
   * // Input payload from JWT
   * { sub: 'user-123', email: 'user@example.com', role: 'PATIENT' }
   *
   * // Output UserPayload
   * { sub: 'user-123', id: 'user-123', email: 'user@example.com', role: 'PATIENT' }
   */
  validate(payload: JwtPayload): UserPayload {
    return {
      sub: payload.sub,
      id: payload.sub, // Alias for convenience
      email: payload.email,
      role: payload.role,
      clinicId: payload.clinicId,
    };
  }
}
