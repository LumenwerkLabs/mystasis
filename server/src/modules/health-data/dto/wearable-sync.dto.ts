import {
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseBiomarkerDto } from './base-biomarker.dto';

/**
 * DTO for individual biomarker entry in wearable sync batch.
 *
 * @description Extends BaseBiomarkerDto with all common biomarker fields.
 */
export class WearableBiomarkerDto extends BaseBiomarkerDto {}

/**
 * DTO for batch syncing biomarkers from wearable devices.
 *
 * @description Allows efficient batch creation of multiple biomarker readings
 * from a single wearable sync operation (e.g., Apple Health, Fitbit).
 */
export class WearableSyncDto {
  @ApiProperty({
    description: 'UUID of the user this sync belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Array of biomarker readings from wearable device (1-1000)',
    type: [WearableBiomarkerDto],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => WearableBiomarkerDto)
  biomarkers: WearableBiomarkerDto[];
}
