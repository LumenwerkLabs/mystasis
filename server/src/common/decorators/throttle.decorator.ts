import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Throttle as NestThrottle } from '@nestjs/throttler';

/**
 * Metadata key constant for storing rate limit (number of requests).
 *
 * @description Used by throttling guards to retrieve the maximum number
 * of requests allowed within the TTL window.
 */
export const THROTTLER_LIMIT = 'THROTTLER:LIMIT';

/**
 * Metadata key constant for storing TTL (time window in seconds).
 *
 * @description Used by throttling guards to retrieve the time window
 * in seconds during which the limit is enforced.
 */
export const THROTTLER_TTL = 'THROTTLER:TTL';

/**
 * Decorator for rate limiting endpoints.
 *
 * @description Applies rate limiting metadata to route handlers. This decorator
 * sets the maximum number of requests allowed (limit) within a time window (ttl).
 * Uses @nestjs/throttler for runtime enforcement and custom metadata for testing.
 *
 * @param limit - Maximum number of requests allowed within the TTL window
 * @param ttl - Time window in seconds during which the limit is enforced
 * @returns A method decorator that sets throttle metadata
 *
 * @example
 * // Limit to 5 requests per minute (60 seconds)
 * @Throttle(5, 60)
 * @Post('login')
 * async login(@Body() dto: LoginDto) {
 *   return this.authService.login(dto);
 * }
 *
 * @example
 * // Limit to 3 requests per hour (3600 seconds)
 * @Throttle(3, 3600)
 * @Post('register')
 * async register(@Body() dto: RegisterDto) {
 *   return this.authService.register(dto);
 * }
 */
export const Throttle = (limit: number, ttl: number) =>
  applyDecorators(
    // Custom metadata for unit tests
    SetMetadata(THROTTLER_LIMIT, limit),
    SetMetadata(THROTTLER_TTL, ttl),
    // @nestjs/throttler decorator for runtime enforcement
    // TTL is in milliseconds for @nestjs/throttler
    NestThrottle({ default: { limit, ttl: ttl * 1000 } }),
  );
