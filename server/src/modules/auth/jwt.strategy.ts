import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * JWT payload structure from token.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Passport JWT authentication strategy.
 *
 * @description Implements JWT token validation for protected routes using
 * Passport.js. Extracts the JWT token from the Authorization header and
 * validates it using the configured secret.
 *
 * @remarks
 * This strategy is used by JwtAuthGuard to protect routes. The validate()
 * method is called after the token is verified, and its return value is
 * attached to request.user.
 *
 * Configuration:
 * - JWT secret is loaded from auth.jwtSecret config
 * - Token is extracted from Authorization header as Bearer token
 * - Expired tokens are rejected
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

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    };
  }
}
