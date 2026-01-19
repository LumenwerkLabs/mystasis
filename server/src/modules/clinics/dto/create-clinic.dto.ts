import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({
    description: 'Name of the clinic (2-200 characters)',
    example: 'Downtown Health Clinic',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  /**
   * The physical address of the clinic.
   * Optional field, max 500 characters.
   */
  @ApiPropertyOptional({
    description: 'Physical address of the clinic (max 500 characters)',
    example: '123 Medical Center Dr, Suite 100, San Francisco, CA 94102',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  /**
   * The phone number of the clinic.
   * Optional field, max 20 characters, must be a valid phone number format.
   */
  @ApiPropertyOptional({
    description:
      'Phone number of the clinic (max 20 characters, digits/spaces/dashes/parentheses)',
    example: '+1 (415) 555-0100',
    maxLength: 20,
    pattern: '^[+]?[\\d\\s()-]*$',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[+]?[\d\s()-]*$/, { message: 'Invalid phone number format' })
  phone?: string;
}
