import { IsOptional, IsUUID } from 'class-validator';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { BaseBiomarkerDto } from './base-biomarker.dto';

/**
 * DTO for creating a single biomarker value.
 *
 * @description Validates incoming data for creating a new biomarker entry.
 * All biomarker data is considered PHI under HIPAA.
 */
export class CreateBiomarkerDto extends BaseBiomarkerDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  metadata?: InputJsonValue;
}
