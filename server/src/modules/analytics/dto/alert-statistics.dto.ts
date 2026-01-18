import { IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for alert counts by status.
 */
export class AlertsByStatusDto {
  @IsInt()
  @Min(0)
  active: number;

  @IsInt()
  @Min(0)
  acknowledged: number;

  @IsInt()
  @Min(0)
  resolved: number;

  @IsInt()
  @Min(0)
  dismissed: number;
}

/**
 * DTO for alert counts by severity.
 */
export class AlertsBySeverityDto {
  @IsInt()
  @Min(0)
  low: number;

  @IsInt()
  @Min(0)
  medium: number;

  @IsInt()
  @Min(0)
  high: number;

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
  @IsInt()
  @Min(0)
  totalAlerts: number;

  /**
   * Alert counts broken down by status.
   */
  @ValidateNested()
  @Type(() => AlertsByStatusDto)
  byStatus: AlertsByStatusDto;

  /**
   * Alert counts broken down by severity.
   */
  @ValidateNested()
  @Type(() => AlertsBySeverityDto)
  bySeverity: AlertsBySeverityDto;

  /**
   * Average time in hours to resolve alerts.
   * Calculated from ACTIVE to RESOLVED status transitions.
   */
  @IsInt()
  @Min(0)
  averageResolutionTimeHours: number;
}
