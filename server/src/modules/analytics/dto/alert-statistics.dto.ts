import { IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for alert counts by status.
 */
export class AlertsByStatusDto {
  @ApiProperty({
    description: 'Number of active alerts',
    example: 30,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  active: number;

  @ApiProperty({
    description: 'Number of acknowledged alerts',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  acknowledged: number;

  @ApiProperty({
    description: 'Number of resolved alerts',
    example: 80,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  resolved: number;

  @ApiProperty({
    description: 'Number of dismissed alerts',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  dismissed: number;
}

/**
 * DTO for alert counts by severity.
 */
export class AlertsBySeverityDto {
  @ApiProperty({
    description: 'Number of LOW severity alerts',
    example: 40,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  low: number;

  @ApiProperty({
    description: 'Number of MEDIUM severity alerts',
    example: 60,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  medium: number;

  @ApiProperty({
    description: 'Number of HIGH severity alerts',
    example: 35,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  high: number;

  @ApiProperty({
    description: 'Number of CRITICAL severity alerts',
    example: 15,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  critical: number;
}

/**
 * DTO for alert statistics within a clinic's cohort.
 *
 * @description Contains aggregated alert statistics including
 * total counts, breakdowns by status and severity, and
 * average resolution time.
 *
 * @example
 * ```typescript
 * const stats: AlertStatisticsDto = {
 *   totalAlerts: 150,
 *   byStatus: {
 *     active: 30,
 *     acknowledged: 20,
 *     resolved: 80,
 *     dismissed: 20,
 *   },
 *   bySeverity: {
 *     low: 40,
 *     medium: 60,
 *     high: 35,
 *     critical: 15,
 *   },
 *   averageResolutionTimeHours: 24.5,
 * };
 * ```
 */
export class AlertStatisticsDto {
  /**
   * Total number of alerts in the reporting period.
   */
  @ApiProperty({
    description: 'Total number of alerts in the reporting period',
    example: 150,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  totalAlerts: number;

  /**
   * Alert counts broken down by status.
   */
  @ApiProperty({
    description: 'Alert counts broken down by status',
    type: AlertsByStatusDto,
  })
  @ValidateNested()
  @Type(() => AlertsByStatusDto)
  byStatus: AlertsByStatusDto;

  /**
   * Alert counts broken down by severity.
   */
  @ApiProperty({
    description: 'Alert counts broken down by severity',
    type: AlertsBySeverityDto,
  })
  @ValidateNested()
  @Type(() => AlertsBySeverityDto)
  bySeverity: AlertsBySeverityDto;

  /**
   * Average time in hours to resolve alerts.
   * Calculated from ACTIVE to RESOLVED status transitions.
   */
  @ApiProperty({
    description: 'Average time in hours to resolve alerts (ACTIVE to RESOLVED)',
    example: 24,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  averageResolutionTimeHours: number;
}
