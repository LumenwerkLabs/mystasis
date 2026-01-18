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
import { BiomarkerType } from '@prisma/client';

/**
 * DTO for a single data point in a trend.
 */
export class TrendDataPointDto {
  /**
   * Date for this data point. Format: YYYY-MM-DD
   */
  @IsDateString()
  date: string;

  @IsNumber()
  averageValue: number;

  /**
   * Minimum value for this data point.
   * Null when sample size is below threshold to prevent re-identification.
   */
  @IsOptional()
  @IsNumber()
  minValue: number | null;

  /**
   * Maximum value for this data point.
   * Null when sample size is below threshold to prevent re-identification.
   */
  @IsOptional()
  @IsNumber()
  maxValue: number | null;

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
  @IsEnum(BiomarkerType)
  biomarkerType: BiomarkerType;

  /**
   * Unit of measurement for the biomarker.
   */
  @IsString()
  unit: string;

  /**
   * Average value across the entire population.
   */
  @IsNumber()
  populationAverage: number;

  /**
   * Minimum value recorded in the population.
   */
  @IsNumber()
  populationMin: number;

  /**
   * Maximum value recorded in the population.
   */
  @IsNumber()
  populationMax: number;

  /**
   * Overall trend direction: 'increasing', 'decreasing', or 'stable'.
   */
  @IsString()
  trend: 'increasing' | 'decreasing' | 'stable';

  /**
   * Time-series data points for the trend.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrendDataPointDto)
  dataPoints: TrendDataPointDto[];
}
