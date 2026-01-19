import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BiomarkerType, AlertSeverity } from '@prisma/client';

/**
 * DTO for creating a new alert.
 *
 * @description Validates incoming data for creating a health alert.
 * Alerts are typically generated when biomarker values exceed thresholds.
 *
 * @example
 * ```typescript
 * const dto: CreateAlertDto = {
 *   userId: '550e8400-e29b-41d4-a716-446655440000',
 *   type: BiomarkerType.HEART_RATE,
 *   severity: AlertSeverity.HIGH,
 *   title: 'Elevated Heart Rate',
 *   message: 'Your resting heart rate has been above 100 bpm for 3 days.',
 *   value: 105,
 *   threshold: 100,
 * };
 * ```
 */
export class CreateAlertDto {
  /**
   * UUID of the user this alert belongs to.
   * Must be a valid UUID v4 format.
   */
  @ApiProperty({
    description: 'UUID of the user this alert belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  /**
   * The biomarker type that triggered this alert.
   * Must be a valid BiomarkerType enum value.
   */
  @ApiProperty({
    description: 'The biomarker type that triggered this alert',
    enum: BiomarkerType,
    example: 'HEART_RATE',
  })
  @IsEnum(BiomarkerType)
  type: BiomarkerType;

  /**
   * Severity level of the alert.
   * Determines visual priority and notification behavior.
   */
  @ApiProperty({
    description:
      'Severity level determining visual priority and notification behavior',
    enum: AlertSeverity,
    example: 'HIGH',
  })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  /**
   * Short title for the alert.
   * Displayed in alert lists and notifications.
   * Must be between 1 and 200 characters.
   */
  @ApiProperty({
    description: 'Short title for the alert (1-200 characters)',
    example: 'Elevated Heart Rate',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  /**
   * Detailed message explaining the alert.
   * Provides context about why the alert was triggered.
   * Must be between 1 and 2000 characters.
   */
  @ApiProperty({
    description: 'Detailed message explaining the alert (1-2000 characters)',
    example: 'Your resting heart rate has been above 100 bpm for 3 days.',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  /**
   * The biomarker value that triggered the alert.
   * Optional - included when alert is triggered by a specific measurement.
   * Must be between 0 and 1,000,000.
   */
  @ApiPropertyOptional({
    description: 'The biomarker value that triggered the alert',
    example: 105,
    minimum: 0,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  value?: number;

  /**
   * The threshold value that was exceeded.
   * Optional - included when alert is triggered by threshold violation.
   * Must be between 0 and 1,000,000.
   */
  @ApiPropertyOptional({
    description: 'The threshold value that was exceeded',
    example: 100,
    minimum: 0,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  threshold?: number;
}
