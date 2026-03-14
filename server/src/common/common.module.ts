import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CookieService } from './services/cookie.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { TokenCleanupService } from './services/token-cleanup.service';

/**
 * Common module providing shared services across the application.
 *
 * Provided services:
 * - CookieService: Secure cookie management for JWT tokens
 * - TokenBlacklistService: Access token revocation for logout/security
 * - TokenCleanupService: Hourly cleanup of expired tokens
 */
@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CookieService, TokenBlacklistService, TokenCleanupService],
  exports: [CookieService, TokenBlacklistService],
})
export class CommonModule {}
