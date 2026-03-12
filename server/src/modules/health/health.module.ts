import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { LlmHealthIndicator } from './llm.health';
import { OpenMedHealthIndicator } from './openmed.health';
import { LlmModule } from '../llm/llm.module';
import { OpenMedModule } from '../openmed/openmed.module';

/**
 * HealthModule provides health check functionality for the application.
 * Includes database, LLM, and OpenMed connectivity checks.
 */
@Module({
  imports: [TerminusModule, LlmModule, OpenMedModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    LlmHealthIndicator,
    OpenMedHealthIndicator,
  ],
  exports: [PrismaHealthIndicator, LlmHealthIndicator, OpenMedHealthIndicator],
})
export class HealthModule {}
