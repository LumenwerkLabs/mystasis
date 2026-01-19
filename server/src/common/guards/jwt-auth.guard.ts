import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard for protecting routes.
 *
 * @description Extends Passport's AuthGuard to protect routes with JWT Bearer
 * token authentication. Uses the configured JwtStrategy for token validation.
 *
 * @remarks
 * This guard should be applied to routes that require authentication.
 * It works in conjunction with `RolesGuard` for role-based access control.
 *
 * **Behavior:**
 * 1. Extracts JWT from Authorization header (via Passport)
 * 2. Verifies token using JwtStrategy
 * 3. Attaches decoded payload to `request.user`
 * 4. Throws `UnauthorizedException` for authentication failures
 *
 * @throws {UnauthorizedException} When authorization header is missing
 * @throws {UnauthorizedException} When token is invalid or expired
 *
 * @example
 * // Apply to a single route
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user;
 * }
 *
 * @example
 * // Apply to an entire controller
 * @UseGuards(JwtAuthGuard)
 * @Controller('protected')
 * export class ProtectedController { }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Handles the result of Passport authentication.
   *
   * @param err - Error from Passport if any
   * @param user - The authenticated user payload
   * @returns The user payload if authentication succeeds
   * @throws {UnauthorizedException} When authentication fails
   */
  handleRequest<TUser = unknown>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
