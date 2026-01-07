import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * PrismaHealthIndicator checks database connectivity for health checks.
 * Extends HealthIndicator from @nestjs/terminus to integrate with the health check system.
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Checks if the database is healthy by executing a simple query.
   * @param key - The key to use in the health check result (e.g., 'database')
   * @returns A promise that resolves to the health indicator result
   * @throws HealthCheckError if the database query fails
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Execute a simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return this.getStatus(key, true);
    } catch (error) {
      // Create a down status and throw HealthCheckError
      const result = this.getStatus(key, false, {
        message:
          error instanceof Error ? error.message : 'Database check failed',
      });

      throw new HealthCheckError('Database health check failed', result);
    }
  }
}
