import { registerAs } from '@nestjs/config';

/**
 * LLM service configuration interface.
 */
export interface LlmConfig {
  apiUrl: string;
  apiKey?: string;
  model: string;
  timeout: number;
  enabled: boolean;
  healthCheckOnInit: boolean;
}

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
 * Validates that the API URL uses HTTPS in production.
 * Allows localhost URLs for local development.
 */
function validateApiUrl(url: string, isProduction: boolean): void {
  if (!isProduction) {
    return;
  }

  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.startsWith('http://localhost') ||
    lowerUrl.startsWith('http://127.0.0.1')
  ) {
    return;
  }

  if (!lowerUrl.startsWith('https://')) {
    throw new Error(`LLM API URL must use HTTPS in production. Got: ${url}`);
  }
}

function createLlmConfig(): LlmConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  const apiUrl =
    process.env.LLM_API_URL && process.env.LLM_API_URL.trim() !== ''
      ? process.env.LLM_API_URL
      : '';

  if (apiUrl) {
    validateApiUrl(apiUrl, isProduction);
  }

  const apiKey = process.env.LLM_API_KEY || undefined;
  const model = process.env.LLM_MODEL || 'gpt-4';
  const timeout = parseNumber(process.env.LLM_TIMEOUT, 30000);
  const enabled = parseBoolean(process.env.LLM_ENABLED, true);
  const healthCheckOnInit = parseBoolean(
    process.env.LLM_HEALTH_CHECK_ON_INIT,
    true,
  );

  return {
    apiUrl,
    apiKey,
    model,
    timeout,
    enabled,
    healthCheckOnInit,
  };
}

/**
 * LLM configuration registered with NestJS ConfigModule.
 *
 * @description Provides LLM service settings:
 * - apiUrl: LLM API endpoint URL (env: LLM_API_URL)
 * - apiKey: API authentication key (env: LLM_API_KEY)
 * - model: LLM model identifier (env: LLM_MODEL, default: 'gpt-4')
 * - timeout: Request timeout in milliseconds (env: LLM_TIMEOUT, default: 30000)
 * - enabled: Enable/disable the service (env: LLM_ENABLED, default: true)
 * - healthCheckOnInit: Check API health on startup (env: LLM_HEALTH_CHECK_ON_INIT, default: true)
 *
 * Security notes:
 * - In production, apiUrl must use HTTPS (except localhost)
 * - Set LLM_API_KEY for API authentication
 *
 * @example
 * const url = configService.get<string>('llm.apiUrl');
 * const model = configService.get<string>('llm.model');
 */
export const llmConfig = registerAs('llm', createLlmConfig);
