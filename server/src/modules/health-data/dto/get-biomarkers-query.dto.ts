import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BiomarkerType } from '@prisma/client';
import { OptionalDateRangeDto } from './date-range.dto';

/**
 * DTO for GET biomarkers query parameters.
 *
 * @description Validates and transforms query parameters for filtering
 * and paginating biomarker results.
 */
export class GetBiomarkersQueryDto extends OptionalDateRangeDto {
  @IsOptional()
  @IsEnum(BiomarkerType)
  type?: BiomarkerType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
