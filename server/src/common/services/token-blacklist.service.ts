import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * Service for managing blacklisted (revoked) access tokens.
 *
 * With short-lived access tokens (15m), the blacklist only needs to hold
 * entries for the remaining token lifetime. A cleanup task removes expired
 * entries periodically.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if an access token has been revoked.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const entry = await this.prisma.blacklistedToken.findUnique({
      where: { jti },
    });
    return entry !== null;
  }

  /**
   * Blacklist an access token (revoke it before natural expiry).
   */
  async blacklist(
    jti: string,
    userId: string,
    expiresAt: Date,
    reason: string,
  ): Promise<void> {
    await this.prisma.blacklistedToken.create({
      data: { jti, userId, expiresAt, reason },
    });
    this.logger.log(
      `Token blacklisted: jti=${jti} user=${userId} reason=${reason}`,
    );
  }

  /**
   * Remove expired entries from the blacklist.
   * Called periodically by the cleanup scheduled task.
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.blacklistedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired blacklist entries`);
    }
    return result.count;
  }
}
