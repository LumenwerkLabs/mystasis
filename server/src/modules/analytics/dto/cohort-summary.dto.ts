import { IsInt, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for age distribution in cohort summary.
 */
export class AgeDistributionDto {
  @ApiProperty({
    description: 'Number of patients under 30 years old',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  under30: number;

  @ApiProperty({
    description: 'Number of patients between 30 and 50 years old',
    example: 60,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  between30And50: number;

  @ApiProperty({
    description: 'Number of patients between 50 and 70 years old',
    example: 50,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  between50And70: number;

  @ApiProperty({
    description: 'Number of patients over 70 years old',
    example: 20,
    minimum: 0,
  })
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
  @ApiProperty({
    description: 'Total number of patients in the clinic cohort',
    example: 150,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  totalPatients: number;

  /**
   * Number of patients with activity in the reporting period.
   */
  @ApiProperty({
    description:
      'Number of patients with biomarker activity in the reporting period',
    example: 120,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  activePatients: number;

  /**
   * Number of patients with at least one active alert.
   */
  @ApiProperty({
    description: 'Number of patients with at least one active alert',
    example: 25,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  patientsWithAlerts: number;

  /**
   * Average age of patients in the cohort.
   */
  @ApiProperty({
    description: 'Average age of patients in the cohort',
    example: 45.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  averageAge: number;

  /**
   * Distribution of patients by age group.
   */
  @ApiProperty({
    description: 'Distribution of patients by age group',
    type: AgeDistributionDto,
  })
  @ValidateNested()
  @Type(() => AgeDistributionDto)
  ageDistribution: AgeDistributionDto;
}
