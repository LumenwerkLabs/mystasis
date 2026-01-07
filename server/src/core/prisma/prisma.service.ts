import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService extends PrismaClient to integrate with NestJS lifecycle.
 * Handles database connection on module initialization and disconnection on module destroy.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Connect to the database when the module initializes.
   * Called automatically by NestJS when the module is loaded.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Database connection established');
  }

  /**
   * Disconnect from the database when the module is destroyed.
   * Called automatically by NestJS during application shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Enable shutdown hooks for graceful shutdown.
   * Registers a beforeExit handler that closes the NestJS app when Prisma disconnects.
   * @param app - The NestJS application instance
   */
  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
