import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface CreateAuditLogEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service for HIPAA-compliant audit logging.
 *
 * Writes audit entries to the AuditLog table using fire-and-forget
 * so logging never blocks or slows API responses.
 *
 * IMPORTANT: Never include PHI values in audit log entries.
 * Log resource types and IDs only — never biomarker values,
 * transcript text, or other patient health information.
 */
@Injectable()
export class AuditService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private readonly pendingTimeouts = new Set<NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  onModuleDestroy() {
    for (const timeout of this.pendingTimeouts) {
      clearTimeout(timeout);
    }
    this.pendingTimeouts.clear();
  }

  /**
   * Log an audit entry with retry. Fire-and-forget — never throws.
   * Retries up to 2 times with exponential backoff on failure.
   */
  log(entry: CreateAuditLogEntry): void {
    this.writeWithRetry(entry, 0);
  }

  private writeWithRetry(entry: CreateAuditLogEntry, attempt: number): void {
    const maxRetries = 2;
    this.prisma.auditLog
      .create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          metadata: entry.metadata as any,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      })
      .catch((err: Error) => {
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 100; // 100ms, 200ms
          const timeout = setTimeout(() => {
            this.pendingTimeouts.delete(timeout);
            this.writeWithRetry(entry, attempt + 1);
          }, delayMs);
          this.pendingTimeouts.add(timeout);
        } else {
          this.logger.error(
            `Failed to write audit log after ${maxRetries + 1} attempts: ${err.message}`,
          );
        }
      });
  }

  /**
   * Query audit logs with filters (for future admin/compliance use).
   *
   * WARNING: This method has no access control. If exposed via a
   * controller endpoint, it MUST be restricted to admin-only access
   * with appropriate role guards.
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.from || filters.to) {
      where.timestamp = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit ?? 100,
    });
  }
}
