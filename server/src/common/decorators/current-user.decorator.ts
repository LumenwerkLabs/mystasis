import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Request interface with optional user.
 */
interface RequestWithUser {
  user?: unknown;
}

/**
 * Parameter decorator that extracts the current user from the request.
 *
 * @description This decorator extracts the `user` property from the HTTP request
 * object. The user is typically set by the JwtAuthGuard after validating the JWT token.
 *
 * @returns The user object attached to request.user, or undefined if not set
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
