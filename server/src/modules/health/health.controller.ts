import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

/**
 * HealthController provides health check endpoints for the application.
 * Supports Kubernetes-style probes: liveness and readiness.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  /**
   * Full health check including all dependencies.
   * GET /health
   * @returns Health check result with all indicators
   */
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }

  /**
   * Liveness probe - checks if the application is running.
   * GET /health/live
   * Does not check external dependencies.
   * @returns Simple ok status
   */
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness probe - checks if the application is ready to serve traffic.
   * GET /health/ready
   * Checks database connectivity.
   * @returns Health check result with database status
   */
  @Get('ready')
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
