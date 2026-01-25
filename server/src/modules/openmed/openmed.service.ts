import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  DeidentifyRequestDto,
  DeidentifyResponseDto,
  PIIEntityDto,
} from './dto/deidentify.dto';

/**
 * OpenMed API response format (snake_case from Python service).
 */
interface OpenMedApiResponse {
  original_text: string;
  deidentified_text: string;
  pii_entities: Array<{
    text: string;
    label: string;
    entity_type: string;
    start: number;
    end: number;
    confidence: number;
    redacted_text?: string;
  }>;
  method: string;
  timestamp: string;
  num_entities_redacted: number;
}

/**
 * OpenMed health check response format.
 */
interface OpenMedHealthResponse {
  status: string;
  openmed_loaded: boolean;
  timestamp: string;
}

/**
 * OpenMed API request body format (snake_case for Python service).
 */
interface OpenMedApiRequest {
  text: string;
  method: string;
  confidence_threshold: number;
  use_smart_merging: boolean;
  keep_year?: boolean;
}

/**
 * OpenMed PII de-identification service.
 *
 * @description Provides PII de-identification capabilities by integrating with
 * the OpenMed microservice. Supports multiple de-identification methods including
 * mask, remove, replace, hash, and shift_dates.
 *
 * Safety features:
 * - Graceful degradation when service is unavailable (passthrough mode)
 * - HIPAA-compliant audit logging (logs entity types, never PII values)
 * - Configurable confidence thresholds
 *
 * @example
 * // De-identify clinical text
 * const result = await openMedService.deidentify({ text: 'Patient John Smith...' });
 *
 * // Simple interface
 * const deidentifiedText = await openMedService.deidentifyText('Patient John Smith...');
 */
@Injectable()
export class OpenMedService implements OnModuleInit {
  private readonly logger = new Logger(OpenMedService.name);

  /**
   * Timeout for health check requests (shorter than main requests).
   */
  private readonly HEALTH_CHECK_TIMEOUT = 5000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Gets the service URL from config or returns default.
   */
  private get serviceUrl(): string {
    return (
      this.configService.get<string>('openmed.serviceUrl') ||
      'http://localhost:8001'
    );
  }

  /**
   * Gets the timeout from config or returns default.
   */
  private get timeout(): number {
    return this.configService.get<number>('openmed.timeout') || 30000;
  }

  /**
   * Gets the enabled flag from config or returns default.
   */
  private get enabled(): boolean {
    return this.configService.get<boolean>('openmed.enabled') ?? true;
  }

  /**
   * Gets the confidence threshold from config or returns default.
   */
  private get confidenceThreshold(): number {
    return this.configService.get<number>('openmed.confidenceThreshold') || 0.7;
  }

  /**
   * Gets the health check on init flag from config or returns default.
   */
  private get healthCheckOnInit(): boolean {
    return this.configService.get<boolean>('openmed.healthCheckOnInit') ?? true;
  }

  /**
   * Gets the API key from config for authenticating with OpenMed service.
   */
  private get apiKey(): string | undefined {
    return this.configService.get<string>('openmed.apiKey');
  }

  /**
   * Gets the allow passthrough flag from config.
   * When false, failures will throw errors instead of returning original PHI.
   */
  private get allowPassthrough(): boolean {
    return this.configService.get<boolean>('openmed.allowPassthrough') ?? true;
  }

  /**
   * Lifecycle hook called after module initialization.
   * Performs optional health check if enabled.
   */
  async onModuleInit(): Promise<void> {
    if (!this.enabled || !this.healthCheckOnInit) {
      return;
    }

    try {
      const isHealthy = await this.isAvailable();
      if (isHealthy) {
        this.logger.log('OpenMed service is available and healthy');
      } else {
        this.logger.warn('OpenMed service is not available or unhealthy');
      }
    } catch (error) {
      const errorType =
        error instanceof Error ? error.constructor.name : 'Unknown';
      this.logger.warn(
        `Failed to check OpenMed service health on init: ${errorType}`,
      );
    }
  }

  /**
   * De-identifies clinical text using the OpenMed service.
   *
   * @param request - The de-identification request
   * @param options - Optional parameters for the request
   * @param options.includeOriginalText - Whether to include original text in response (default: false)
   * @returns DeidentifyResponseDto with de-identified text and PII entities
   *
   * @description When the service is disabled or unavailable:
   * - If allowPassthrough is true (development): returns passthrough response (logs warning)
   * - If allowPassthrough is false (production): throws ServiceUnavailableException
   *
   * @throws {ServiceUnavailableException} When service fails and passthrough is not allowed
   */
  async deidentify(
    request: DeidentifyRequestDto,
    options: { includeOriginalText?: boolean } = {},
  ): Promise<DeidentifyResponseDto> {
    const { includeOriginalText = false } = options;

    // Handle disabled service
    if (!this.enabled) {
      if (!this.allowPassthrough) {
        this.logger.error(
          'OpenMed service is disabled and passthrough is not allowed in production',
        );
        throw new ServiceUnavailableException(
          'PII de-identification service is unavailable',
        );
      }
      this.logger.warn(
        'SECURITY WARNING: OpenMed service disabled, returning passthrough response. PHI may not be protected.',
      );
      return this.createPassthroughResponse(includeOriginalText);
    }

    try {
      // Build request body with snake_case keys for Python API
      const apiRequest: OpenMedApiRequest = {
        text: request.text,
        method: request.method || 'mask',
        confidence_threshold:
          request.confidenceThreshold ?? this.confidenceThreshold,
        use_smart_merging: request.useSmartMerging ?? true,
      };

      // Build headers with API key if configured
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const response = await firstValueFrom(
        this.httpService.post<OpenMedApiResponse>(
          `${this.serviceUrl}/deidentify`,
          apiRequest,
          { timeout: this.timeout, headers },
        ),
      );

      const result = this.transformResponse(response.data, includeOriginalText);

      // HIPAA audit logging: log entity types but NEVER actual PII values
      this.logAuditInfo(result);

      return result;
    } catch (error) {
      // Log error type and message, but NOT request text which may contain PII
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorType =
        error instanceof Error ? error.constructor.name : 'Unknown';

      if (!this.allowPassthrough) {
        this.logger.error(
          `OpenMed service unavailable (${errorType}: ${errorMessage}). Passthrough not allowed - throwing error to prevent PHI leakage.`,
        );
        throw new ServiceUnavailableException(
          'PII de-identification service is unavailable',
        );
      }

      this.logger.warn(
        `SECURITY WARNING: OpenMed service unavailable (${errorType}: ${errorMessage}). Returning passthrough response - PHI may not be protected.`,
      );
      return this.createPassthroughResponse(includeOriginalText);
    }
  }

  /**
   * Convenience method that returns only the de-identified text string.
   *
   * @param text - The clinical text to de-identify
   * @param method - Optional de-identification method (defaults to 'mask')
   * @returns The de-identified text string
   */
  async deidentifyText(text: string, method?: string): Promise<string> {
    const result = await this.deidentify({
      text,
      method: method as DeidentifyRequestDto['method'],
    });
    return result.deidentifiedText;
  }

  /**
   * Checks if the OpenMed service is available and healthy.
   *
   * @returns true if service is enabled, reachable, and healthy; false otherwise
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<OpenMedHealthResponse>(
          `${this.serviceUrl}/health`,
          { timeout: this.HEALTH_CHECK_TIMEOUT },
        ),
      );

      return response.data.status === 'healthy';
    } catch (error) {
      // Log error type for debugging, but keep health check failures quiet
      const errorType =
        error instanceof Error ? error.constructor.name : 'Unknown';
      this.logger.debug(`Health check failed: ${errorType}`);
      return false;
    }
  }

  /**
   * Creates a passthrough response when service is disabled or unavailable.
   *
   * SECURITY NOTE: This method does NOT include the original text as deidentifiedText
   * to prevent misleading callers into thinking the text has been de-identified.
   * The deidentifiedText is set to an empty string to indicate no de-identification occurred.
   *
   * @param includeOriginalText - Whether to include original text (only for debugging)
   * @returns DeidentifyResponseDto with empty deidentifiedText
   */
  private createPassthroughResponse(
    includeOriginalText: boolean = false,
  ): DeidentifyResponseDto {
    return {
      // Only include original text when explicitly requested (for debugging only)
      originalText: includeOriginalText
        ? '[PASSTHROUGH - original text requested]'
        : '',
      // CRITICAL: Do NOT return original PHI as deidentifiedText
      // Return empty string to clearly indicate de-identification did not occur
      deidentifiedText: '',
      piiEntities: [],
      method: 'passthrough',
      timestamp: new Date().toISOString(),
      numEntitiesRedacted: 0,
    };
  }

  /**
   * Transforms OpenMed API response (snake_case) to DTO (camelCase).
   *
   * @param apiResponse - The API response in snake_case format
   * @param includeOriginalText - Whether to include original text and PII text values
   * @returns DeidentifyResponseDto in camelCase format
   */
  private transformResponse(
    apiResponse: OpenMedApiResponse,
    includeOriginalText: boolean = false,
  ): DeidentifyResponseDto {
    // Log warning if original text is requested (for audit trail)
    if (includeOriginalText) {
      this.logger.warn(
        'AUDIT: Original text requested in de-identification response. This should only be used for debugging.',
      );
    }

    const piiEntities: PIIEntityDto[] = apiResponse.pii_entities.map(
      (entity) => ({
        // Only include actual PII text when explicitly requested
        text: includeOriginalText ? entity.text : '[REDACTED]',
        label: entity.label,
        entityType: entity.entity_type,
        start: entity.start,
        end: entity.end,
        confidence: entity.confidence,
        redactedText: entity.redacted_text,
      }),
    );

    return {
      // Only include original text when explicitly requested
      originalText: includeOriginalText ? apiResponse.original_text : '',
      deidentifiedText: apiResponse.deidentified_text,
      piiEntities,
      method: apiResponse.method,
      timestamp: apiResponse.timestamp,
      numEntitiesRedacted: apiResponse.num_entities_redacted,
    };
  }

  /**
   * Logs audit information for HIPAA compliance.
   * Logs entity types and counts, but NEVER actual PII values.
   *
   * @param result - The de-identification result
   */
  private logAuditInfo(result: DeidentifyResponseDto): void {
    // Extract unique entity types (e.g., NAME, DATE, SSN)
    const entityTypes = [
      ...new Set(result.piiEntities.map((e) => e.entityType)),
    ];

    // Log entity types for audit trail - NEVER log actual PII values
    this.logger.log(
      `De-identified ${result.numEntitiesRedacted} entities. Types: ${entityTypes.join(', ')}`,
    );
  }
}
