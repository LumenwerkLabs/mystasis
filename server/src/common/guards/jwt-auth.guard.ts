import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * JWT_SERVICE injection token for dependency injection.
 *
 * @description This allows flexible injection of any JWT service that implements
 * the `verifyAsync` interface, avoiding hard dependency on `@nestjs/jwt`.
 * Use this token when providing a custom JWT service implementation.
 *
 * @example
 * // In a module providers array
 * {
 *   provide: JWT_SERVICE,
 *   useFactory: (jwtService: JwtService) => jwtService,
 *   inject: [JwtService],
 * }
 */
export const JWT_SERVICE = Symbol('JWT_SERVICE');

/**
 * Request interface with optional user and headers.
 * Represents the HTTP request after potential JWT authentication.
 */
interface RequestWithUser {
  user?: unknown;
  headers?: {
    authorization?: string;
  };
}

/**
 * JWT authentication guard for protecting routes.
 *
 * @description Implements NestJS CanActivate interface to protect routes with
 * JWT Bearer token authentication. Extracts the token from the Authorization
 * header, verifies it using the injected JWT service, and attaches the decoded
 * payload to the request object.
 *
 * @remarks
 * This guard should be applied to routes that require authentication.
 * It works in conjunction with `RolesGuard` for role-based access control.
 *
 * **Behavior:**
 * 1. Extracts JWT from Authorization header
 * 2. Strips "Bearer " prefix (case-insensitive)
 * 3. Verifies token using injected JWT service
 * 4. Attaches decoded payload to `request.user`
 * 5. Throws `UnauthorizedException` for authentication failures
 *
 * @throws {UnauthorizedException} When authorization header is missing
 * @throws {UnauthorizedException} When authorization header format is invalid
 * @throws {UnauthorizedException} When token is invalid or expired
 *
 * @example
 * // Apply to a single route
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user;
 * }
 *
 * @example
 * // Apply to an entire controller
 * @UseGuards(JwtAuthGuard)
 * @Controller('protected')
 * export class ProtectedController { }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_SERVICE)
    private readonly jwtService: {
      verifyAsync: (token: string) => Promise<unknown>;
    },
  ) {}

  /**
   * Determines if the current request is authorized to proceed.
   *
   * @description Validates the JWT token from the Authorization header and
   * attaches the decoded payload to `request.user` for downstream handlers.
   *
   * @param context - The execution context containing the request
   * @returns Promise resolving to `true` if authentication succeeds
   *
   * @throws {UnauthorizedException} When authorization header is missing or empty
   * @throws {UnauthorizedException} When authorization header format is invalid
   * @throws {UnauthorizedException} When JWT verification fails
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorizationHeader = request.headers?.authorization;

    // Check if Authorization header exists and is not empty
    if (!authorizationHeader || authorizationHeader.trim() === '') {
      throw new UnauthorizedException('Missing authorization header');
    }

    // Extract token from header
    const token = this.extractToken(authorizationHeader);

    if (!token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    try {
      // Verify the token and attach payload to request.user
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      // Don't expose internal error details
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extracts the JWT token from the Authorization header.
   *
   * @description Handles Bearer prefix case-insensitively and trims whitespace.
   * Only accepts Bearer authentication scheme; rejects Basic auth and other schemes.
   *
   * @param authorizationHeader - The raw Authorization header value
   * @returns The extracted token string, or `null` if extraction fails
   *
   * @example
   * // Valid inputs
   * extractToken("Bearer eyJhbG...") // Returns "eyJhbG..."
   * extractToken("bearer eyJhbG...") // Returns "eyJhbG..." (case-insensitive)
   * extractToken("eyJhbG...")        // Returns "eyJhbG..." (no prefix)
   *
   * // Invalid inputs
   * extractToken("Basic dXNlcjpwYXNz") // Returns null (wrong scheme)
   * extractToken("Bearer ")            // Returns null (empty token)
   */
  private extractToken(authorizationHeader: string): string | null {
    const trimmed = authorizationHeader.trim();

    // Check if it starts with a non-Bearer scheme (like Basic)
    if (trimmed.toLowerCase().startsWith('basic ')) {
      return null;
    }

    // Handle Bearer prefix (case-insensitive)
    if (trimmed.toLowerCase().startsWith('bearer')) {
      // Extract everything after "bearer" and trim whitespace
      const afterBearer = trimmed.slice(6).trim();

      // If nothing after "bearer" or "bearer ", return null
      if (!afterBearer) {
        return null;
      }

      return afterBearer;
    }

    // If no Bearer prefix, assume the entire header is the token
    return trimmed || null;
  }
}
