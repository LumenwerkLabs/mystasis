import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for password verification.
 *
 * @description Used by the verify-password endpoint to confirm the
 * current user's password without issuing new tokens.
 */
export class VerifyPasswordDto {
  /**
   * The user's current password to verify.
   */
  @ApiProperty({
    description: 'Current password to verify',
    example: 'SecurePass123',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
