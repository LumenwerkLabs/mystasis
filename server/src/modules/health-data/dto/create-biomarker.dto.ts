import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '../../../generated/prisma/client';
import { BaseBiomarkerDto } from './base-biomarker.dto';

/**
 * DTO for creating a single biomarker value.
 *
 * @description Validates incoming data for creating a new biomarker entry.
 * All biomarker data is considered PHI under HIPAA.
 */
export class CreateBiomarkerDto extends BaseBiomarkerDto {
  @ApiProperty({
    description: 'UUID of the user this biomarker belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the biomarker (JSON object)',
    example: { device: 'Apple Watch Series 9', firmware: '10.2' },
  })
  @IsOptional()
  metadata?: Prisma.InputJsonValue;
}
