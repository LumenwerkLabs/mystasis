import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BiomarkerType } from '../../../generated/prisma/client';

/**
 * DTO for a single data point in a trend.
 */
export class TrendDataPointDto {
  /**
   * Date for this data point. Format: YYYY-MM-DD
   */
  @ApiProperty({
    description: 'Date for this data point (YYYY-MM-DD)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Average value across all patients for this date',
    example: 72.5,
  })
  @IsNumber()
  averageValue: number;

  /**
   * Minimum value for this data point.
   * Null when sample size is below threshold to prevent re-identification.
   */
  @ApiPropertyOptional({
    description: 'Minimum value (null if sample size < 5 to protect privacy)',
    example: 55,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  minValue: number | null;

  /**
   * Maximum value for this data point.
   * Null when sample size is below threshold to prevent re-identification.
   */
  @ApiPropertyOptional({
    description: 'Maximum value (null if sample size < 5 to protect privacy)',
    example: 90,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  maxValue: number | null;

  @ApiProperty({
    description: 'Number of patients contributing to this data point',
    example: 100,
  })
  @IsNumber()
  sampleSize: number;
}

/**
 * DTO for population biomarker trend summary.
 *
 * @description Contains trend data for a specific biomarker type
 * across a clinic's patient cohort. Includes statistical aggregates
 * and time-series data points.
 *
 * @example
 * ```typescript
 * const trend: TrendSummaryDto = {
 *   biomarkerType: BiomarkerType.HEART_RATE,
 *   unit: 'bpm',
 *   populationAverage: 72.5,
 *   populationMin: 55,
 *   populationMax: 95,
 *   trend: 'stable',
 *   dataPoints: [
 *     { date: '2024-01-01', averageValue: 72, minValue: 55, maxValue: 90, sampleSize: 100 },
 *     { date: '2024-01-08', averageValue: 73, minValue: 56, maxValue: 92, sampleSize: 105 },
 *   ],
 * };
 * ```
 */
export class TrendSummaryDto {
  /**
   * The biomarker type for this trend data.
   */
  @ApiProperty({
    description: 'The biomarker type for this trend data',
    enum: BiomarkerType,
    example: 'HEART_RATE',
  })
  @IsEnum(BiomarkerType)
  biomarkerType: BiomarkerType;

  /**
   * Unit of measurement for the biomarker.
   */
  @ApiProperty({
    description: 'Unit of measurement for the biomarker',
    example: 'bpm',
  })
  @IsString()
  unit: string;

  /**
   * Average value across the entire population.
   */
  @ApiProperty({
    description: 'Average value across the entire population',
    example: 72.5,
  })
  @IsNumber()
  populationAverage: number;

  /**
   * Minimum value recorded in the population.
   */
  @ApiProperty({
    description: 'Minimum value recorded in the population',
    example: 55,
  })
  @IsNumber()
  populationMin: number;

  /**
   * Maximum value recorded in the population.
   */
  @ApiProperty({
    description: 'Maximum value recorded in the population',
    example: 95,
  })
  @IsNumber()
  populationMax: number;

  /**
   * Overall trend direction: 'increasing', 'decreasing', or 'stable'.
   */
  @ApiProperty({
    description: 'Overall trend direction',
    enum: ['increasing', 'decreasing', 'stable'],
    example: 'stable',
  })
  @IsString()
  trend: 'increasing' | 'decreasing' | 'stable';

  /**
   * Time-series data points for the trend.
   */
  @ApiProperty({
    description: 'Time-series data points for the trend',
    type: [TrendDataPointDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrendDataPointDto)
  dataPoints: TrendDataPointDto[];
}
