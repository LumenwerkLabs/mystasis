import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { LlmService, HTTP_SERVICE_TOKEN } from './llm.service';
import { LlmController } from './llm.controller';
import { HealthDataModule } from '../health-data/health-data.module';

/**
 * LLM module for health insights and wellness nudges.
 *
 * @description Provides LLM-powered functionality for generating health summaries
 * and wellness nudges. This module integrates with external LLM APIs and requires
 * proper configuration for API credentials.
 *
 * @remarks
 * Dependencies:
 * - ConfigModule (global): For LLM API configuration (apiUrl, apiKey, model)
 * - PrismaModule (global): For persisting generated summaries
 * - HealthDataModule: For accessing biomarker trend data
 * - HttpModule: For making HTTP requests to LLM API
 *
 * Configuration required in environment:
 * - llm.apiUrl: LLM API endpoint URL
 * - llm.apiKey: API authentication key
 * - llm.model: LLM model identifier (e.g., 'gpt-4')
 */
@Module({
  imports: [HttpModule, HealthDataModule],
  controllers: [LlmController],
  providers: [
    LlmService,
    {
      provide: HTTP_SERVICE_TOKEN,
      useExisting: HttpService,
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
