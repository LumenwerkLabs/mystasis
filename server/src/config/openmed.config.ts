import { registerAs } from '@nestjs/config';

/**
 * OpenMed PII de-identification service configuration interface.
 */
export interface OpenMedConfig {
  serviceUrl: string;
  timeout: number;
  confidenceThreshold: number;
  enabled: boolean;
  healthCheckOnInit: boolean;
  /**
   * API key for authenticating with the OpenMed Python service.
   * Required in production for security.
   */
  apiKey?: string;
  /**
   * Whether to allow passthrough mode (returning original text when de-identification fails).
   * Default: true in development, false in production.
   * When false, failures will throw errors instead of returning PHI.
   */
  allowPassthrough: boolean;
}

/**
 * Parses a string to a boolean value.
 * Handles various truthy/falsy representations.
 *
 * @param value - The string value to parse
 * @param defaultValue - The default value if parsing fails
 * @returns boolean
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  const trimmed = value.trim().toLowerCase();

  if (trimmed === 'true' || trimmed === '1') {
    return true;
  }

  if (trimmed === 'false' || trimmed === '0') {
    return false;
  }

  return defaultValue;
}

/**
 * Parses a string to a number value.
 * Returns the default value if parsing fails.
 *
 * @param value - The string value to parse
 * @param defaultValue - The default value if parsing fails
 * @returns number
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Validates that the service URL uses HTTPS in production.
 * Allows localhost URLs for local Docker networks.
 *
 * @param url - The service URL to validate
 * @param isProduction - Whether running in production mode
 * @throws Error if URL is not HTTPS in production (except localhost)
 */
function validateServiceUrl(url: string, isProduction: boolean): void {
  if (!isProduction) {
    return;
  }

  const lowerUrl = url.toLowerCase();

  // Allow localhost URLs for local Docker networks in production
  if (
    lowerUrl.startsWith('http://localhost') ||
    lowerUrl.startsWith('http://127.0.0.1') ||
    lowerUrl.startsWith('http://openmed') // Docker service name
  ) {
    return;
  }

  // Require HTTPS for all other production URLs
  if (!lowerUrl.startsWith('https://')) {
    throw new Error(
      `OpenMed service URL must use HTTPS in production. Got: ${url}`,
    );
  }
}

/**
 * OpenMed configuration factory function.
 * Returns OpenMed service configuration from environment variables.
 *
 * @returns OpenMedConfig object with validated settings
 * @throws Error if HTTPS enforcement fails in production
 */
function createOpenMedConfig(): OpenMedConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  const serviceUrl =
    process.env.OPENMED_SERVICE_URL &&
    process.env.OPENMED_SERVICE_URL.trim() !== ''
      ? process.env.OPENMED_SERVICE_URL
      : 'http://localhost:8001';

  // Validate HTTPS in production (except localhost for Docker networks)
  validateServiceUrl(serviceUrl, isProduction);

  const timeout = parseNumber(process.env.OPENMED_TIMEOUT, 30000);
  const confidenceThreshold = parseNumber(
    process.env.OPENMED_CONFIDENCE_THRESHOLD,
    0.7,
  );
  const enabled = parseBoolean(process.env.OPENMED_ENABLED, true);
  const healthCheckOnInit = parseBoolean(
    process.env.OPENMED_HEALTH_CHECK_ON_INIT,
    true,
  );

  // API key for authenticating with OpenMed service
  const apiKey = process.env.OPENMED_API_KEY || undefined;

  // Allow passthrough defaults to true in development, false in production
  // This prevents PHI from being returned when de-identification fails
  const allowPassthrough = parseBoolean(
    process.env.OPENMED_ALLOW_PASSTHROUGH,
    !isProduction,
  );

  return {
    serviceUrl,
    timeout,
    confidenceThreshold,
    enabled,
    healthCheckOnInit,
    apiKey,
    allowPassthrough,
  };
}

/**
 * OpenMed configuration registered with NestJS ConfigModule.
 * Use this with ConfigModule.forRoot({ load: [openmedConfig] })
 *
 * @description Provides OpenMed PII de-identification service settings:
 * - serviceUrl: URL of the OpenMed microservice (default: 'http://localhost:8001')
 * - timeout: Request timeout in milliseconds (default: 30000)
 * - confidenceThreshold: Minimum confidence for PII detection (default: 0.7)
 * - enabled: Enable/disable the service (default: true)
 * - healthCheckOnInit: Check service health on module init (default: true)
 * - apiKey: API key for authenticating with OpenMed service (optional, recommended in production)
 * - allowPassthrough: Allow returning original text on failure (default: true in dev, false in prod)
 *
 * Security notes:
 * - In production, serviceUrl must use HTTPS (except localhost for Docker networks)
 * - In production, allowPassthrough defaults to false to prevent PHI leakage
 * - Set OPENMED_API_KEY in production to enable authentication with Python service
 *
 * @example
 * // Access via ConfigService
 * const url = configService.get<string>('openmed.serviceUrl');
 * const timeout = configService.get<number>('openmed.timeout');
 * const apiKey = configService.get<string>('openmed.apiKey');
 */
export const openmedConfig = registerAs('openmed', createOpenMedConfig);
