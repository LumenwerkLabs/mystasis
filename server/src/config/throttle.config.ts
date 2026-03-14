import { registerAs } from '@nestjs/config';

/**
 * LLM rate limiting configuration interface.
 */
export interface ThrottleConfig {
  llmSummaryLimit: number;
  llmSummaryTtl: number;
  llmNudgeLimit: number;
  llmNudgeTtl: number;
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

function createThrottleConfig(): ThrottleConfig {
  return {
    llmSummaryLimit: parseNumber(process.env.THROTTLE_LLM_SUMMARY_LIMIT, 5),
    llmSummaryTtl: parseNumber(process.env.THROTTLE_LLM_SUMMARY_TTL, 3600),
    llmNudgeLimit: parseNumber(process.env.THROTTLE_LLM_NUDGE_LIMIT, 10),
    llmNudgeTtl: parseNumber(process.env.THROTTLE_LLM_NUDGE_TTL, 3600),
  };
}

/**
 * Throttle configuration registered with NestJS ConfigModule.
 *
 * @description Provides per-user rate limit settings for LLM endpoints:
 * - llmSummaryLimit: Max summary requests per window (env: THROTTLE_LLM_SUMMARY_LIMIT, default: 5)
 * - llmSummaryTtl: Summary window in seconds (env: THROTTLE_LLM_SUMMARY_TTL, default: 3600)
 * - llmNudgeLimit: Max nudge requests per window (env: THROTTLE_LLM_NUDGE_LIMIT, default: 10)
 * - llmNudgeTtl: Nudge window in seconds (env: THROTTLE_LLM_NUDGE_TTL, default: 3600)
 *
 * @example
 * const limit = configService.get<number>('throttle.llmSummaryLimit');
 */
export const throttleConfig = registerAs('throttle', createThrottleConfig);
