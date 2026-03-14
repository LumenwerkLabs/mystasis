import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserRole } from '../../generated/prisma/client';
import { UserPayload } from '../../common/interfaces/user-payload.interface';
import { TokenBlacklistService } from '../../common/services/token-blacklist.service';
import { AUTH_COOKIE_NAME } from '../../common/services/cookie.service';

/**
 * JWT payload structure from token.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  clinicId?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extracts JWT token from either HttpOnly cookie or Authorization header.
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME] as string;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

/**
 * Passport JWT strategy with token blacklist checking.
 *
 * After verifying the JWT signature and expiration, the validate() method
 * checks whether the token's `jti` has been blacklisted (revoked).
 * This enables immediate session termination on logout.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
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
   * Validates the JWT payload, checking the blacklist before accepting.
   */
  async validate(payload: JwtPayload): Promise<UserPayload> {
    // All tokens must have a jti claim for revocation support
    if (!payload.jti) {
      throw new UnauthorizedException('Invalid token');
    }

    const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(
      payload.jti,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      clinicId: payload.clinicId,
    };
  }
}
