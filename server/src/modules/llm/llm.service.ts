import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SummaryType,
  UserRole,
  BiomarkerValue,
} from '../../generated/prisma/client';
import { Observable, firstValueFrom } from 'rxjs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HealthDataService } from '../health-data/health-data.service';
import { OpenMedService } from '../openmed/openmed.service';

/**
 * HTTP Service injection token for dependency injection.
 *
 * @description Matches the `@nestjs/axios` HttpService pattern. Use this token
 * when providing a custom HTTP service implementation for testing or customization.
 */
export const HTTP_SERVICE_TOKEN = 'HttpService';

/**
 * LLM API response structure matching OpenAI-compatible endpoints.
 */
interface LlmApiResponse {
  data: {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };
}

/**
 * Response DTO for health summaries.
 *
 * @property id - Unique identifier for the summary
 * @property content - The generated summary text (sanitized for medical safety)
 * @property type - Type of summary (e.g., PATIENT_SUMMARY, CLINICIAN_REPORT)
 * @property generatedAt - ISO 8601 timestamp of generation
 * @property disclaimer - Medical disclaimer (always included)
 * @property structuredData - Optional extracted flags, recommendations, and questions
 */
export interface SummaryResponseDto {
  id: string;
  content: string;
  type: SummaryType;
  generatedAt: string;
  disclaimer: string;
  structuredData?: {
    flags?: string[];
    recommendations?: string[];
    questionsForDoctor?: string[];
  };
}

/**
 * Response DTO for wellness nudges.
 *
 * @property id - Unique identifier for the nudge
 * @property content - The generated nudge text (sanitized for medical safety)
 * @property type - Always WELLNESS_NUDGE
 * @property generatedAt - ISO 8601 timestamp of generation
 * @property disclaimer - Medical disclaimer (always included)
 */
export interface NudgeResponseDto {
  id: string;
  content: string;
  type: SummaryType;
  generatedAt: string;
  disclaimer: string;
}

/**
 * Parsed response structure from LLM API.
 */
interface LlmParsedResponse {
  summary?: string;
  nudge?: string;
  flags?: string[];
  recommendations?: string[];
  questionsForDoctor?: string[];
}

/**
 * HTTP service interface matching `@nestjs/axios` HttpService.
 */
interface HttpService {
  post: (
    url: string,
    data: unknown,
    config?: {
      headers?: Record<string, string>;
      timeout?: number;
    },
  ) => Observable<LlmApiResponse>;
}

/**
 * Options for creating response DTOs.
 */
interface ResponseOptions {
  content: string;
  type: SummaryType;
  idPrefix: string;
  structuredData?: SummaryResponseDto['structuredData'];
}

/**
 * Result of de-identification operation.
 *
 * @property text - The processed text (de-identified or original)
 * @property deidentified - Whether de-identification was successfully applied
 */
interface DeidentificationResult {
  text: string;
  deidentified: boolean;
}

/**
 * HIPAA audit log entry structure for de-identification operations.
 */
interface DeidentificationAuditLog {
  action: 'DEIDENTIFY_CLINICAL_NOTES';
  timestamp: string;
  userId?: string;
  requestId: string;
  success: boolean;
  entityTypesDetected?: string[];
  entitiesRedacted?: number;
  errorType?: string;
}

/**
 * LLM-powered health insights generation service.
 *
 * @description Generates personalized health summaries and wellness nudges using
 * health-tuned Large Language Models (LLMs). This service enforces strict medical
 * safety constraints to ensure outputs are informational, not prescriptive.
 *
 * @remarks
 * **Medical Safety Constraints (MUST be enforced):**
 * - All responses include a disclaimer about consulting healthcare providers
 * - No diagnosis language allowed (e.g., "you have diabetes")
 * - No medication advice allowed (e.g., "take 500mg of...")
 * - All medical decisions deferred to clinicians
 * - Content sanitization removes unsafe patterns before returning
 *
 * **Graceful Degradation:**
 * - Returns fallback content on LLM API failures
 * - Returns insufficient data message when biomarker data is missing
 * - All errors are logged for debugging and audit purposes
 *
 * **Dependencies:**
 * - Requires `llm.apiUrl`, `llm.apiKey`, and `llm.model` configuration
 * - Uses `HealthDataService` for retrieving biomarker trends
 * - Uses `PrismaService` for persisting generated summaries
 *
 * @example
 * // Generate a patient summary
 * const summary = await llmService.generateSummary(
 *   'user-123',
 *   SummaryType.PATIENT_SUMMARY,
 * );
 *
 * @example
 * // Generate a wellness nudge
 * const nudge = await llmService.generateNudge('user-123');
 */
@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);

  private readonly HEALTH_CHECK_TIMEOUT = 5000;

  private readonly DISCLAIMER =
    'Discuss these findings with your healthcare provider.';

  private readonly FALLBACK_CONTENT =
    'We were unable to generate a personalized summary at this time. Please check back later.';

  private readonly FALLBACK_NUDGE =
    'Remember to stay active and maintain healthy habits today!';

  private readonly INSUFFICIENT_DATA_MESSAGE =
    'There is currently insufficient data to generate a meaningful summary. Continue tracking your biomarkers for personalized insights.';

  constructor(
    @Inject(HTTP_SERVICE_TOKEN)
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly healthDataService: HealthDataService,
    private readonly prisma: PrismaService,
    private readonly openMedService: OpenMedService,
  ) {}

  // ============================================
  // LIFECYCLE & HEALTH
  // ============================================

  /**
   * Gets the enabled flag from config.
   */
  private get enabled(): boolean {
    return this.configService.get<boolean>('llm.enabled') ?? true;
  }

  /**
   * Gets the health check on init flag from config.
   */
  private get healthCheckOnInit(): boolean {
    return this.configService.get<boolean>('llm.healthCheckOnInit') ?? true;
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
        this.logger.log('LLM service is available and healthy');
      } else {
        this.logger.warn('LLM service is not available or not configured');
      }
    } catch (error) {
      const errorType =
        error instanceof Error ? error.constructor.name : 'Unknown';
      this.logger.warn(
        `Failed to check LLM service health on init: ${errorType}`,
      );
    }
  }

  /**
   * Checks if the LLM service is available and configured.
   *
   * @returns true if service is enabled, configured, and the API is reachable
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const apiUrl = this.configService.get<string>('llm.apiUrl');
    const apiKey = this.configService.get<string>('llm.apiKey');
    const model = this.configService.get<string>('llm.model');

    if (!apiUrl || !apiKey || !model) {
      return false;
    }

    try {
      // Send a minimal request to verify API connectivity
      await firstValueFrom(
        this.httpService.post(
          apiUrl,
          {
            model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.HEALTH_CHECK_TIMEOUT,
          },
        ),
      );
      return true;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { error?: { message?: string } } };
        message?: string;
        constructor?: { name?: string };
      };
      const status = axiosError.response?.status;
      const message =
        axiosError.response?.data?.error?.message || axiosError.message;
      this.logger.debug(
        `LLM health check failed: ${status ?? 'no response'} - ${message}`,
      );
      return false;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Validates that a user exists in the database.
   *
   * @description Checks if a user with the given ID exists. This is called
   * before generating summaries or nudges to ensure the target user is valid.
   *
   * @param userId - The unique identifier of the user to validate
   * @returns Promise that resolves if user exists
   *
   * @throws {NotFoundException} When no user with the given ID exists
   */
  private async validateUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * Calculates a date range from the current time going back a specified number of days.
   *
   * @param daysBack - Number of days to look back from today
   * @returns Object containing startDate and endDate
   *
   * @example
   * // Get last 30 days
   * const { startDate, endDate } = this.getDateRange(30);
   */
  private getDateRange(daysBack: number): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    return { startDate, endDate };
  }

  /**
   * Creates a standardized response DTO with common fields.
   *
   * @description Factory method for creating summary/nudge response objects
   * with consistent structure including generated ID, timestamp, and disclaimer.
   *
   * @param options - Configuration for the response
   * @param options.content - The main content text
   * @param options.type - The summary type enum value
   * @param options.idPrefix - Prefix for generating the temporary ID
   * @param options.structuredData - Optional structured data (flags, recommendations)
   * @returns A fully constructed SummaryResponseDto
   */
  private createResponseDto(options: ResponseOptions): SummaryResponseDto {
    return {
      id: `${options.idPrefix}-${Date.now()}`,
      content: options.content,
      type: options.type,
      generatedAt: new Date().toISOString(),
      disclaimer: this.DISCLAIMER,
      structuredData: options.structuredData,
    };
  }

  /**
   * Makes an LLM API call with the given prompts and returns a parsed response.
   *
   * @description Calls the configured LLM endpoint with system and user prompts,
   * then attempts to parse the response as JSON. Falls back to raw content
   * if JSON parsing fails.
   *
   * @param systemPrompt - The system prompt defining LLM behavior and constraints
   * @param userPrompt - The user prompt containing the data to analyze
   * @param fallbackField - Field name to use when response is not valid JSON
   * @returns Parsed LLM response with summary/nudge and optional structured data
   *
   * @throws {Error} When LLM configuration is incomplete (missing apiUrl, apiKey, or model)
   * @throws {Error} When LLM API call fails (network error, timeout, etc.)
   */
  private async callLlmEndpoint(
    systemPrompt: string,
    userPrompt: string,
    fallbackField: 'summary' | 'nudge',
  ): Promise<LlmParsedResponse> {
    if (!this.enabled) {
      throw new Error('LLM service is disabled');
    }

    const apiUrl = this.configService.get<string>('llm.apiUrl');
    const apiKey = this.configService.get<string>('llm.apiKey');
    const model = this.configService.get<string>('llm.model');
    const timeout = this.configService.get<number>('llm.timeout') || 30000;

    // Validate required configuration
    if (!apiUrl || !apiKey || !model) {
      this.logger.error('LLM configuration incomplete', {
        hasApiUrl: !!apiUrl,
        hasApiKey: !!apiKey,
        hasModel: !!model,
      });
      throw new Error(
        'LLM configuration is incomplete. Check llm.apiUrl, llm.apiKey, and llm.model.',
      );
    }

    const response = await firstValueFrom(
      this.httpService.post(
        apiUrl,
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout,
        },
      ),
    );

    const content = response.data.choices[0]?.message?.content;

    try {
      return JSON.parse(content) as LlmParsedResponse;
    } catch {
      return { [fallbackField]: content };
    }
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Generates an LLM-powered health summary for a user's biomarker data.
   *
   * @description Analyzes the user's biomarker trends over the last 30 days and
   * generates a personalized health summary. The summary type determines the
   * audience (patient vs clinician) and affects the language and detail level.
   *
   * **Process:**
   * 1. Validates user exists
   * 2. Retrieves all biomarker data for last 30 days
   * 3. If no data, returns insufficient data message without calling LLM
   * 4. Builds prompts based on summary type
   * 5. Calls LLM API and sanitizes response for medical safety
   * 6. Persists summary to database for audit trail
   * 7. Returns formatted response with disclaimer
   *
   * **Safety:** All content is sanitized to remove diagnosis language
   * and medication advice before being returned.
   *
   * @param userId - The unique identifier of the user to generate summary for
   * @param summaryType - Type of summary to generate:
   *   - `PATIENT_SUMMARY`: Clear, accessible language for patients
   *   - `CLINICIAN_REPORT`: Detailed analysis for medical professionals
   *   - `WELLNESS_NUDGE`: Brief motivational message
   * @returns Promise resolving to summary response with:
   *   - `id`: Unique identifier (from database or temporary)
   *   - `content`: Sanitized summary text
   *   - `type`: The requested summary type
   *   - `generatedAt`: ISO 8601 timestamp
   *   - `disclaimer`: Medical disclaimer (always included)
   *   - `structuredData`: Optional flags, recommendations, and questions
   *
   * @throws {NotFoundException} When user with given ID does not exist
   *
   * @example
   * // Generate a patient-friendly summary
   * const summary = await llmService.generateSummary(
   *   'user-123',
   *   SummaryType.PATIENT_SUMMARY,
   * );
   * console.log(summary.content);
   * // "Your heart rate variability has shown improvement over the past month..."
   *
   * @example
   * // Generate a detailed clinician report
   * const report = await llmService.generateSummary(
   *   'user-123',
   *   SummaryType.CLINICIAN_REPORT,
   * );
   * console.log(report.structuredData?.flags);
   * // ["Elevated HRV variability", "Inconsistent sleep patterns"]
   */
  async generateSummary(
    userId: string,
    summaryType: SummaryType,
  ): Promise<SummaryResponseDto> {
    // Validate user exists
    await this.validateUserExists(userId);

    // Get all biomarker data for trend analysis (last 30 days)
    const { startDate, endDate } = this.getDateRange(30);

    const { data: biomarkerData } = await this.healthDataService.findAll(
      userId,
      {
        startDate,
        endDate,
        page: 1,
        limit: 200, // Fetch enough to cover all types
      },
    );

    // If no data, return insufficient data message without calling LLM
    if (!biomarkerData || biomarkerData.length === 0) {
      return this.createResponseDto({
        content: this.INSUFFICIENT_DATA_MESSAGE,
        type: summaryType,
        idPrefix: 'temp',
      });
    }

    // Determine audience role based on summary type
    const audienceRole =
      summaryType === SummaryType.CLINICIAN_REPORT
        ? UserRole.CLINICIAN
        : UserRole.PATIENT;

    try {
      // Build prompts and call LLM API
      const systemPrompt = this.buildSystemPrompt(summaryType);
      const userPrompt = this.buildUserPrompt(biomarkerData);
      const llmResponse = await this.callLlmEndpoint(
        systemPrompt,
        userPrompt,
        'summary',
      );

      // Sanitize the response for medical safety
      const sanitizedContent = this.sanitizeContent(
        llmResponse.summary || this.FALLBACK_CONTENT,
      );

      // Build structured data if flags are present
      const structuredData = llmResponse.flags
        ? {
            flags: llmResponse.flags,
            recommendations: llmResponse.recommendations || [],
            questionsForDoctor: llmResponse.questionsForDoctor || [],
          }
        : undefined;

      // Save to database
      const savedSummary = await this.prisma.lLMSummary.create({
        data: {
          userId,
          type: summaryType,
          content: sanitizedContent,
          structuredData,
          audienceRole,
          modelVersion: this.configService.get<string>('llm.model'),
        },
      });

      return {
        id: savedSummary.id,
        content: sanitizedContent,
        type: summaryType,
        generatedAt: savedSummary.createdAt.toISOString(),
        disclaimer: this.DISCLAIMER,
        structuredData: savedSummary.structuredData as
          | SummaryResponseDto['structuredData']
          | undefined,
      };
    } catch (error) {
      // Log error for debugging and audit
      this.logger.error('LLM summary generation failed', {
        userId,
        summaryType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return fallback response on LLM error
      return this.createResponseDto({
        content: this.FALLBACK_CONTENT,
        type: summaryType,
        idPrefix: 'fallback',
      });
    }
  }

  /**
   * Generates a personalized wellness nudge for a patient.
   *
   * @description Creates a brief, encouraging wellness message based on the
   * user's recent biomarker trends (last 7 days). Nudges are designed to
   * motivate healthy behaviors without providing medical advice.
   *
   * **Process:**
   * 1. Validates user exists
   * 2. Retrieves all biomarker data for last 7 days
   * 3. If no data, returns generic wellness nudge
   * 4. Builds nudge-specific prompts
   * 5. Calls LLM API and sanitizes response
   * 6. Persists nudge to database with PATIENT audience role
   * 7. Returns formatted response with disclaimer
   *
   * **Safety:** All content is sanitized and a disclaimer is always included.
   * Nudges focus on general wellness (sleep, exercise, hydration) rather
   * than specific medical recommendations.
   *
   * @param userId - The unique identifier of the patient to generate nudge for
   * @returns Promise resolving to nudge response with:
   *   - `id`: Unique identifier (from database or temporary)
   *   - `content`: Sanitized nudge text
   *   - `type`: Always `WELLNESS_NUDGE`
   *   - `generatedAt`: ISO 8601 timestamp
   *   - `disclaimer`: Medical disclaimer (always included)
   *
   * @throws {NotFoundException} When user with given ID does not exist
   *
   * @example
   * // Generate a wellness nudge
   * const nudge = await llmService.generateNudge('user-123');
   * console.log(nudge.content);
   * // "Great progress on your activity this week! Consider adding a short
   * //  walk after meals to support your metabolic health."
   */
  async generateNudge(userId: string): Promise<NudgeResponseDto> {
    // Validate user exists
    await this.validateUserExists(userId);

    // Get recent biomarker data (last 7 days)
    const { startDate, endDate } = this.getDateRange(7);

    const { data: biomarkerData } = await this.healthDataService.findAll(
      userId,
      {
        startDate,
        endDate,
        page: 1,
        limit: 100,
      },
    );

    // If no data, return generic wellness nudge
    if (!biomarkerData || biomarkerData.length === 0) {
      return this.createResponseDto({
        content: this.FALLBACK_NUDGE,
        type: SummaryType.WELLNESS_NUDGE,
        idPrefix: 'nudge',
      });
    }

    try {
      // Build prompts and call LLM API for nudge
      const systemPrompt = this.buildNudgeSystemPrompt();
      const userPrompt = this.buildNudgeUserPrompt(biomarkerData);
      const llmResponse = await this.callLlmEndpoint(
        systemPrompt,
        userPrompt,
        'nudge',
      );

      // Sanitize the response
      const sanitizedContent = this.sanitizeContent(
        llmResponse.nudge || this.FALLBACK_NUDGE,
      );

      // Save to database with PATIENT audience
      const savedNudge = await this.prisma.lLMSummary.create({
        data: {
          userId,
          type: SummaryType.WELLNESS_NUDGE,
          content: sanitizedContent,
          audienceRole: UserRole.PATIENT,
          modelVersion: this.configService.get<string>('llm.model'),
        },
      });

      return {
        id: savedNudge.id,
        content: sanitizedContent,
        type: SummaryType.WELLNESS_NUDGE,
        generatedAt: savedNudge.createdAt.toISOString(),
        disclaimer: this.DISCLAIMER,
      };
    } catch (error) {
      // Log error for debugging and audit
      this.logger.error('LLM nudge generation failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return fallback nudge on error
      return this.createResponseDto({
        content: this.FALLBACK_NUDGE,
        type: SummaryType.WELLNESS_NUDGE,
        idPrefix: 'fallback-nudge',
      });
    }
  }

  // ============================================
  // PROMPT BUILDERS
  // ============================================

  /**
   * Builds the system prompt for the LLM based on summary type.
   *
   * @description Creates a system prompt that defines LLM behavior and enforces
   * medical safety constraints. The prompt explicitly prohibits diagnosis language
   * and medication advice while encouraging observational language.
   *
   * @param summaryType - The type of summary being generated
   * @returns System prompt string with safety constraints and audience-appropriate instructions
   */
  private buildSystemPrompt(summaryType: SummaryType): string {
    const basePrompt = `You are a health insights assistant. You MUST NOT:
- Provide diagnoses or diagnostic language
- Recommend medications or dosages
- Suggest treatment plans
- Use language like "you have", "diagnosed with", "take [medication]", "stop taking"

You SHOULD:
- Frame observations as trends worth discussing
- Suggest questions for healthcare providers
- Encourage consultation with medical professionals
- Use observational language like "shows", "may indicate", "consider discussing"

Respond in JSON format with: summary, flags (array), recommendations (array), questionsForDoctor (array)`;

    if (summaryType === SummaryType.CLINICIAN_REPORT) {
      return `${basePrompt}\n\nThis summary is for clinician review. Provide detailed analysis suitable for medical professionals.`;
    }

    return `${basePrompt}\n\nThis summary is for patient viewing. Use clear, accessible language.`;
  }

  /**
   * Builds the user prompt containing biomarker data for analysis.
   *
   * @description Formats the biomarker data for LLM analysis, limiting to the
   * most recent 10 data points to keep the prompt size manageable.
   *
   * @param biomarkerData - Array of biomarker values to include in the prompt
   * @returns Formatted user prompt string with JSON-encoded biomarker data
   */
  private buildUserPrompt(biomarkerData: BiomarkerValue[]): string {
    // Group by type and take the most recent readings per type for a comprehensive view
    const byType: Record<string, { value: number; unit: string; timestamp: Date }[]> = {};
    for (const entry of biomarkerData) {
      if (!byType[entry.type]) {
        byType[entry.type] = [];
      }
      byType[entry.type].push({
        value: entry.value,
        unit: entry.unit,
        timestamp: entry.timestamp,
      });
    }

    // Keep at most 5 recent readings per type
    const grouped: Record<string, { value: number; unit: string; timestamp: Date }[]> = {};
    for (const [type, readings] of Object.entries(byType)) {
      grouped[type] = readings
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    }

    return `Analyze the following biomarker trend data (grouped by type, most recent first) and provide insights:\n${JSON.stringify(grouped, null, 2)}`;
  }

  /**
   * Builds the system prompt for wellness nudge generation.
   *
   * @description Creates a system prompt optimized for generating brief,
   * motivational wellness messages. Enforces safety constraints against
   * medical diagnoses and medication recommendations.
   *
   * @returns System prompt string for wellness nudge generation
   */
  private buildNudgeSystemPrompt(): string {
    return 'You are a wellness assistant that provides encouraging, motivational nudges based on health trends. Do NOT provide medical diagnoses or medication recommendations. Frame all insights as observations and suggestions for discussion with healthcare providers.';
  }

  /**
   * Builds the user prompt for wellness nudge generation.
   *
   * @description Formats recent biomarker data (last 5 points) for generating
   * a brief wellness nudge.
   *
   * @param biomarkerData - Array of biomarker values to base the nudge on
   * @returns Formatted user prompt string requesting a wellness nudge
   */
  private buildNudgeUserPrompt(biomarkerData: BiomarkerValue[]): string {
    return `Based on recent biomarker trends: ${JSON.stringify(biomarkerData.slice(-5))}, generate a brief, encouraging wellness nudge.`;
  }

  // ============================================
  // PII DE-IDENTIFICATION
  // ============================================

  /**
   * Generates a unique request ID for audit logging.
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Logs a HIPAA-compliant audit entry for de-identification operations.
   *
   * @param auditEntry - The audit log entry to record
   */
  private logDeidentificationAudit(auditEntry: DeidentificationAuditLog): void {
    // Use structured logging for easy parsing by log aggregation tools
    this.logger.log(`HIPAA_AUDIT: ${JSON.stringify(auditEntry)}`);
  }

  /**
   * De-identifies clinical notes before LLM processing.
   *
   * @description Uses OpenMed to detect and redact personally identifiable
   * information (PII) from clinical notes before sending them to the LLM API.
   * This ensures HIPAA compliance by preventing PHI from being sent to external
   * AI services.
   *
   * **Supported PII Types:**
   * - Names (patient, doctor, family members)
   * - Dates (DOB, appointment dates)
   * - SSN, MRN, and other identifiers
   * - Phone numbers, email addresses
   * - Addresses and locations
   *
   * **HIPAA Audit Trail:**
   * All de-identification operations are logged with structured audit entries
   * including userId (if provided), requestId, entity types, and success status.
   *
   * @param clinicalNotes - Raw clinical notes potentially containing PII
   * @param userId - Optional user ID for audit trail (recommended for HIPAA compliance)
   * @returns Object containing the processed text and a flag indicating whether
   *          de-identification was successful. Callers should check the `deidentified`
   *          flag to decide whether to include the notes in LLM prompts.
   *
   * @example
   * const result = await this.deidentifyClinicalNotes(
   *   'Patient John Smith (DOB: 01/15/1980) reported chest pain.',
   *   'user-123'
   * );
   * // Returns: { text: "Patient [NAME] (DOB: [DATE]) reported chest pain.", deidentified: true }
   *
   * @example
   * // When de-identification fails
   * const result = await this.deidentifyClinicalNotes('Some clinical notes', 'user-123');
   * // Returns: { text: "", deidentified: false } (empty string to prevent PHI leakage)
   */
  async deidentifyClinicalNotes(
    clinicalNotes: string,
    userId?: string,
  ): Promise<DeidentificationResult> {
    const requestId = this.generateRequestId();

    try {
      const response = await this.openMedService.deidentify({
        text: clinicalNotes,
      });

      // Check if actual de-identification occurred (not passthrough)
      const wasDeidentified = response.method !== 'passthrough';

      // Extract entity types for audit log (NEVER log actual PII values)
      const entityTypes = [
        ...new Set(response.piiEntities.map((e) => e.entityType)),
      ];

      // Log HIPAA audit entry
      this.logDeidentificationAudit({
        action: 'DEIDENTIFY_CLINICAL_NOTES',
        timestamp: new Date().toISOString(),
        userId,
        requestId,
        success: wasDeidentified,
        entityTypesDetected: entityTypes,
        entitiesRedacted: response.numEntitiesRedacted,
      });

      if (!wasDeidentified) {
        this.logger.warn(
          'OpenMed service returned passthrough response - de-identification not applied',
          { requestId, userId },
        );
      }

      return {
        text: response.deidentifiedText,
        deidentified: wasDeidentified,
      };
    } catch (error) {
      const errorType =
        error instanceof Error ? error.constructor.name : 'Unknown';
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log HIPAA audit entry for failure
      this.logDeidentificationAudit({
        action: 'DEIDENTIFY_CLINICAL_NOTES',
        timestamp: new Date().toISOString(),
        userId,
        requestId,
        success: false,
        errorType,
      });

      this.logger.error('PII de-identification failed', {
        requestId,
        userId,
        errorType,
        errorMessage,
      });

      // Return empty string to prevent PHI leakage (NOT original text)
      return {
        text: '',
        deidentified: false,
      };
    }
  }

  /**
   * Builds a user prompt with de-identified clinical notes for LLM analysis.
   *
   * @description Combines biomarker data with de-identified clinical notes
   * to create a comprehensive prompt for LLM analysis. Clinical notes are
   * automatically de-identified using OpenMed before being included.
   *
   * **Safety:** If de-identification fails, clinical notes are NOT included
   * in the prompt to prevent PII leakage to external LLM services.
   *
   * @param biomarkerData - Array of biomarker values to include
   * @param clinicalNotes - Optional clinical notes (will be de-identified)
   * @param userId - Optional user ID for HIPAA audit trail
   * @returns Formatted user prompt string with de-identified clinical context
   *
   * @example
   * const prompt = await this.buildUserPromptWithClinicalNotes(
   *   biomarkers,
   *   'Patient John Smith reported fatigue and weight gain.',
   *   'user-123'
   * );
   * // Returns prompt with "[NAME]" instead of "John Smith"
   *
   * @example
   * // When de-identification fails, notes are omitted for safety
   * const prompt = await this.buildUserPromptWithClinicalNotes(
   *   biomarkers,
   *   'Patient notes here',
   *   'user-123'
   * );
   * // If de-identification fails, returns prompt WITHOUT clinical notes
   */
  async buildUserPromptWithClinicalNotes(
    biomarkerData: BiomarkerValue[],
    clinicalNotes?: string,
    userId?: string,
  ): Promise<string> {
    const recentData = biomarkerData.slice(-10);
    let prompt = `Analyze the following biomarker trend data and provide insights:\n${JSON.stringify(recentData, null, 2)}`;

    if (clinicalNotes) {
      // De-identify clinical notes before including in prompt
      const result = await this.deidentifyClinicalNotes(clinicalNotes, userId);

      if (result.deidentified && result.text) {
        // Only include notes if de-identification was successful and text is non-empty
        prompt += `\n\nClinical Context (de-identified):\n${result.text}`;
      } else {
        // Log warning and exclude notes to prevent PII leakage
        this.logger.warn(
          'Clinical notes excluded from LLM prompt due to de-identification failure',
          { userId },
        );
      }
    }

    return prompt;
  }

  // ============================================
  // CONTENT SANITIZATION
  // ============================================

  /**
   * Sanitizes LLM output to remove unsafe medical content.
   *
   * @description Applies regex-based pattern matching to remove potentially
   * harmful medical content from LLM responses. This is a critical safety
   * layer that ensures no diagnosis language or medication advice reaches users.
   *
   * **Removed Content Types:**
   * - Diagnosis language (e.g., "you have diabetes", "diagnosed with")
   * - Medication advice (e.g., "take 500mg", "start taking")
   * - Dosage information (e.g., "100mg", "50ml")
   * - Treatment prescriptions (e.g., "discontinue", "increase your dose")
   *
   * @param content - The raw LLM output to sanitize
   * @returns Sanitized content with unsafe patterns removed, or fallback
   *          content if sanitization results in empty/minimal text
   *
   * @example
   * // Unsafe content is removed
   * sanitizeContent("You have diabetes. Take metformin 500mg daily.")
   * // Returns: "" -> falls back to FALLBACK_CONTENT
   *
   * @example
   * // Safe content is preserved
   * sanitizeContent("Your HRV shows improvement. Consider discussing this trend with your doctor.")
   * // Returns: "Your HRV shows improvement. Consider discussing this trend with your doctor."
   */
  private sanitizeContent(content: string): string {
    let sanitized = content;

    // Remove diagnosis language (expanded patterns for safety)
    const diagnosisPatterns = [
      /you have diabetes/gi,
      /you have \w+ disease/gi,
      /you likely have/gi,
      /you may have \w+/gi,
      /your condition is/gi,
      /diagnosed with[^.]*\./gi,
      /diagnosis of[^.]*\./gi,
      /this indicates \w+ disease/gi,
      /suffering from/gi,
    ];

    // Remove medication advice (expanded patterns for safety)
    const medicationPatterns = [
      /take metformin/gi,
      /take \w+\s*\d*\s*mg/gi,
      /start taking/gi,
      /stop taking[^.]*\./gi,
      /discontinue[^.]*\./gi,
      /\d+\s*mg/gi, // Dosage patterns
      /\d+\s*ml/gi, // Volume dosage patterns
      /you need[^.]*\./gi,
      /you should take/gi,
      /insulin therapy/gi,
      /prescribe[^.]*\./gi,
      /increase your dose/gi,
      /reduce your dose/gi,
      /medication[^.]*should/gi,
    ];

    // Apply all sanitization patterns
    [...diagnosisPatterns, ...medicationPatterns].forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Clean up any double spaces or empty sentences
    sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

    // Ensure content is not empty after sanitization
    if (!sanitized || sanitized.length < 10) {
      return this.FALLBACK_CONTENT;
    }

    return sanitized;
  }
}
