import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { HTTP_SERVICE_TOKEN } from './anamnesis.constants';

/**
 * Service for managing structured clinical anamnesis records.
 *
 * @description
 * Handles CRUD operations for anamnesis records:
 * - Creation after clinician review of AI-structured output
 * - Retrieval with pagination and date filtering
 * - Partial updates (edit structured fields, mark as reviewed)
 * - Deletion by clinician
 *
 * PHI (Protected Health Information) considerations:
 * - All anamnesis data (transcript + structured fields) is PHI under HIPAA
 * - Access restricted to the treating clinician and the patient
 * - Raw transcript stored for audit trail and potential re-processing
 */
@Injectable()
export class AnamnesisService {
  private readonly logger = new Logger(AnamnesisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(HTTP_SERVICE_TOKEN) private readonly httpService: { post: (...args: any[]) => any },
  ) {}

  /**
   * Creates a new anamnesis record.
   *
   * @param data - Anamnesis creation data
   * @param data.patientId - UUID of the patient
   * @param data.clinicianId - UUID of the clinician (from JWT)
   * @param data.rawTranscript - Original voice transcript
   * @param data.chiefComplaint - AI-extracted chief complaint
   * @param data.historyOfPresentIllness - AI-extracted HPI
   * @param data.pastMedicalHistory - AI-extracted past medical history
   * @param data.currentMedications - AI-extracted medications
   * @param data.allergies - AI-extracted allergies
   * @param data.familyHistory - AI-extracted family history
   * @param data.reviewOfSystems - AI-extracted review of systems
   * @param data.socialHistory - AI-extracted social history
   * @param data.recordedAt - When the consultation was recorded
   * @param data.isReviewed - Whether clinician has confirmed the output
   *
   * @returns The created anamnesis record
   * @throws {NotFoundException} When the patient does not exist
   */
  /**
   * Logs PHI access events for HIPAA audit trail compliance.
   */
  private logPhiAccess(
    action: string,
    userId: string,
    recordId: string,
    patientId?: string,
  ) {
    this.logger.log(
      `PHI_AUDIT: action=${action} userId=${userId} recordId=${recordId}${patientId ? ` patientId=${patientId}` : ''}`,
    );
  }

  /**
   * Validates that the requesting clinician owns the anamnesis record.
   */
  private validateClinicianOwnership(
    anamnesis: { clinicianId: string },
    clinicianId: string,
  ) {
    if (anamnesis.clinicianId !== clinicianId) {
      throw new ForbiddenException(
        'You can only modify anamnesis records you created',
      );
    }
  }

  async create(data: {
    patientId: string;
    clinicianId: string;
    rawTranscript: string;
    chiefComplaint: string;
    historyOfPresentIllness: string;
    pastMedicalHistory: string[];
    currentMedications: string[];
    allergies: string[];
    familyHistory: string[];
    reviewOfSystems: string[];
    socialHistory: string[];
    recordedAt: Date;
    isReviewed?: boolean;
  }) {
    // Validate patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: data.patientId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${data.patientId} not found`,
      );
    }

    const result = await this.prisma.anamnesis.create({
      data: {
        patientId: data.patientId,
        clinicianId: data.clinicianId,
        rawTranscript: data.rawTranscript,
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness,
        pastMedicalHistory: data.pastMedicalHistory,
        currentMedications: data.currentMedications,
        allergies: data.allergies,
        familyHistory: data.familyHistory,
        reviewOfSystems: data.reviewOfSystems,
        socialHistory: data.socialHistory,
        recordedAt: data.recordedAt,
        isReviewed: data.isReviewed ?? false,
      },
    });

    this.logPhiAccess('CREATE', data.clinicianId, result.id, data.patientId);
    return result;
  }

  /**
   * Retrieves anamnesis records for a patient with optional filters and pagination.
   *
   * @param patientId - UUID of the patient
   * @param options - Optional query parameters
   * @param options.startDate - Filter to records on or after this date
   * @param options.endDate - Filter to records on or before this date
   * @param options.page - Page number (1-indexed, defaults to 1)
   * @param options.limit - Records per page (defaults to 10)
   *
   * @returns Paginated result with data array, total count, page, and limit
   */
  async findAllForPatient(
    patientId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AnamnesisWhereInput = {
      patientId,
      deletedAt: null,
    };

    if (options?.startDate || options?.endDate) {
      where.recordedAt = {};
      if (options.startDate) {
        where.recordedAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.recordedAt.lte = options.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.anamnesis.findMany({
        where,
        skip,
        take: limit,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.anamnesis.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves a single anamnesis by ID.
   *
   * @param id - UUID of the anamnesis
   * @returns The anamnesis record
   * @throws {NotFoundException} When no anamnesis exists with the given ID
   */
  async findOne(id: string) {
    const anamnesis = await this.prisma.anamnesis.findFirst({
      where: { id, deletedAt: null },
    });

    if (!anamnesis) {
      throw new NotFoundException(`Anamnesis with ID ${id} not found`);
    }

    return anamnesis;
  }

  /**
   * Updates an existing anamnesis record.
   *
   * @description Allows partial updates to structured fields and review status.
   * The patientId and rawTranscript are immutable (enforced by DTO, not here).
   *
   * @param id - UUID of the anamnesis to update
   * @param data - Partial update data
   * @returns The updated anamnesis record
   * @throws {NotFoundException} When no anamnesis exists with the given ID
   */
  async update(
    id: string,
    data: {
      chiefComplaint?: string;
      historyOfPresentIllness?: string;
      pastMedicalHistory?: string[];
      currentMedications?: string[];
      allergies?: string[];
      familyHistory?: string[];
      reviewOfSystems?: string[];
      socialHistory?: string[];
      isReviewed?: boolean;
    },
    clinicianId: string,
  ) {
    const existing = await this.prisma.anamnesis.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Anamnesis with ID ${id} not found`);
    }

    this.validateClinicianOwnership(existing, clinicianId);

    const result = await this.prisma.anamnesis.update({
      where: { id },
      data,
    });

    this.logPhiAccess('UPDATE', clinicianId, id, existing.patientId);
    return result;
  }

  /**
   * Soft-deletes an anamnesis record by setting deletedAt timestamp.
   * Records are retained for HIPAA audit compliance.
   *
   * @param id - UUID of the anamnesis to delete
   * @param clinicianId - UUID of the requesting clinician (must be the creator)
   * @returns Confirmation with the record ID
   * @throws {NotFoundException} When no anamnesis exists with the given ID
   * @throws {ForbiddenException} When the clinician is not the record owner
   */
  async remove(id: string, clinicianId: string) {
    const existing = await this.prisma.anamnesis.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Anamnesis with ID ${id} not found`);
    }

    this.validateClinicianOwnership(existing, clinicianId);

    await this.prisma.anamnesis.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logPhiAccess('DELETE', clinicianId, id, existing.patientId);
    return { id, deleted: true };
  }

  /**
   * Generates a single-use ElevenLabs temporary token for client-side
   * WebSocket Speech-to-Text connections.
   *
   * @description The token expires after 15 minutes and is consumed on first use.
   * The real ElevenLabs API key never leaves the server.
   *
   * @returns Object containing the temporary token
   * @throws {ServiceUnavailableException} When ELEVENLABS_API_KEY is not configured
   * @throws {InternalServerErrorException} When token generation fails
   */
  async generateTranscriptionToken(
    clinicianId: string,
  ): Promise<{ token: string }> {
    const apiKey = this.configService.get<string>('elevenlabs.apiKey');
    const apiUrl = this.configService.get<string>('elevenlabs.apiUrl');

    if (!apiKey?.trim()) {
      throw new ServiceUnavailableException(
        'Cloud transcription is not available.',
      );
    }

    this.logger.log(
      `Transcription token requested by clinician ${clinicianId}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/v1/single-use-token/realtime_scribe`,
          null,
          {
            headers: { 'xi-api-key': apiKey.trim() },
            timeout: 10_000,
          },
        ),
      );

      const token = (response as any)?.data?.token;
      if (!token || typeof token !== 'string') {
        this.logger.error(
          'ElevenLabs returned an unexpected response structure',
        );
        throw new InternalServerErrorException(
          'Failed to generate transcription token.',
        );
      }

      this.logger.log(
        `Transcription token issued for clinician ${clinicianId}`,
      );
      return { token };
    } catch (error) {
      // Re-throw NestJS exceptions as-is
      if (
        error instanceof InternalServerErrorException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      // Log the real error server-side, return a safe message to the client
      this.logger.error(
        `Failed to generate ElevenLabs token: ${error?.message ?? error}`,
      );
      throw new InternalServerErrorException(
        'Failed to generate transcription token.',
      );
    }
  }
}
