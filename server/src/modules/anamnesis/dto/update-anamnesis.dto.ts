import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an existing anamnesis record.
 *
 * @description Allows partial updates to structured fields and review status.
 * The patientId and rawTranscript are immutable after creation — the original
 * transcript cannot be altered for audit trail integrity, and a consultation
 * cannot be reassigned to a different patient.
 */
export class UpdateAnamnesisDto {
  @ApiPropertyOptional({
    description: "The patient's main reason for the visit",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chiefComplaint?: string;

  @ApiPropertyOptional({
    description: 'Details of the present illness',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  historyOfPresentIllness?: string;

  @ApiPropertyOptional({
    description: 'Past medical conditions, surgeries, or hospitalizations',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  pastMedicalHistory?: string[];

  @ApiPropertyOptional({
    description: 'Current medications',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  currentMedications?: string[];

  @ApiPropertyOptional({
    description: 'Allergies and reactions',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  allergies?: string[];

  @ApiPropertyOptional({
    description: 'Family medical history',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  familyHistory?: string[];

  @ApiPropertyOptional({
    description: 'Review of systems by body system',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  reviewOfSystems?: string[];

  @ApiPropertyOptional({
    description: 'Social history and lifestyle factors',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  socialHistory?: string[];

  @ApiPropertyOptional({
    description: 'Whether the clinician has reviewed and confirmed the output',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isReviewed?: boolean;
}
