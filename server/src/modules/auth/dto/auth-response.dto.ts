import { UserRole } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * User object without sensitive password field.
 *
 * @description Represents user data safe for API responses.
 * Used in authentication responses to return user information
 * without exposing the password hash.
 */
export class AuthUserDto {
  @ApiProperty({
    description: 'Unique user identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    nullable: true,
  })
  firstName: string | null;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    nullable: true,
  })
  lastName: string | null;

  @ApiProperty({
    description: 'User birthdate',
    example: '1990-01-15T00:00:00.000Z',
  })
  birthdate: Date;

  @ApiProperty({
    description: 'User role for access control',
    enum: ['PATIENT', 'CLINICIAN'],
    example: 'PATIENT',
  })
  role: UserRole;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
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
export class AuthResponseDto {
  /**
   * JWT access token for authenticating subsequent requests.
   * Include in Authorization header as: Bearer <accessToken>
   */
  @ApiProperty({
    description:
      'JWT access token for authenticating subsequent requests. Include in Authorization header as: Bearer <token>',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  /**
   * Token type, always 'Bearer' for JWT tokens.
   */
  @ApiProperty({
    description: 'Token type (always Bearer for JWT)',
    example: 'Bearer',
  })
  tokenType: string;

  /**
   * Token expiration time (e.g., '24h', '7d').
   */
  @ApiProperty({
    description: 'Token expiration time',
    example: '24h',
  })
  expiresIn: string;

  /**
   * Authenticated user information (without password).
   */
  @ApiProperty({
    description: 'Authenticated user information (without password)',
    type: AuthUserDto,
  })
  user: AuthUserDto;
}

/**
 * User payload returned by /auth/me endpoint.
 */
export class UserPayloadResponseDto {
  @ApiProperty({
    description: 'User ID (JWT subject claim)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sub: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role for access control',
    enum: ['PATIENT', 'CLINICIAN'],
    example: 'PATIENT',
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  lastName?: string;

  @ApiProperty({
    description: 'User birthdate',
    example: '1990-01-15T00:00:00.000Z',
  })
  birthdate: Date;

  @ApiPropertyOptional({
    description: 'Clinic ID for multi-tenancy (if assigned)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  clinicId?: string;
}
