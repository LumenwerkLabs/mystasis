import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';

/**
 * Metadata key constant for storing role requirements.
 *
 * @description Used internally by `RolesGuard` to retrieve role metadata
 * set by the `@Roles()` decorator. This key is used with NestJS Reflector
 * to access the metadata at runtime.
 *
 * @example
 * // Used by RolesGuard to retrieve roles
 * const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
 *   ROLES_KEY,
 *   [context.getHandler(), context.getClass()],
 * );
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator for specifying required user roles on endpoints or controllers.
 *
 * @description Attaches role metadata to route handlers or controllers for use
 * with `RolesGuard`. When applied, only users with one of the specified roles
 * will be granted access to the endpoint.
 *
 * @param roles - One or more `UserRole` values that are allowed to access the endpoint.
 *                If multiple roles are specified, the user needs only ONE of them (OR logic).
 * @returns A method/class decorator that sets the roles metadata
 *
 * @remarks
 * - Must be used in conjunction with `RolesGuard` (and typically `JwtAuthGuard`)
 * - Handler-level decorators take precedence over class-level decorators
 * - If no `@Roles()` decorator is present, `RolesGuard` allows access (no role restriction)
 *
 * @example
 * // Restrict to clinicians only
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.CLINICIAN)
 * @Get('patients')
 * getAllPatients() {
 *   return this.patientsService.findAll();
 * }
 *
 * @example
 * // Allow both patients and clinicians
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * @example
 * // Apply to entire controller (class-level)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.CLINICIAN)
 * @Controller('admin')
 * export class AdminController {
 *   // All routes require CLINICIAN role
 * }
 *
 * @see {@link RolesGuard} - The guard that enforces role requirements
 * @see {@link UserRole} - Available user roles (PATIENT, CLINICIAN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
