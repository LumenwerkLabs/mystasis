import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SummaryType } from '@prisma/client';

/**
 * Structured data extracted from LLM response.
 */
export class SummaryStructuredDataDto {
  @ApiPropertyOptional({
    description: 'Health flags identified by the LLM',
    example: ['Elevated HRV variability', 'Inconsistent sleep patterns'],
    type: [String],
  })
  flags?: string[];

  @ApiPropertyOptional({
    description: 'General wellness recommendations (not medical advice)',
    example: [
      'Consider maintaining a consistent sleep schedule',
      'Continue current activity levels',
    ],
    type: [String],
  })
  recommendations?: string[];

  @ApiPropertyOptional({
    description: 'Suggested questions to discuss with healthcare provider',
    example: [
      'What might be causing my HRV fluctuations?',
      'Should I be concerned about my heart rate trends?',
    ],
    type: [String],
  })
  questionsForDoctor?: string[];
}

/**
 * Response DTO for LLM-generated health summaries.
 */
export class SummaryResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the summary',
    example: 'summary-1705324800000',
  })
  id: string;

  @ApiProperty({
    description:
      'The generated summary text (sanitized for medical safety - no diagnoses or medication advice)',
    example:
      'Your heart rate variability has shown improvement over the past month. The data suggests positive adaptation to your current activity levels.',
  })
  content: string;

  @ApiProperty({
    description: 'Type of summary that was generated',
    enum: SummaryType,
    example: 'WEEKLY_SUMMARY',
  })
  type: SummaryType;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the summary was generated',
    example: '2024-01-15T10:00:00.000Z',
  })
  generatedAt: string;

  @ApiProperty({
    description: 'Medical disclaimer (always included)',
    example: 'Discuss these findings with your healthcare provider.',
  })
  disclaimer: string;

  @ApiPropertyOptional({
    description: 'Optional structured data extracted from the summary',
    type: SummaryStructuredDataDto,
  })
  structuredData?: SummaryStructuredDataDto;
}

/**
 * Response DTO for LLM-generated wellness nudges.
 */
export class NudgeResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the nudge',
    example: 'nudge-1705324800000',
  })
  id: string;

  @ApiProperty({
    description:
      'The generated nudge text (brief, encouraging wellness message)',
    example:
      'Great progress on your activity this week! Consider adding a short walk after meals to support your metabolic health.',
  })
  content: string;

  @ApiProperty({
    description: 'Always WELLNESS_NUDGE for nudges',
    enum: SummaryType,
    example: 'WELLNESS_NUDGE',
  })
  type: SummaryType;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the nudge was generated',
    example: '2024-01-15T10:00:00.000Z',
  })
  generatedAt: string;

  @ApiProperty({
    description: 'Medical disclaimer (always included)',
    example: 'Discuss these findings with your healthcare provider.',
  })
  disclaimer: string;
}
