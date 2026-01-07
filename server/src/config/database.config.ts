import { registerAs } from '@nestjs/config';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
}

/**
 * Validates if a given URL is a valid PostgreSQL connection string
 * @param url - The URL to validate
 * @returns true if the URL is a valid PostgreSQL URL, false otherwise
 */
export function isValidDatabaseUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check if URL starts with postgresql:// or postgres://
  const postgresPattern = /^postgres(ql)?:\/\/.+/;
  return postgresPattern.test(url);
}

/**
 * Database configuration factory function
 * Validates and returns database configuration from environment variables
 * @returns DatabaseConfig object
 * @throws Error if DATABASE_URL is missing or invalid
 */
function createDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL;

  // Validate DATABASE_URL is present and not empty
  if (!url || url.trim() === '') {
    throw new Error(
      'DATABASE_URL environment variable is required but not set or empty',
    );
  }

  // Validate DATABASE_URL format
  if (!isValidDatabaseUrl(url)) {
    throw new Error(
      'DATABASE_URL must be a valid PostgreSQL connection string (postgresql:// or postgres://)',
    );
  }

  // Parse optional pool settings with defaults
  const poolMin = process.env.DATABASE_POOL_MIN
    ? parseInt(process.env.DATABASE_POOL_MIN, 10)
    : 1;

  const poolMax = process.env.DATABASE_POOL_MAX
    ? parseInt(process.env.DATABASE_POOL_MAX, 10)
    : 10;

  return {
    url,
    poolMin,
    poolMax,
  };
}

/**
 * Database configuration registered with NestJS ConfigModule
 * Use this with ConfigModule.forRoot({ load: [databaseConfig] })
 */
export const databaseConfig = registerAs('database', createDatabaseConfig);
