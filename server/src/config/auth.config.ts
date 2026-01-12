import { registerAs } from '@nestjs/config';

/**
 * Authentication configuration interface.
 */
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
}

/**
 * Validates JWT_SECRET environment variable.
 *
 * @param secret - The JWT_SECRET value to validate
 * @throws Error if secret is missing, empty, whitespace-only, or less than 32 characters
 */
function validateJwtSecret(secret: string | undefined): string {
  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET environment variable is required but not set or empty',
    );
  }

  // Check for whitespace-only secret
  if (secret.trim().length !== secret.length || secret.trim().length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for adequate security',
    );
  }

  return secret;
}

/**
 * Authentication configuration factory function.
 * Validates and returns authentication configuration from environment variables.
 *
 * @returns AuthConfig object with validated JWT settings
 * @throws Error if JWT_SECRET is missing, empty, or too short (< 32 characters)
 */
function createAuthConfig(): AuthConfig {
  const jwtSecret = validateJwtSecret(process.env.JWT_SECRET);
  const jwtExpiration = process.env.JWT_EXPIRATION || '24h';

  return {
    jwtSecret,
    jwtExpiration,
  };
}

/**
 * Authentication configuration registered with NestJS ConfigModule.
 * Use this with ConfigModule.forRoot({ load: [authConfig] })
 *
 * @description Provides JWT settings for authentication:
 * - jwtSecret: Secret key for signing JWTs (required, min 32 chars)
 * - jwtExpiration: Token expiration time (optional, default '24h')
 *
 * @example
 * // Access via ConfigService
 * const secret = configService.get<string>('auth.jwtSecret');
 * const expiration = configService.get<string>('auth.jwtExpiration');
 */
export const authConfig = registerAs('auth', createAuthConfig);
