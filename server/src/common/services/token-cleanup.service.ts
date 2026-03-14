import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';

/**
 * Scheduled task that cleans up expired tokens from the database.
 *
 * Runs every hour to remove:
 * - Expired blacklisted access tokens (no longer relevant after natural expiry)
 * - Expired refresh tokens (past their 7-day lifetime)
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    const blacklistCount = await this.tokenBlacklistService.cleanupExpired();

    // Keep expired refresh tokens for 1 extra day to preserve replay
    // detection (a reused revoked token triggers full family revocation).
    const gracePeriod = new Date();
    gracePeriod.setDate(gracePeriod.getDate() - 1);

    const refreshResult = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: gracePeriod } },
    });

    if (blacklistCount > 0 || refreshResult.count > 0) {
      this.logger.log(
        `Token cleanup: ${blacklistCount} blacklist entries, ${refreshResult.count} refresh tokens removed`,
      );
    }
  }
}
