import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

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
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.anamnesis.create({
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

    const where: Prisma.AnamnesisWhereInput = { patientId };

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
    const anamnesis = await this.prisma.anamnesis.findUnique({
      where: { id },
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
  ) {
    // Check existence
    const existing = await this.prisma.anamnesis.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Anamnesis with ID ${id} not found`);
    }

    return this.prisma.anamnesis.update({
      where: { id },
      data,
    });
  }

  /**
   * Permanently deletes an anamnesis record.
   *
   * @param id - UUID of the anamnesis to delete
   * @returns The deleted anamnesis record
   * @throws {NotFoundException} When no anamnesis exists with the given ID
   */
  async remove(id: string) {
    const existing = await this.prisma.anamnesis.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Anamnesis with ID ${id} not found`);
    }

    return this.prisma.anamnesis.delete({
      where: { id },
    });
  }
}
