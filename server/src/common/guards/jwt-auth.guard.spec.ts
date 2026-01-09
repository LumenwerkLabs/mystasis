import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, JWT_SERVICE } from './jwt-auth.guard';

/**
 * TDD Tests for JwtAuthGuard
 *
 * These tests define the expected behavior of JwtAuthGuard:
 * 1. Allow access with valid JWT token
 * 2. Deny access when no Authorization header
 * 3. Deny access when token is invalid
 * 4. Deny access when token is expired
 * 5. Attach decoded user to request object
 * 6. Handle "Bearer " prefix correctly
 *
 * The guard should:
 * - Extract JWT from Authorization header
 * - Strip "Bearer " prefix if present
 * - Verify token using injected JWT service
 * - Attach decoded payload to request.user
 * - Throw UnauthorizedException for any auth failure
 *
 * Note: JWT_SERVICE is a custom injection token to allow flexible JWT service injection.
 * This avoids hard dependency on @nestjs/jwt module.
 */

// Define interface for decoded JWT payload
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Define interface for JWT service (matches @nestjs/jwt JwtService API)
interface JwtServiceInterface {
  verify: (token: string) => JwtPayload;
  verifyAsync: (token: string) => Promise<JwtPayload>;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtServiceInterface>;

  // Mock JWT payload data
  const mockJwtPayload: JwtPayload = {
    sub: 'user-uuid-1',
    email: 'test@example.com',
    role: UserRole.PATIENT,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  const validToken = 'valid.jwt.token';
  const expiredToken = 'expired.jwt.token';
  const invalidToken = 'invalid.jwt.token';

  // Helper to create mock ExecutionContext with request
  const createMockExecutionContext = (
    authorizationHeader: string | undefined,
  ): {
    context: ExecutionContext;
    request: { user?: JwtPayload; headers: { authorization?: string } };
  } => {
    const mockRequest: {
      user?: JwtPayload;
      headers: { authorization?: string };
    } = {
      headers: authorizationHeader
        ? { authorization: authorizationHeader }
        : {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    return { context, request: mockRequest };
  };

  beforeEach(async () => {
    const mockJwtServiceImpl: jest.Mocked<JwtServiceInterface> = {
      verify: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JWT_SERVICE, useValue: mockJwtServiceImpl },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get(JWT_SERVICE);
  });

  describe('module setup', () => {
    it('should export JwtAuthGuard class', () => {
      expect(JwtAuthGuard).toBeDefined();
    });

    it('should export JWT_SERVICE injection token', () => {
      expect(JWT_SERVICE).toBeDefined();
    });

    it('should be defined when instantiated', () => {
      expect(guard).toBeDefined();
    });

    it('should implement CanActivate interface', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });

  describe('canActivate - valid token', () => {
    it('should allow access with valid JWT token', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${validToken}`);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should verify token using JWT service', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${validToken}`);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should attach decoded user to request object', async () => {
      // Arrange
      const { context, request } = createMockExecutionContext(
        `Bearer ${validToken}`,
      );
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(request.user).toBeDefined();
      expect(request.user).toEqual(
        expect.objectContaining({
          sub: mockJwtPayload.sub,
          email: mockJwtPayload.email,
          role: mockJwtPayload.role,
        }),
      );
    });

    it('should handle token without Bearer prefix', async () => {
      // Arrange
      const { context } = createMockExecutionContext(validToken);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should handle Bearer prefix case-insensitively', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`bearer ${validToken}`);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should handle BEARER prefix (uppercase)', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`BEARER ${validToken}`);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });
  });

  describe('canActivate - missing authorization', () => {
    it('should deny access when no Authorization header', async () => {
      // Arrange
      const { context } = createMockExecutionContext(undefined);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should deny access when Authorization header is empty string', async () => {
      // Arrange
      const { context } = createMockExecutionContext('');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should deny access when Authorization header is only "Bearer "', async () => {
      // Arrange
      const { context } = createMockExecutionContext('Bearer ');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should deny access when Authorization header is only "Bearer"', async () => {
      // Arrange
      const { context } = createMockExecutionContext('Bearer');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('canActivate - invalid token', () => {
    it('should deny access when token is invalid', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${invalidToken}`);
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should deny access when token signature is invalid', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${invalidToken}`);
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should deny access when token is malformed', async () => {
      // Arrange
      const { context } = createMockExecutionContext('Bearer malformed-token');
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('canActivate - expired token', () => {
    it('should deny access when token is expired', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${expiredToken}`);
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with descriptive message for expired token', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${expiredToken}`);
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      jwtService.verifyAsync.mockRejectedValue(expiredError);

      // Act & Assert
      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe('canActivate - error handling', () => {
    it('should throw UnauthorizedException for any JWT verification error', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${invalidToken}`);
      jwtService.verifyAsync.mockRejectedValue(new Error('Unknown JWT error'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should not expose internal error details in UnauthorizedException', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${invalidToken}`);
      jwtService.verifyAsync.mockRejectedValue(
        new Error('Internal secret key exposure risk'),
      );

      // Act & Assert
      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        // Message should be generic, not exposing internal details
        expect((error as UnauthorizedException).message).not.toContain(
          'secret',
        );
        expect((error as UnauthorizedException).message).not.toContain(
          'Internal',
        );
      }
    });

    it('should not leak token in error response', async () => {
      // Arrange
      const sensitiveToken = 'sensitive.token.data';
      const { context } = createMockExecutionContext(
        `Bearer ${sensitiveToken}`,
      );
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).not.toContain(
          sensitiveToken,
        );
      }
    });
  });

  describe('canActivate - user payload structure', () => {
    it('should preserve all payload fields on request.user', async () => {
      // Arrange
      const fullPayload: JwtPayload = {
        sub: 'user-uuid-1',
        email: 'test@example.com',
        role: UserRole.CLINICIAN,
        iat: 1704067200,
        exp: 1704153600,
      };
      const { context, request } = createMockExecutionContext(
        `Bearer ${validToken}`,
      );
      jwtService.verifyAsync.mockResolvedValue(fullPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(request.user).toEqual(fullPayload);
    });

    it('should handle PATIENT role in payload', async () => {
      // Arrange
      const patientPayload: JwtPayload = {
        ...mockJwtPayload,
        role: UserRole.PATIENT,
      };
      const { context, request } = createMockExecutionContext(
        `Bearer ${validToken}`,
      );
      jwtService.verifyAsync.mockResolvedValue(patientPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(request.user?.role).toBe(UserRole.PATIENT);
    });

    it('should handle CLINICIAN role in payload', async () => {
      // Arrange
      const clinicianPayload: JwtPayload = {
        ...mockJwtPayload,
        role: UserRole.CLINICIAN,
      };
      const { context, request } = createMockExecutionContext(
        `Bearer ${validToken}`,
      );
      jwtService.verifyAsync.mockResolvedValue(clinicianPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(request.user?.role).toBe(UserRole.CLINICIAN);
    });
  });

  describe('Bearer prefix handling', () => {
    it('should correctly strip "Bearer " prefix with space', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer ${validToken}`);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      // Should call verify with just the token, not the prefix
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
      expect(jwtService.verifyAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('Bearer'),
      );
    });

    it('should handle extra whitespace after Bearer', async () => {
      // Arrange
      const { context } = createMockExecutionContext(`Bearer  ${validToken}`);
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should handle different authentication schemes gracefully', async () => {
      // Arrange - Basic auth should not work
      const { context } = createMockExecutionContext(
        'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
      );

      // Act & Assert
      // If the guard only accepts Bearer tokens, it should reject Basic auth
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
