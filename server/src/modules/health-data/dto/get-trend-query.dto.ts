import { RequiredDateRangeDto } from './date-range.dto';

/**
 * DTO for GET trend query parameters.
 *
 * @description Validates required date range parameters for trend analysis.
 */
export class GetTrendQueryDto extends RequiredDateRangeDto {}
