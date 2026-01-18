import {
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
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
  @IsUUID()
  userId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => WearableBiomarkerDto)
  biomarkers: WearableBiomarkerDto[];
}
