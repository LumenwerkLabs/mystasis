import { Global, Module } from '@nestjs/common';
import { CookieService } from './services/cookie.service';

/**
 * Common module providing shared services across the application.
 *
 * @description This module is marked as @Global so its exports are
 * available everywhere without explicit imports. Contains utility
 * services that are used across multiple modules.
 *
 * Provided services:
 * - CookieService: Secure cookie management for JWT tokens
 */
@Global()
@Module({
  providers: [CookieService],
  exports: [CookieService],
})
export class CommonModule {}
