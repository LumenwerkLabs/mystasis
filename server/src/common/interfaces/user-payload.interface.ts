import { UserRole } from '../../generated/prisma/client';

/**
 * User payload interface matching JWT token structure.
 *
 * @description Represents the decoded JWT payload attached to the request
 * by JwtAuthGuard. Used consistently across controllers and services
 * that need to access the authenticated user's information.
 *
 * @remarks
 * The `sub` (subject) claim is the standard JWT identifier for the user.
 * Always use `sub` for user identification to ensure JWT compliance.
 * The optional `id` field may be added by JwtAuthGuard for convenience
 * but should not be relied upon - use `sub` instead.
 *
 * @property sub - JWT subject claim (the user's unique ID) - use this for identification
 * @property email - User's email address
 * @property role - User's role (PATIENT or CLINICIAN)
 * @property id - Optional alias for sub (may be set by auth guard)
 * @property firstName - Optional user's first name
 * @property lastName - Optional user's last name
 */
export interface UserPayload {
  /** JWT subject claim - the canonical user identifier */
  sub: string;
  /** User's email address */
  email: string;
  /** User's role for RBAC */
  role: UserRole;
  /** Optional alias for sub - prefer using sub directly */
  id?: string;
  /** Optional first name */
  firstName?: string;
  /** Optional last name */
  lastName?: string;
  /** Optional clinic ID for multi-tenancy */
  clinicId?: string;
}
