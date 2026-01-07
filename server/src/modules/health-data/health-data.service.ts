import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { BiomarkerType, Prisma } from '@prisma/client';
import { InputJsonValue } from '@prisma/client/runtime/library';

/**
 * Service for managing biomarker health data in the Mystasis platform.
 *
 * @description
 * Handles all biomarker data operations including:
 * - CRUD operations for biomarker values
 * - Batch creation for wearable device sync
 * - Filtering by type, date range, and user
 * - Trend analysis with date range queries
 *
 * PHI (Protected Health Information) considerations:
 * - All biomarker data is considered PHI under HIPAA
 * - Access should be restricted to the owning user and authorized clinicians
 * - Data should be encrypted at rest and in transit
 *
 * Supported biomarker types include cardiovascular (HR, HRV, BP),
 * metabolic (glucose, cholesterol), fitness (steps, sleep), and many more.
 * See BiomarkerType enum in Prisma schema for complete list.
 *
 * @example
 * // Create a single biomarker value
 * const hrv = await healthDataService.create({
 *   userId: 'user-123',
 *   type: BiomarkerType.HEART_RATE_VARIABILITY,
 *   value: 65,
 *   unit: 'ms',
 *   timestamp: new Date(),
 *   source: 'apple_health',
 * });
 */
@Injectable()
export class HealthDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a single biomarker value for a user.
   *
   * @description
   * Records a single biomarker measurement. The user must exist in the
   * database or a NotFoundException will be thrown.
   *
   * @param data - Biomarker value data
   * @param data.userId - UUID of the user this biomarker belongs to
   * @param data.type - Type of biomarker (e.g., HEART_RATE, GLUCOSE)
   * @param data.value - Numeric value of the measurement
   * @param data.unit - Unit of measurement (e.g., 'ms', 'mg/dL', 'bpm')
   * @param data.timestamp - When the measurement was taken
   * @param data.source - Optional source identifier (e.g., 'apple_health', 'lab_upload')
   * @param data.metadata - Optional JSON metadata for additional context
   *
   * @returns The created biomarker value record
   *
   * @throws {NotFoundException} When the specified user does not exist
   *
   * @example
   * const glucose = await healthDataService.create({
   *   userId: 'user-123',
   *   type: BiomarkerType.GLUCOSE,
   *   value: 95,
   *   unit: 'mg/dL',
   *   timestamp: new Date(),
   *   source: 'manual',
   *   metadata: { fasting: true },
   * });
   */
  async create(data: {
    userId: string;
    type: BiomarkerType;
    value: number;
    unit: string;
    timestamp: Date;
    source?: string;
    metadata?: InputJsonValue;
  }) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    return this.prisma.biomarkerValue.create({
      data: {
        userId: data.userId,
        type: data.type,
        value: data.value,
        unit: data.unit,
        timestamp: data.timestamp,
        source: data.source,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Batch creates multiple biomarker values in a single transaction.
   *
   * @description
   * Efficiently creates multiple biomarker records at once, ideal for
   * syncing data from wearable devices. Uses Prisma's createMany for
   * optimal database performance.
   *
   * Note: This method does NOT validate user existence for each record
   * to maintain performance. Ensure userId validity before calling.
   *
   * @param data - Array of biomarker values to create
   * @param data[].userId - UUID of the user
   * @param data[].type - Biomarker type
   * @param data[].value - Numeric measurement value
   * @param data[].unit - Unit of measurement
   * @param data[].timestamp - When measurement was taken
   * @param data[].source - Optional source identifier
   *
   * @returns Object containing count of created records
   *
   * @example
   * // Sync multiple heart rate readings from a wearable
   * const result = await healthDataService.createMany([
   *   { userId: 'user-123', type: BiomarkerType.HEART_RATE, value: 72, unit: 'bpm', timestamp: time1, source: 'apple_health' },
   *   { userId: 'user-123', type: BiomarkerType.HEART_RATE, value: 75, unit: 'bpm', timestamp: time2, source: 'apple_health' },
   * ]);
   * console.log(`Created ${result.count} records`);
   */
  async createMany(
    data: Array<{
      userId: string;
      type: BiomarkerType;
      value: number;
      unit: string;
      timestamp: Date;
      source?: string;
    }>,
  ) {
    return this.prisma.biomarkerValue.createMany({
      data: data.map((item) => ({
        userId: item.userId,
        type: item.type,
        value: item.value,
        unit: item.unit,
        timestamp: item.timestamp,
        source: item.source,
      })),
    });
  }

  /**
   * Retrieves biomarker values for a user with optional filters and pagination.
   *
   * @description
   * Fetches biomarker values with support for:
   * - Filtering by biomarker type
   * - Date range filtering (inclusive)
   * - Pagination with configurable page size
   *
   * Results are ordered by timestamp descending (most recent first).
   *
   * @param userId - UUID of the user whose biomarkers to retrieve
   * @param options - Optional query parameters
   * @param options.type - Filter by specific biomarker type
   * @param options.startDate - Filter to values on or after this date
   * @param options.endDate - Filter to values on or before this date
   * @param options.page - Page number (1-indexed, defaults to 1)
   * @param options.limit - Number of records per page (defaults to 10)
   *
   * @returns Paginated result with data array, total count, page, and limit
   *
   * @example
   * // Get first page of all biomarkers for a user
   * const result = await healthDataService.findAll('user-123');
   *
   * @example
   * // Get HRV values from the last 30 days, page 2
   * const result = await healthDataService.findAll('user-123', {
   *   type: BiomarkerType.HEART_RATE_VARIABILITY,
   *   startDate: thirtyDaysAgo,
   *   endDate: new Date(),
   *   page: 2,
   *   limit: 20,
   * });
   */
  async findAll(
    userId: string,
    options?: {
      type?: BiomarkerType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.BiomarkerValueWhereInput = { userId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.biomarkerValue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.biomarkerValue.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves the most recent biomarker value of a specific type for a user.
   *
   * @description
   * Useful for displaying current/latest readings on dashboards or
   * checking the most recent value before creating alerts.
   *
   * @param userId - UUID of the user
   * @param type - The biomarker type to retrieve
   *
   * @returns The most recent biomarker value, or null if none exist
   *
   * @example
   * // Get user's latest heart rate
   * const latestHR = await healthDataService.findLatest(
   *   'user-123',
   *   BiomarkerType.HEART_RATE,
   * );
   * if (latestHR) {
   *   console.log(`Latest HR: ${latestHR.value} ${latestHR.unit}`);
   * }
   */
  async findLatest(userId: string, type: BiomarkerType) {
    return this.prisma.biomarkerValue.findFirst({
      where: {
        userId,
        type,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Retrieves biomarker values within a date range for trend analysis.
   *
   * @description
   * Fetches all biomarker values of a specific type within the given date
   * range, ordered by timestamp ascending. This is designed for trend
   * visualization and analysis, allowing chronological plotting of values.
   *
   * @param userId - UUID of the user
   * @param type - The biomarker type to retrieve
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   *
   * @returns Array of biomarker values ordered by timestamp ascending
   *
   * @example
   * // Get HRV trend for the last 14 days
   * const twoWeeksAgo = new Date();
   * twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
   *
   * const hrvTrend = await healthDataService.getTrend(
   *   'user-123',
   *   BiomarkerType.HEART_RATE_VARIABILITY,
   *   twoWeeksAgo,
   *   new Date(),
   * );
   * // Use hrvTrend for charting or analysis
   */
  async getTrend(
    userId: string,
    type: BiomarkerType,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.biomarkerValue.findMany({
      where: {
        userId,
        type,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  /**
   * Permanently deletes a biomarker value by its ID.
   *
   * @description
   * Removes a single biomarker record from the database. This action is
   * irreversible. Consider implementing soft deletes if audit trails
   * are required.
   *
   * @param id - UUID of the biomarker value to delete
   *
   * @returns The deleted biomarker value record
   *
   * @throws {NotFoundException} When no biomarker value exists with the given ID
   *
   * @example
   * const deleted = await healthDataService.remove('biomarker-123');
   */
  async remove(id: string) {
    // Check if exists
    const biomarkerValue = await this.prisma.biomarkerValue.findUnique({
      where: { id },
    });

    if (!biomarkerValue) {
      throw new NotFoundException(`Biomarker value with ID ${id} not found`);
    }

    return this.prisma.biomarkerValue.delete({
      where: { id },
    });
  }
}
