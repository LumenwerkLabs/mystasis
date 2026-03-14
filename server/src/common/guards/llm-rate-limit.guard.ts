import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  LLM_RATE_LIMIT_KEY,
  LlmRateLimitMetadata,
} from '../decorators/llm-rate-limit.decorator';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface AuthenticatedRequest extends Request {
  user?: { sub: string };
}

/**
 * Per-user rate limit guard for LLM endpoints.
 *
 * @description Enforces per-user rate limiting using the authenticated user's ID
 * (from JWT `sub` claim). Must be placed AFTER JwtAuthGuard in the guard chain
 * so that `req.user` is populated.
 *
 * Uses in-memory tracking. For multi-instance deployments, swap the internal
 * Map for a Redis-backed store.
 *
 * @example
 * @UseGuards(JwtAuthGuard, RolesGuard, LlmRateLimitGuard)
 * @LlmRateLimit(5, 3600)
 * @Post('summary/:userId')
 * async createSummary() { ... }
 */
@Injectable()
export class LlmRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LlmRateLimitGuard.name);
  private readonly store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Defensive check: this guard must run after JwtAuthGuard
    if (!request.user?.sub) {
      this.logger.error(
        'LlmRateLimitGuard must be applied after JwtAuthGuard — req.user.sub is missing',
      );
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const metadata = this.reflector.getAllAndOverride<
      LlmRateLimitMetadata | undefined
    >(LLM_RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    const limit = metadata?.limit ??
      this.configService.get<number>('throttle.llmSummaryLimit', 5);
    const ttlSeconds = metadata?.ttl ??
      this.configService.get<number>('throttle.llmSummaryTtl', 3600);

    const method = request.method;
    const route = request.route?.path ?? request.path;
    const userId = request.user.sub;
    const key = `llm-rate:${method}:${route}:${userId}`;

    const now = Date.now();
    this.cleanupExpiredEntries(now);

    const entry = this.store.get(key);

    if (entry && now < entry.resetTime) {
      entry.count++;

      if (entry.count > limit) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        response.setHeader('X-RateLimit-Limit', limit);
        response.setHeader('X-RateLimit-Remaining', 0);
        response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
        response.setHeader('Retry-After', retryAfter);

        this.logger.warn(
          `Rate limit exceeded for user ${userId} on ${method} ${route}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            timestamp: new Date().toISOString(),
            path: request.url,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', limit - entry.count);
      response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

      return true;
    }

    // New window
    const resetTime = now + ttlSeconds * 1000;
    this.store.set(key, { count: 1, resetTime });

    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', limit - 1);
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    return true;
  }

  private cleanupExpiredEntries(now: number): void {
    if (now - this.lastCleanup < this.cleanupIntervalMs) {
      return;
    }
    this.lastCleanup = now;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
