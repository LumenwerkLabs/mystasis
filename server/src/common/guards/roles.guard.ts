import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Request interface with optional authenticated user containing role.
 * Represents the HTTP request after JWT authentication.
 */
interface RequestWithUser {
  user?: {
    role: UserRole;
  } | null;
}

/**
 * Role-based access control (RBAC) guard for protecting routes by user role.
 *
 * @description Implements NestJS CanActivate interface to enforce role-based
 * access control. Works with the `@Roles()` decorator to restrict endpoint
 * access to users with specific roles.
 *
 * @remarks
 * This guard should typically be used after `JwtAuthGuard` in the guards chain.
 * It reads role requirements from decorator metadata and compares against the
 * authenticated user's role.
 *
 * **Behavior:**
 * 1. Uses Reflector to read roles metadata from `@Roles()` decorator
 * 2. Allows access if no roles are required (public or auth-only endpoint)
 * 3. Checks if `user.role` is included in the required roles array
 * 4. Throws `ForbiddenException` if role check fails
 *
 * **Precedence:** Handler-level `@Roles()` takes precedence over class-level.
 *
 * @throws {ForbiddenException} When roles are required but no user is authenticated
 * @throws {ForbiddenException} When user's role is not in the required roles list
 *
 * @example
 * // Use with JwtAuthGuard for authenticated + role-restricted routes
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.CLINICIAN)
 * @Get('patients')
 * getAllPatients() {
 *   return this.patientsService.findAll();
 * }
 *
 * @example
 * // Allow multiple roles
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
 * @Get('biomarkers')
 * getBiomarkers() {
 *   return this.biomarkersService.findAll();
 * }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determines if the current request is authorized based on user role.
   *
   * @description Checks if the authenticated user has one of the required roles
   * specified by the `@Roles()` decorator. If no roles are specified, access
   * is granted (endpoint is not role-restricted).
   *
   * @param context - The execution context containing the request and handler metadata
   * @returns `true` if access is granted, throws `ForbiddenException` otherwise
   *
   * @throws {ForbiddenException} When authentication is required but user is missing
   * @throws {ForbiddenException} When user's role doesn't match required roles
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    // getAllAndOverride checks handler first, then class - handler takes precedence
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (attached by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // If roles are required but no user, deny access
    if (!user) {
      throw new ForbiddenException(
        'Insufficient permissions: authentication required',
      );
    }

    // Check if user's role is in the required roles array
    const hasRole = requiredRoles.includes(user.role);

    // If user doesn't have required role, deny access
    if (!hasRole) {
      throw new ForbiddenException(
        'Insufficient permissions: you do not have the required role to access this resource',
      );
    }

    return true;
  }
}
