import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';

/**
 * DTO for user response without password.
 *
 * @description Represents the user data returned in API responses.
 * Password field is explicitly excluded for security.
 */
export class UserResponseDto {
  /** Unique identifier of the user */
  @ApiProperty({
    description: 'Unique identifier of the user (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  /** User's email address */
  @ApiProperty({
    description: 'User email address',
    example: 'patient@example.com',
  })
  email: string;

  /** User's first name */
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    nullable: true,
  })
  firstName: string | null;

  /** User's last name */
  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    nullable: true,
  })
  lastName: string | null;

  /** User's birthdate */
  @ApiProperty({
    description: 'User birthdate',
    example: '1990-01-15T00:00:00.000Z',
  })
  birthdate: Date;

  /** User's role */
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: 'PATIENT',
  })
  role: UserRole;

  /** Clinic ID the user is enrolled in */
  @ApiPropertyOptional({
    description: 'Clinic ID the user is enrolled in',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  clinicId: string | null;

  /** Timestamp when the user was created */
  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  /** Timestamp when the user was last updated */
  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO for paginated users response.
 *
 * @description Represents a paginated list of users returned in API responses.
 */
export class PaginatedUsersResponseDto {
  /** Array of users without password */
  @ApiProperty({
    description: 'Array of users',
    type: [UserResponseDto],
  })
  data: UserResponseDto[];

  /** Total number of users matching the filter */
  @ApiProperty({
    description: 'Total number of users matching the filter',
    example: 50,
  })
  total: number;

  /** Current page number */
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  /** Number of items per page */
  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;
}
