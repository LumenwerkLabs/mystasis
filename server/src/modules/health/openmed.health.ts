import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { OpenMedService } from '../openmed/openmed.service';

/**
 * OpenMedHealthIndicator checks OpenMed microservice connectivity for health checks.
 * Extends HealthIndicator from @nestjs/terminus to integrate with the health check system.
 */
@Injectable()
export class OpenMedHealthIndicator extends HealthIndicator {
  constructor(private readonly openMedService: OpenMedService) {
    super();
  }

  /**
   * Checks if the OpenMed service is healthy and reachable.
   * @param key - The key to use in the health check result (e.g., 'openmed')
   * @returns A promise that resolves to the health indicator result
   * @throws HealthCheckError if the OpenMed service is not reachable
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isAvailable = await this.openMedService.isAvailable();

    if (isAvailable) {
      return this.getStatus(key, true);
    }

    const result = this.getStatus(key, false, {
      message: 'OpenMed service is not available',
    });

    throw new HealthCheckError('OpenMed health check failed', result);
  }
}
