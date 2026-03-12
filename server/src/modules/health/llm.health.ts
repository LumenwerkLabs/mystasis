import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { LlmService } from '../llm/llm.service';

/**
 * LlmHealthIndicator checks LLM API connectivity for health checks.
 * Extends HealthIndicator from @nestjs/terminus to integrate with the health check system.
 */
@Injectable()
export class LlmHealthIndicator extends HealthIndicator {
  constructor(private readonly llmService: LlmService) {
    super();
  }

  /**
   * Checks if the LLM API is healthy and reachable.
   * @param key - The key to use in the health check result (e.g., 'llm')
   * @returns A promise that resolves to the health indicator result
   * @throws HealthCheckError if the LLM API is not reachable
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isAvailable = await this.llmService.isAvailable();

    if (isAvailable) {
      return this.getStatus(key, true);
    }

    const result = this.getStatus(key, false, {
      message: 'LLM API is not available or not configured',
    });

    throw new HealthCheckError('LLM health check failed', result);
  }
}
