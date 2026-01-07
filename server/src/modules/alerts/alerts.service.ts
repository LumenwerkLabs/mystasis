import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  BiomarkerType,
  AlertSeverity,
  AlertStatus,
  Prisma,
  Alert,
} from '@prisma/client';

/**
 * Service for managing health alerts in the Mystasis platform.
 *
 * @description
 * Handles all alert-related operations including:
 * - CRUD operations for alerts
 * - Status management (acknowledge, dismiss, resolve)
 * - Filtering by status and severity
 * - Active alert retrieval for notifications
 *
 * Alert Status Flow:
 * ```
 * ACTIVE -> ACKNOWLEDGED -> RESOLVED
 *       \-> DISMISSED
 * ```
 *
 * Alerts are generated when biomarker values exceed defined thresholds.
 * Severity levels (LOW, MEDIUM, HIGH, CRITICAL) indicate urgency.
 *
 * @example
 * // Create a high-severity alert for elevated heart rate
 * const alert = await alertsService.create({
 *   userId: 'user-123',
 *   type: BiomarkerType.HEART_RATE,
 *   severity: AlertSeverity.HIGH,
 *   title: 'Elevated Heart Rate',
 *   message: 'Your resting heart rate has been above normal for 3 days.',
 *   value: 95,
 *   threshold: 80,
 * });
 */
@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new alert with ACTIVE status.
   *
   * @description
   * Creates a health alert for a user, typically triggered by biomarker
   * threshold violations. The alert is created with ACTIVE status and
   * should be addressed by the user or clinician.
   *
   * @param data - Alert creation data
   * @param data.userId - UUID of the user this alert is for
   * @param data.type - The biomarker type related to this alert
   * @param data.severity - Alert severity (LOW, MEDIUM, HIGH, CRITICAL)
   * @param data.title - Short title for the alert
   * @param data.message - Detailed message explaining the alert
   * @param data.value - Optional: the actual biomarker value that triggered the alert
   * @param data.threshold - Optional: the threshold that was exceeded
   *
   * @returns The created alert record
   *
   * @throws {NotFoundException} When the specified user does not exist
   *
   * @example
   * const alert = await alertsService.create({
   *   userId: 'user-123',
   *   type: BiomarkerType.BLOOD_PRESSURE_SYSTOLIC,
   *   severity: AlertSeverity.CRITICAL,
   *   title: 'Critical Blood Pressure',
   *   message: 'Systolic blood pressure reading of 180 mmHg requires immediate attention.',
   *   value: 180,
   *   threshold: 140,
   * });
   */
  async create(data: {
    userId: string;
    type: BiomarkerType;
    severity: AlertSeverity;
    title: string;
    message: string;
    value?: number;
    threshold?: number;
  }) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    return this.prisma.alert.create({
      data: {
        userId: data.userId,
        type: data.type,
        severity: data.severity,
        title: data.title,
        message: data.message,
        value: data.value,
        threshold: data.threshold,
        status: AlertStatus.ACTIVE,
      },
    });
  }

  /**
   * Retrieves alerts for a user with optional filtering and pagination.
   *
   * @description
   * Fetches alerts with support for filtering by status and severity.
   * Results are ordered by creation date descending (newest first).
   *
   * @param userId - UUID of the user whose alerts to retrieve
   * @param options - Optional query parameters
   * @param options.status - Filter by alert status (ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED)
   * @param options.severity - Filter by severity level
   * @param options.skip - Number of records to skip (for pagination)
   * @param options.take - Maximum number of records to return
   *
   * @returns Array of alerts matching the criteria
   *
   * @example
   * // Get all alerts for a user
   * const allAlerts = await alertsService.findAll('user-123');
   *
   * @example
   * // Get critical alerts that are still active
   * const criticalAlerts = await alertsService.findAll('user-123', {
   *   status: AlertStatus.ACTIVE,
   *   severity: AlertSeverity.CRITICAL,
   * });
   */
  async findAll(
    userId: string,
    options?: {
      status?: AlertStatus;
      severity?: AlertSeverity;
      skip?: number;
      take?: number;
    },
  ): Promise<Alert[]> {
    const where: Prisma.AlertWhereInput = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    return this.prisma.alert.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single alert by its ID.
   *
   * @param id - UUID of the alert to retrieve
   *
   * @returns The alert record
   *
   * @throws {NotFoundException} When no alert exists with the given ID
   *
   * @example
   * const alert = await alertsService.findOne('alert-123');
   */
  async findOne(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return alert;
  }

  /**
   * Updates an alert's status.
   *
   * @description
   * Changes the status of an alert. This is the base method for status
   * transitions; prefer using the convenience methods (acknowledge, dismiss,
   * resolve) for better semantics.
   *
   * @param id - UUID of the alert to update
   * @param status - The new status to set
   *
   * @returns The updated alert record
   *
   * @throws {NotFoundException} When no alert exists with the given ID
   *
   * @example
   * const updated = await alertsService.updateStatus('alert-123', AlertStatus.ACKNOWLEDGED);
   */
  async updateStatus(id: string, status: AlertStatus) {
    // Check if alert exists
    const existingAlert = await this.prisma.alert.findUnique({
      where: { id },
    });

    if (!existingAlert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return this.prisma.alert.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Dismisses an alert, indicating it was reviewed but no action is needed.
   *
   * @description
   * Use this when a user has seen the alert but determines it does not
   * require further action. Dismissed alerts are no longer shown in
   * active alert lists.
   *
   * @param id - UUID of the alert to dismiss
   *
   * @returns The updated alert with DISMISSED status
   *
   * @throws {NotFoundException} When no alert exists with the given ID
   *
   * @example
   * const dismissed = await alertsService.dismiss('alert-123');
   */
  async dismiss(id: string) {
    return this.updateStatus(id, AlertStatus.DISMISSED);
  }

  /**
   * Resolves an alert, indicating the underlying issue has been addressed.
   *
   * @description
   * Use this when the condition that triggered the alert has been resolved
   * (e.g., biomarker values have returned to normal range).
   *
   * @param id - UUID of the alert to resolve
   *
   * @returns The updated alert with RESOLVED status
   *
   * @throws {NotFoundException} When no alert exists with the given ID
   *
   * @example
   * const resolved = await alertsService.resolve('alert-123');
   */
  async resolve(id: string): Promise<Alert> {
    return this.updateStatus(id, AlertStatus.RESOLVED);
  }

  /**
   * Acknowledges an alert, indicating it has been seen and is being addressed.
   *
   * @description
   * Use this when a user or clinician has reviewed the alert and is taking
   * action. Acknowledged alerts remain visible but indicate awareness.
   *
   * @param id - UUID of the alert to acknowledge
   *
   * @returns The updated alert with ACKNOWLEDGED status
   *
   * @throws {NotFoundException} When no alert exists with the given ID
   *
   * @example
   * const acknowledged = await alertsService.acknowledge('alert-123');
   */
  async acknowledge(id: string): Promise<Alert> {
    return this.updateStatus(id, AlertStatus.ACKNOWLEDGED);
  }

  /**
   * Retrieves all active alerts for a user.
   *
   * @description
   * Returns alerts with ACTIVE status, ordered by creation date descending.
   * Useful for notification badges and alert summaries on dashboards.
   *
   * @param userId - UUID of the user
   *
   * @returns Array of active alerts
   *
   * @example
   * const activeAlerts = await alertsService.getActiveAlerts('user-123');
   * console.log(`You have ${activeAlerts.length} active alerts`);
   */
  async getActiveAlerts(userId: string) {
    return this.prisma.alert.findMany({
      where: {
        userId,
        status: AlertStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
