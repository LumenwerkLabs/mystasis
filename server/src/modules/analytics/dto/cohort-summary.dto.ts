import { IsInt, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for age distribution in cohort summary.
 */
export class AgeDistributionDto {
  @IsInt()
  @Min(0)
  under30: number;

  @IsInt()
  @Min(0)
  between30And50: number;

  @IsInt()
  @Min(0)
  between50And70: number;

  @IsInt()
  @Min(0)
  over70: number;
}

/**
 * DTO for cohort summary statistics.
 *
 * @description Contains aggregated statistics for a clinic's patient cohort,
 * including total patients, average biomarker values, and demographic breakdowns.
 *
 * @example
 * ```typescript
 * const summary: CohortSummaryDto = {
 *   totalPatients: 150,
 *   activePatients: 120,
 *   patientsWithAlerts: 25,
 *   averageAge: 45.5,
 *   ageDistribution: {
 *     under30: 20,
 *     between30And50: 60,
 *     between50And70: 50,
 *     over70: 20,
 *   },
 * };
 * ```
 */
export class CohortSummaryDto {
  /**
   * Total number of patients in the clinic's cohort.
   */
  @IsInt()
  @Min(0)
  totalPatients: number;

  /**
   * Number of patients with activity in the reporting period.
   */
  @IsInt()
  @Min(0)
  activePatients: number;

  /**
   * Number of patients with at least one active alert.
   */
  @IsInt()
  @Min(0)
  patientsWithAlerts: number;

  /**
   * Average age of patients in the cohort.
   */
  @IsNumber()
  @Min(0)
  averageAge: number;

  /**
   * Distribution of patients by age group.
   */
  @ValidateNested()
  @Type(() => AgeDistributionDto)
  ageDistribution: AgeDistributionDto;
}
