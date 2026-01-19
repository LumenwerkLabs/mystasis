import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SummaryType } from '@prisma/client';

/**
 * Data transfer object for creating a health summary.
 *
 * @description Used as the request body for POST /llm/summary/:userId endpoint.
 * Validates that the summaryType is a valid SummaryType enum value.
 *
 * @example
 * ```typescript
 * const dto = new CreateSummaryDto();
 * dto.summaryType = SummaryType.WEEKLY_SUMMARY;
 * ```
 */
export class CreateSummaryDto {
  /**
   * The type of summary to generate.
   *
   * @description Must be a valid SummaryType enum value:
   * - DAILY_RECAP: Brief daily health overview
   * - WEEKLY_SUMMARY: Comprehensive weekly analysis
   * - TREND_ANALYSIS: Long-term trend insights
   * - RISK_ASSESSMENT: Risk factor evaluation
   * - WELLNESS_NUDGE: Motivational wellness message
   * - CLINICIAN_REPORT: Detailed report for clinicians
   */
  @ApiProperty({
    description: 'Type of summary to generate',
    enum: SummaryType,
    example: 'WEEKLY_SUMMARY',
    enumName: 'SummaryType',
  })
  @IsNotEmpty()
  @IsEnum(SummaryType)
  summaryType: SummaryType;
}
