import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { LlmRateLimitGuard } from './llm-rate-limit.guard';

describe('LlmRateLimitGuard', () => {
  let guard: LlmRateLimitGuard;
  let reflector: Reflector;
  let configService: ConfigService;

  const createMockContext = (
    userId: string,
    method = 'POST',
    path = '/llm/summary/:userId',
    url = '/llm/summary/user-123',
  ): ExecutionContext => {
    const mockResponse = {
      setHeader: jest.fn(),
    };
    const mockRequest = {
      user: { sub: userId },
      method,
      route: { path },
      url,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    configService = {
      get: jest.fn((key: string, defaultValue?: number) => {
        const config: Record<string, number> = {
          'throttle.llmSummaryLimit': 5,
          'throttle.llmSummaryTtl': 3600,
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    guard = new LlmRateLimitGuard(reflector, configService);
  });

  describe('basic behavior', () => {
    it('should allow requests under the limit', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 3, ttl: 60 });
      const context = createMockContext('user-1');

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow requests up to the limit', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 3, ttl: 60 });

      for (let i = 0; i < 3; i++) {
        const context = createMockContext('user-1');
        expect(guard.canActivate(context)).toBe(true);
      }
    });

    it('should block requests exceeding the limit with 429', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 2, ttl: 60 });

      const context1 = createMockContext('user-1');
      const context2 = createMockContext('user-1');
      const context3 = createMockContext('user-1');

      expect(guard.canActivate(context1)).toBe(true);
      expect(guard.canActivate(context2)).toBe(true);

      expect(() => guard.canActivate(context3)).toThrow(HttpException);

      try {
        guard.canActivate(context3);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });

  describe('per-user tracking', () => {
    it('should track different users independently', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, ttl: 60 });

      const contextUser1 = createMockContext('user-1');
      const contextUser2 = createMockContext('user-2');

      expect(guard.canActivate(contextUser1)).toBe(true);
      expect(guard.canActivate(contextUser2)).toBe(true);
    });

    it('should block one user without affecting another', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, ttl: 60 });

      const contextUser1a = createMockContext('user-1');
      const contextUser1b = createMockContext('user-1');
      const contextUser2 = createMockContext('user-2');

      expect(guard.canActivate(contextUser1a)).toBe(true);
      expect(() => guard.canActivate(contextUser1b)).toThrow(HttpException);
      expect(guard.canActivate(contextUser2)).toBe(true);
    });
  });

  describe('per-endpoint tracking', () => {
    it('should track different endpoints independently for the same user', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, ttl: 60 });

      const summaryContext = createMockContext(
        'user-1', 'POST', '/llm/summary/:userId', '/llm/summary/user-1',
      );
      const nudgeContext = createMockContext(
        'user-1', 'GET', '/llm/nudge/:userId', '/llm/nudge/user-1',
      );

      expect(guard.canActivate(summaryContext)).toBe(true);
      expect(guard.canActivate(nudgeContext)).toBe(true);
    });
  });

  describe('TTL window reset', () => {
    it('should reset counter after TTL expires', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, ttl: 1 });

      const context1 = createMockContext('user-1');
      expect(guard.canActivate(context1)).toBe(true);

      // Manually expire the entry by manipulating the store
      const store = (guard as unknown as { store: Map<string, { count: number; resetTime: number }> }).store;
      for (const [, entry] of store.entries()) {
        entry.resetTime = Date.now() - 1;
      }

      const context2 = createMockContext('user-1');
      expect(guard.canActivate(context2)).toBe(true);
    });
  });

  describe('response headers', () => {
    it('should set X-RateLimit-Limit header', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 5, ttl: 60 });

      const context = createMockContext('user-1');
      guard.canActivate(context);

      const response = context.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    });

    it('should set X-RateLimit-Remaining header', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 5, ttl: 60 });

      const context = createMockContext('user-1');
      guard.canActivate(context);

      const response = context.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    });

    it('should set X-RateLimit-Reset header', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 5, ttl: 60 });

      const context = createMockContext('user-1');
      guard.canActivate(context);

      const response = context.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(Number),
      );
    });

    it('should set Retry-After header when rate limited', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, ttl: 60 });

      const context1 = createMockContext('user-1');
      guard.canActivate(context1);

      const context2 = createMockContext('user-1');
      try {
        guard.canActivate(context2);
      } catch {
        // expected
      }

      const response = context2.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(Number),
      );
    });

    it('should decrement remaining count on subsequent requests', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 3, ttl: 60 });

      const context1 = createMockContext('user-1');
      guard.canActivate(context1);
      const response1 = context1.switchToHttp().getResponse();
      expect(response1.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);

      const context2 = createMockContext('user-1');
      guard.canActivate(context2);
      const response2 = context2.switchToHttp().getResponse();
      expect(response2.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
    });
  });

  describe('error response format', () => {
    it('should return standard error response shape', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, ttl: 60 });

      const context1 = createMockContext('user-1');
      guard.canActivate(context1);

      const context2 = createMockContext('user-1');
      try {
        guard.canActivate(context2);
        fail('Should have thrown');
      } catch (e) {
        const response = (e as HttpException).getResponse() as Record<string, unknown>;
        expect(response.statusCode).toBe(429);
        expect(response.error).toBe('Too Many Requests');
        expect(response.message).toMatch(/Rate limit exceeded/);
        expect(response.timestamp).toBeDefined();
        expect(response.path).toBeDefined();
      }
    });
  });

  describe('missing authentication', () => {
    it('should throw 500 when req.user is missing', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 5, ttl: 60 });

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: undefined, method: 'POST', route: { path: '/llm/summary' }, url: '/llm/summary/x' }),
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(HttpException);

      try {
        guard.canActivate(context);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  });

  describe('config fallback', () => {
    it('should use config defaults when no decorator metadata is present', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockContext('user-1');
      expect(guard.canActivate(context)).toBe(true);

      const response = context.switchToHttp().getResponse();
      // Should fall back to config value of 5
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    });
  });
});
