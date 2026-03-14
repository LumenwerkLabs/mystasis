import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseBiomarkerDto } from './base-biomarker.dto';

/**
 * DTO for individual biomarker entry in patient self-sync batch.
 */
export class PatientBiomarkerDto extends BaseBiomarkerDto {}

/**
 * DTO for patient-initiated health data sync (e.g., Apple Health).
 *
 * @description Unlike WearableSyncDto, this does NOT include userId.
 * The user ID is inferred from the JWT token to ensure patients
 * can only sync data to their own account.
 */
export class PatientSyncDto {
  @ApiProperty({
    description:
      'Array of biomarker readings from health data source (1-1000)',
    type: [PatientBiomarkerDto],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => PatientBiomarkerDto)
  biomarkers: PatientBiomarkerDto[];
}
