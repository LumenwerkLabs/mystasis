import { UserRole } from '@prisma/client';

/**
 * User object without sensitive password field.
 *
 * @description Represents user data safe for API responses.
 * Used in authentication responses to return user information
 * without exposing the password hash.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication response DTO.
 *
 * @description Standard response structure for successful authentication
 * operations (login, register). Contains the JWT access token and user
 * information (without password).
 *
 * @example
 * {
 *   accessToken: 'eyJhbGciOiJIUzI1NiIs...',
 *   tokenType: 'Bearer',
 *   expiresIn: '24h',
 *   user: {
 *     id: 'user-uuid',
 *     email: 'user@example.com',
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     role: 'PATIENT',
 *     createdAt: '2024-01-01T00:00:00.000Z',
 *     updatedAt: '2024-01-01T00:00:00.000Z'
 *   }
 * }
 */
export interface AuthResponseDto {
  /**
   * JWT access token for authenticating subsequent requests.
   * Include in Authorization header as: Bearer <accessToken>
   */
  accessToken: string;

  /**
   * Token type, always 'Bearer' for JWT tokens.
   */
  tokenType: string;

  /**
   * Token expiration time (e.g., '24h', '7d').
   */
  expiresIn: string;

  /**
   * Authenticated user information (without password).
   */
  user: AuthUser;
}
