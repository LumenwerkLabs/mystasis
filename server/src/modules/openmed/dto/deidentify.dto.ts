import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * De-identification methods supported by OpenMed service.
 */
export enum DeidentificationMethod {
  MASK = 'mask',
  REMOVE = 'remove',
  REPLACE = 'replace',
  HASH = 'hash',
  SHIFT_DATES = 'shift_dates',
}

/**
 * Maximum text length to prevent DoS via large payloads (1MB).
 * Matches the Python service's MAX_TEXT_LENGTH constant.
 */
const MAX_TEXT_LENGTH = 1_000_000;

/**
 * Request DTO for de-identification operations.
 *
 * @description Validates incoming de-identification requests.
 * The text field is required, all other fields are optional.
 */
export class DeidentifyRequestDto {
  /**
   * The clinical text to de-identify.
   * Must be a non-empty string with maximum length of 1MB.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TEXT_LENGTH)
  text: string;

  /**
   * The de-identification method to use.
   * Defaults to 'mask' if not specified (handled by service).
   */
  @IsOptional()
  @IsEnum(DeidentificationMethod)
  method?: DeidentificationMethod;

  /**
   * Minimum confidence threshold for PII detection.
   * Must be between 0 and 1 (inclusive).
   * Defaults to config value if not specified (handled by service).
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  /**
   * Whether to use smart merging for adjacent PII entities.
   * Defaults to true if not specified (handled by service).
   */
  @IsOptional()
  @IsBoolean()
  useSmartMerging?: boolean;

  /**
   * Whether to include the original text in the response.
   * Default: false for security - original text is NOT returned.
   * Only set to true for debugging purposes.
   *
   * WARNING: Setting this to true will include PHI in the response.
   * Only use in development or when absolutely necessary for debugging.
   */
  @IsOptional()
  @IsBoolean()
  includeOriginalText?: boolean;
}

/**
 * DTO representing a detected PII entity in the text.
 */
export class PIIEntityDto {
  /**
   * The original text that was identified as PII.
   */
  @ApiProperty({
    description: 'The original text that was identified as PII',
    example: 'John Smith',
  })
  text: string;

  /**
   * The NER label assigned to this entity (e.g., 'PERSON', 'DATE').
   */
  @ApiProperty({
    description:
      "The NER label assigned to this entity (e.g., 'PERSON', 'DATE')",
    example: 'PERSON',
  })
  label: string;

  /**
   * The PII entity type (e.g., 'NAME', 'SSN', 'EMAIL').
   */
  @ApiProperty({
    description: "The PII entity type (e.g., 'NAME', 'SSN', 'EMAIL')",
    example: 'NAME',
  })
  entityType: string;

  /**
   * The start character position of the entity in the original text.
   */
  @ApiProperty({
    description:
      'The start character position of the entity in the original text',
    example: 8,
  })
  start: number;

  /**
   * The end character position of the entity in the original text.
   */
  @ApiProperty({
    description:
      'The end character position of the entity in the original text',
    example: 18,
  })
  end: number;

  /**
   * The confidence score for this entity detection (0 to 1).
   */
  @ApiProperty({
    description: 'The confidence score for this entity detection (0 to 1)',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  confidence: number;

  /**
   * The text used to replace the original PII (optional).
   * Only present when using mask, hash, or replace methods.
   */
  @ApiPropertyOptional({
    description:
      'The text used to replace the original PII. Only present when using mask, hash, or replace methods.',
    example: '[NAME]',
  })
  redactedText?: string;
}

/**
 * Response DTO for de-identification operations.
 */
export class DeidentifyResponseDto {
  /**
   * The original input text before de-identification.
   */
  @ApiProperty({
    description: 'The original input text before de-identification',
    example: 'Patient John Smith (DOB: 01/15/1980) reported chest pain.',
  })
  originalText: string;

  /**
   * The de-identified output text.
   */
  @ApiProperty({
    description: 'The de-identified output text with PII redacted',
    example: 'Patient [NAME] (DOB: [DATE]) reported chest pain.',
  })
  deidentifiedText: string;

  /**
   * Array of detected PII entities.
   */
  @ApiProperty({
    description: 'Array of detected PII entities',
    type: [PIIEntityDto],
  })
  piiEntities: PIIEntityDto[];

  /**
   * The de-identification method that was used.
   */
  @ApiProperty({
    description: 'The de-identification method that was used',
    example: 'mask',
    enum: ['mask', 'remove', 'replace', 'hash', 'shift_dates', 'passthrough'],
  })
  method: string;

  /**
   * ISO 8601 timestamp of when the de-identification was performed.
   */
  @ApiProperty({
    description:
      'ISO 8601 timestamp of when the de-identification was performed',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  /**
   * The number of PII entities that were redacted.
   */
  @ApiProperty({
    description: 'The number of PII entities that were redacted',
    example: 2,
  })
  numEntitiesRedacted: number;
}
