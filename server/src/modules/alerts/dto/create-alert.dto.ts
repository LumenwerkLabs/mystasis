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
  @IsUUID()
  userId: string;

  /**
   * The biomarker type that triggered this alert.
   * Must be a valid BiomarkerType enum value.
   */
  @IsEnum(BiomarkerType)
  type: BiomarkerType;

  /**
   * Severity level of the alert.
   * Determines visual priority and notification behavior.
   */
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  /**
   * Short title for the alert.
   * Displayed in alert lists and notifications.
   * Must be between 1 and 200 characters.
   */
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
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  threshold?: number;
}
