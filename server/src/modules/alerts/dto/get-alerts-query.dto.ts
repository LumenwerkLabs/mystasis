import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertStatus, AlertSeverity } from '../../../generated/prisma/client';

/**
 * DTO for GET alerts query parameters.
 *
 * @description Validates and transforms query parameters for filtering
 * and paginating alert results.
 *
 * @example
 * ```typescript
 * // GET /alerts/user-123?status=ACTIVE&severity=HIGH&page=1&limit=20
 * const query: GetAlertsQueryDto = {
 *   status: AlertStatus.ACTIVE,
 *   severity: AlertSeverity.HIGH,
 *   page: 1,
 *   limit: 20,
 * };
 * ```
 */
export class GetAlertsQueryDto {
  /**
   * Filter alerts by status.
   * Optional - if not provided, returns alerts of all statuses.
   * Valid values: ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED
   */
  @ApiPropertyOptional({
    description: 'Filter alerts by status',
    enum: AlertStatus,
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  /**
   * Filter alerts by severity level.
   * Optional - if not provided, returns alerts of all severity levels.
   * Valid values: LOW, MEDIUM, HIGH, CRITICAL
   */
  @ApiPropertyOptional({
    description: 'Filter alerts by severity level',
    enum: AlertSeverity,
    example: 'HIGH',
  })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  /**
   * Page number for pagination (1-indexed).
   * Optional - defaults to 1 if not provided.
   * Must be a positive integer.
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
   * Number of alerts per page.
   * Optional - defaults to 10 if not provided.
   * Must be between 1 and 100.
   */
  @ApiPropertyOptional({
    description: 'Number of alerts per page (max 100)',
    example: 20,
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
}
