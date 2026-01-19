import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Risk level enum for cohort analysis.
 *
 * @description Represents the overall health risk level of a patient
 * based on biomarker patterns and alert history.
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * DTO for risk distribution statistics.
 *
 * @description Contains the count of patients at each risk level
 * within a clinic's cohort. Used for population health monitoring
 * and identifying patients who need attention.
 *
 * @example
 * ```typescript
 * const distribution: RiskDistributionDto = {
 *   low: 80,
 *   medium: 45,
 *   high: 20,
 *   critical: 5,
 * };
 * ```
 */
export class RiskDistributionDto {
  /**
   * Number of patients at LOW risk level.
   * These patients have biomarkers within normal ranges.
   */
  @ApiProperty({
    description:
      'Number of patients at LOW risk level (biomarkers within normal ranges)',
    example: 80,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  low: number;

  /**
   * Number of patients at MEDIUM risk level.
   * These patients have some biomarkers outside optimal ranges.
   */
  @ApiProperty({
    description:
      'Number of patients at MEDIUM risk level (some biomarkers outside optimal)',
    example: 45,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  medium: number;

  /**
   * Number of patients at HIGH risk level.
   * These patients have biomarkers that warrant attention.
   */
  @ApiProperty({
    description:
      'Number of patients at HIGH risk level (biomarkers warrant attention)',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  high: number;

  /**
   * Number of patients at CRITICAL risk level.
   * These patients require immediate clinical review.
   */
  @ApiProperty({
    description:
      'Number of patients at CRITICAL risk level (require immediate review)',
    example: 5,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  critical: number;
}
