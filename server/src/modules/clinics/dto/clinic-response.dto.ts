import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for clinic response.
 *
 * @description Represents the clinic data returned in API responses.
 */
export class ClinicResponseDto {
  /** Unique identifier of the clinic */
  @ApiProperty({
    description: 'Unique identifier of the clinic (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /** Name of the clinic */
  @ApiProperty({
    description: 'Name of the clinic',
    example: 'Downtown Health Clinic',
  })
  name: string;

  /** Physical address of the clinic */
  @ApiPropertyOptional({
    description: 'Physical address of the clinic',
    example: '123 Medical Center Dr, Suite 100, San Francisco, CA 94102',
    nullable: true,
  })
  address?: string;

  /** Phone number of the clinic */
  @ApiPropertyOptional({
    description: 'Phone number of the clinic',
    example: '+1 (415) 555-0100',
    nullable: true,
  })
  phone?: string;

  /** Timestamp when the clinic was created */
  @ApiProperty({
    description: 'Timestamp when the clinic was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  /** Timestamp when the clinic was last updated */
  @ApiProperty({
    description: 'Timestamp when the clinic was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO for patient (user) in clinic responses.
 *
 * @description Safe user representation without password field.
 */
export class SafeUserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'patient@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    nullable: true,
  })
  firstName: string | null;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    nullable: true,
  })
  lastName: string | null;

  @ApiProperty({
    description: 'User role',
    enum: ['PATIENT', 'CLINICIAN'],
    example: 'PATIENT',
  })
  role: string;

  @ApiPropertyOptional({
    description: 'Clinic ID the user is enrolled in',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  clinicId: string | null;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
