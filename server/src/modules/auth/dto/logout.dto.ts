import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Refresh token to revoke (optional but recommended)',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
