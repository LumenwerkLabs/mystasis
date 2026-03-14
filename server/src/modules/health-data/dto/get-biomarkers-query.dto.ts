import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BiomarkerType } from '../../../generated/prisma/client';
import { OptionalDateRangeDto } from './date-range.dto';

/**
 * DTO for GET biomarkers query parameters.
 *
 * @description Validates and transforms query parameters for filtering
 * and paginating biomarker results.
 */
export class GetBiomarkersQueryDto extends OptionalDateRangeDto {
  @ApiPropertyOptional({
    description: 'Filter by biomarker type',
    enum: BiomarkerType,
    example: 'HEART_RATE',
  })
  @IsOptional()
  @IsEnum(BiomarkerType)
  type?: BiomarkerType;

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

  @ApiPropertyOptional({
    description: 'Number of items per page (max 100)',
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
