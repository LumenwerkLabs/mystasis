import { IsISO8601, IsOptional } from 'class-validator';

/**
 * Base DTO for optional date range query parameters.
 *
 * @description Contains optional startDate and endDate fields for filtering.
 */
export class OptionalDateRangeDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

/**
 * DTO for required date range query parameters.
 *
 * @description Contains required startDate and endDate fields for trend analysis.
 */
export class RequiredDateRangeDto {
  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;
}
