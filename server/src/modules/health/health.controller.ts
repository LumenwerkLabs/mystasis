import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
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
@ApiTags('Health')
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
  @ApiOperation({
    summary: 'Full health check',
    description:
      'Performs a comprehensive health check including all dependencies (database, external services). Returns detailed status of each component.',
  })
  @ApiOkResponse({
    description: 'Health check completed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - one or more dependencies unhealthy',
  })
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
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Simple liveness check to verify the application process is running. Does not check external dependencies. Use for Kubernetes liveness probes.',
  })
  @ApiOkResponse({
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks if the application is ready to receive traffic. Verifies database connectivity. Use for Kubernetes readiness probes.',
  })
  @ApiOkResponse({
    description: 'Application is ready to serve traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service not ready - database connection failed',
  })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
