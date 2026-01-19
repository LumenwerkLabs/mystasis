import { Module } from '@nestjs/common';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Module for clinic management functionality.
 *
 * @description Provides endpoints for clinic CRUD operations and
 * patient enrollment management. Supports multi-tenancy through
 * clinic-based access control.
 *
 * **Dependencies:**
 * - PrismaModule: Database access
 * - AuthModule: JWT authentication and guards
 *
 * **Exports:**
 * - ClinicsService: For use by other modules needing clinic data
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
