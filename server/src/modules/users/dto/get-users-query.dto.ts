import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/**
 * Data transfer object for GET /users query parameters.
 *
 * @description Validates and transforms query parameters for filtering
 * and paginating user results. Used by clinicians to list users in their clinic.
 *
 * @example
 * // GET /users?page=2&limit=20&role=PATIENT
 */
export class GetUsersQueryDto {
  /**
   * Page number for pagination (1-indexed).
   * Defaults to 1 if not provided.
   */
  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /**
   * Number of items per page.
   * Defaults to 10, maximum 100.
   */
  @ApiPropertyOptional({
    description: 'Number of items per page (max 100)',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /**
   * Filter by user role.
   * If not provided, returns all roles.
   */
  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
    example: 'PATIENT',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
