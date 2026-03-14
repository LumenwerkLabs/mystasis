import { SetMetadata, applyDecorators } from '@nestjs/common';

/**
 * Metadata key for LLM rate limit configuration.
 */
export const LLM_RATE_LIMIT_KEY = 'LLM_RATE_LIMIT';

/**
 * Metadata interface for LLM rate limit values.
 */
export interface LlmRateLimitMetadata {
  limit: number;
  ttl: number;
}

/**
 * Decorator for per-user rate limiting on LLM endpoints.
 *
 * @description Sets metadata used by LlmRateLimitGuard to enforce per-user
 * rate limits on expensive LLM endpoints. Tracks by authenticated user ID
 * (from JWT) rather than IP address.
 *
 * @param limit - Maximum number of requests allowed within the TTL window
 * @param ttlSeconds - Time window in seconds during which the limit is enforced
 *
 * @example
 * // Limit to 5 requests per hour per user
 * @LlmRateLimit(5, 3600)
 * @Post('summary/:userId')
 * async createSummary() { ... }
 */
export const LlmRateLimit = (limit: number, ttlSeconds: number) =>
  applyDecorators(SetMetadata(LLM_RATE_LIMIT_KEY, { limit, ttl: ttlSeconds }));
