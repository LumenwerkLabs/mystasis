import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a structured anamnesis record.
 *
 * @description Validates incoming data for persisting a clinician-reviewed
 * anamnesis. The structured fields are AI-generated from a voice transcript
 * using on-device Foundation Models and must be reviewed before saving.
 *
 * All anamnesis data is considered PHI under HIPAA.
 */
export class CreateAnamnesisDto {
  @ApiProperty({
    description: 'UUID of the patient this anamnesis belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'Raw voice transcript from the consultation recording',
    example: 'Doctor: What brings you in today? Patient: I have been having headaches...',
  })
  @IsString()
  @IsNotEmpty()
  rawTranscript: string;

  @ApiProperty({
    description: "The patient's main reason for the visit, stated concisely",
    example: 'Recurring headaches for the past two weeks',
  })
  @IsString()
  chiefComplaint: string;

  @ApiProperty({
    description: 'Details of the present illness: symptoms, onset, duration, severity',
    example: 'Patient reports bilateral frontal headaches starting two weeks ago...',
  })
  @IsString()
  historyOfPresentIllness: string;

  @ApiProperty({
    description: 'Relevant past medical conditions, surgeries, or hospitalizations',
    example: ['Appendectomy 2015', 'Seasonal allergies'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  pastMedicalHistory: string[];

  @ApiProperty({
    description: 'Current medications the patient reports taking',
    example: ['Ibuprofen 400mg as needed', 'Cetirizine 10mg daily'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  currentMedications: string[];

  @ApiProperty({
    description: 'Allergies mentioned by the patient, including reactions',
    example: ['Penicillin - rash'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  allergies: string[];

  @ApiProperty({
    description: 'Family medical history mentioned during the consultation',
    example: ['Father - hypertension', 'Mother - type 2 diabetes'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  familyHistory: string[];

  @ApiProperty({
    description: 'Review of systems: symptoms organized by body system',
    example: ['Neurological: headaches, no dizziness', 'GI: no nausea'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  reviewOfSystems: string[];

  @ApiProperty({
    description: 'Social history including lifestyle factors',
    example: ['Non-smoker', 'Social alcohol use', 'Software engineer'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  socialHistory: string[];

  @ApiProperty({
    description: 'When the consultation was recorded (ISO 8601)',
    example: '2024-06-15T14:30:00Z',
  })
  @IsDateString()
  recordedAt: string;

  @ApiPropertyOptional({
    description: 'Whether the clinician has reviewed and confirmed the structured output',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isReviewed?: boolean;
}
