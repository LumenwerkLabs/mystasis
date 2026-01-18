import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsISO8601,
  Min,
} from 'class-validator';
import { BiomarkerType } from '@prisma/client';

/**
 * Base DTO for biomarker data fields.
 *
 * @description Contains the common fields shared between single biomarker
 * creation and wearable batch sync operations.
 */
export class BaseBiomarkerDto {
  @IsEnum(BiomarkerType)
  type: BiomarkerType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsString()
  unit: string;

  @IsISO8601()
  timestamp: string;

  @IsOptional()
  @IsString()
  source?: string;
}
