import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsISO8601,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BiomarkerType } from '../../../generated/prisma/client';

/**
 * Base DTO for biomarker data fields.
 *
 * @description Contains the common fields shared between single biomarker
 * creation and wearable batch sync operations.
 */
export class BaseBiomarkerDto {
  @ApiProperty({
    description: 'Type of biomarker being recorded',
    enum: BiomarkerType,
    example: 'HEART_RATE',
  })
  @IsEnum(BiomarkerType)
  type: BiomarkerType;

  @ApiProperty({
    description: 'Numeric value of the biomarker measurement',
    example: 72,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({
    description: 'Unit of measurement for the biomarker value',
    example: 'bpm',
  })
  @IsString()
  unit: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the measurement was taken',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @IsISO8601()
  timestamp: string;

  @ApiPropertyOptional({
    description:
      'Source of the biomarker data (e.g., Apple Health, Fitbit, Lab)',
    example: 'Apple Health',
  })
  @IsOptional()
  @IsString()
  source?: string;
}
