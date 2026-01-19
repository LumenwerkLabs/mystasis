import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for user registration.
 *
 * @description Validates registration data with the following rules:
 * - email: Must be a valid email format
 * - password: Minimum 8 characters, must contain at least one letter and one number
 * - firstName: Optional string
 * - lastName: Optional string
 *
 * @remarks
 * SECURITY: The role field is intentionally excluded from registration.
 * All users register as PATIENT by default. Role elevation (to CLINICIAN)
 * must be performed through a separate admin-controlled process.
 *
 * @example
 * const dto = new RegisterDto();
 * dto.email = 'user@example.com';
 * dto.password = 'SecurePass123';
 * dto.firstName = 'John';
 * dto.lastName = 'Doe';
 */
export class RegisterDto {
  /**
   * User's email address.
   * Must be a valid email format.
   */
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * User's password.
   * Must be at least 8 characters and contain both letters and numbers.
   */
  @ApiProperty({
    description:
      'Password (minimum 8 characters, must contain at least one letter and one number)',
    example: 'SecurePass123',
    minLength: 8,
    pattern: '^(?=.*[a-zA-Z])(?=.*[0-9])',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  /**
   * User's first name.
   * Optional field.
   */
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  /**
   * User's last name.
   * Optional field.
   */
  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;
}
