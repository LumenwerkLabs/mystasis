import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token from login/register response',
    example: 'a1b2c3d4e5f6...',
    required: false,
  })
  @IsString()
  @IsOptional()
  refresh_token?: string;
}
