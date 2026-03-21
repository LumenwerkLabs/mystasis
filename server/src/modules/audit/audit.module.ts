import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Global audit module for HIPAA-compliant PHI access logging.
 * Marked as @Global() so any module can inject AuditService
 * without explicitly importing AuditModule.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
