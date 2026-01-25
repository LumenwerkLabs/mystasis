import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenMedService } from './openmed.service';

/**
 * OpenMed PII de-identification module.
 *
 * @description Provides PII de-identification capabilities for clinical text.
 * Integrates with the OpenMed microservice to detect and redact protected
 * health information (PHI) from clinical notes and other medical text.
 *
 * Features:
 * - Multiple de-identification methods (mask, remove, replace, hash, shift_dates)
 * - Configurable confidence thresholds
 * - Graceful degradation when service is unavailable
 * - HIPAA-compliant audit logging
 *
 * Dependencies:
 * - ConfigModule (global): For OpenMed service configuration
 * - HttpModule: For making HTTP requests to OpenMed service
 *
 * Configuration (environment variables):
 * - OPENMED_SERVICE_URL: URL of the OpenMed microservice (default: http://localhost:8001)
 * - OPENMED_TIMEOUT: Request timeout in milliseconds (default: 30000)
 * - OPENMED_ENABLED: Enable/disable the service (default: true)
 * - OPENMED_CONFIDENCE_THRESHOLD: Minimum confidence for PII detection (default: 0.7)
 * - OPENMED_HEALTH_CHECK_ON_INIT: Check service health on module init (default: true)
 *
 * @example
 * // Import in another module
 * @Module({
 *   imports: [OpenMedModule],
 *   // ...
 * })
 * export class YourModule {}
 *
 * // Use in a service
 * @Injectable()
 * export class YourService {
 *   constructor(private readonly openMedService: OpenMedService) {}
 *
 *   async processText(text: string) {
 *     const deidentified = await this.openMedService.deidentifyText(text);
 *     return deidentified;
 *   }
 * }
 */
@Module({
  imports: [HttpModule],
  providers: [OpenMedService],
  exports: [OpenMedService],
})
export class OpenMedModule {}
