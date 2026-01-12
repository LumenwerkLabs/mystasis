import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for user login.
 *
 * @description Validates login credentials:
 * - email: Must be a valid email format
 * - password: Must be a non-empty string
 *
 * @example
 * const dto = new LoginDto();
 * dto.email = 'user@example.com';
 * dto.password = 'SecurePass123';
 */
export class LoginDto {
  /**
   * User's email address.
   * Must be a valid email format.
   */
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * User's password.
   * Must be a non-empty string.
   */
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
