import { IsISO8601, IsOptional } from 'class-validator';

/**
 * DTO for analytics query parameters.
 *
 * @description Validates query parameters for analytics endpoints.
 * Supports date range filtering for all analytics queries.
 *
 * @example
 * ```typescript
 * // GET /analytics/cohort/:clinicId/summary?startDate=2024-01-01&endDate=2024-01-31
 * const query: GetAnalyticsQueryDto = {
 *   startDate: '2024-01-01T00:00:00Z',
 *   endDate: '2024-01-31T23:59:59Z',
 * };
 * ```
 */
export class GetAnalyticsQueryDto {
  /**
   * Start date for the analytics period (ISO 8601 format).
   * If not provided, defaults to 30 days ago.
   */
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  /**
   * End date for the analytics period (ISO 8601 format).
   * If not provided, defaults to current date.
   */
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
