import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for updating user profile.
 *
 * @description Validates user profile update data with the following rules:
 * - firstName: Optional string
 * - lastName: Optional string
 * - password: Optional, minimum 8 characters, must contain at least one letter and one number
 *
 * @remarks
 * All fields are optional to support partial updates.
 * Only the user themselves or a clinician in their clinic can update their profile.
 *
 * @example
 * const dto = new UpdateUserDto();
 * dto.firstName = 'Jane';
 * dto.lastName = 'Smith';
 */
export class UpdateUserDto {
  /**
   * User's first name.
   * Optional field.
   */
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'Jane',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName?: string;

  /**
   * User's last name.
   * Optional field.
   */
  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Smith',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName?: string;

  /**
   * User's new password.
   * Must be at least 8 characters and contain both letters and numbers.
   */
  @ApiPropertyOptional({
    description:
      'New password (minimum 8 characters, must contain at least one letter and one number)',
    example: 'NewSecurePass123',
    minLength: 8,
    pattern: '^(?=.*[a-zA-Z])(?=.*[0-9])',
  })
  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one letter and one number',
  })
  password?: string;

  /**
   * Current password for verification when changing password.
   * Required when `password` is provided.
   */
  @ApiPropertyOptional({
    description:
      'Current password (required when changing password, for verification)',
    example: 'OldSecurePass123',
  })
  @IsOptional()
  @IsString({ message: 'Current password must be a string' })
  currentPassword?: string;

  /**
   * Whether to share health data with the user's clinician.
   */
  @ApiPropertyOptional({
    description: 'Allow clinician to view health data',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'shareWithClinician must be a boolean' })
  shareWithClinician?: boolean;

  /**
   * Whether to contribute anonymized data to research.
   */
  @ApiPropertyOptional({
    description: 'Contribute anonymized data to longevity research',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'anonymousResearch must be a boolean' })
  anonymousResearch?: boolean;
}
