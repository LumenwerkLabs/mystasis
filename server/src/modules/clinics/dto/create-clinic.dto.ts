import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * DTO for creating a new clinic.
 *
 * @description Contains validation rules for clinic creation.
 * Only the name field is required.
 */
export class CreateClinicDto {
  /**
   * The name of the clinic.
   * Must be between 2 and 200 characters long.
   */
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  /**
   * The physical address of the clinic.
   * Optional field, max 500 characters.
   */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  /**
   * The phone number of the clinic.
   * Optional field, max 20 characters, must be a valid phone number format.
   */
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[+]?[\d\s()-]*$/, { message: 'Invalid phone number format' })
  phone?: string;
}
