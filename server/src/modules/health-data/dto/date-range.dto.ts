import { IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base DTO for optional date range query parameters.
 *
 * @description Contains optional startDate and endDate fields for filtering.
 */
export class OptionalDateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601 format)',
    example: '2024-01-31T23:59:59Z',
    format: 'date-time',
  })
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
  @ApiProperty({
    description: 'Start date for the trend analysis period (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @IsISO8601()
  startDate: string;

  @ApiProperty({
    description: 'End date for the trend analysis period (ISO 8601 format)',
    example: '2024-01-31T23:59:59Z',
    format: 'date-time',
  })
  @IsISO8601()
  endDate: string;
}
