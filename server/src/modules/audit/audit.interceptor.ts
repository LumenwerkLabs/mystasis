import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_PHI_RESOURCE_TYPE } from './audit.decorator';

/**
 * Interceptor that automatically logs PHI access for endpoints
 * decorated with @AuditPhi().
 *
 * Logs AFTER the response is sent (non-blocking) and NEVER
 * includes request/response bodies (which may contain PHI).
 */
@Injectable()
export class PhiAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Check for @AuditPhi() metadata on handler or class
    const resourceType = this.reflector.getAllAndOverride<string | undefined>(
      AUDIT_PHI_RESOURCE_TYPE,
      [context.getHandler(), context.getClass()],
    );

    // If no @AuditPhi decorator, pass through without logging
    if (!resourceType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub || request.user?.id || 'anonymous';
    const method = request.method;
    const path = request.route?.path || request.url;
    const ipAddress = request.ip;
    const userAgent = request.headers?.['user-agent'];

    // Extract resourceId from route params (covers :id, :patientId, :userId)
    const resourceId =
      request.params?.id ||
      request.params?.patientId ||
      request.params?.userId ||
      undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.auditService.log({
            userId,
            action: 'PHI_ACCESS',
            resourceType,
            resourceId,
            metadata: { method, path, statusCode: response.statusCode },
            ipAddress,
            userAgent,
          });
        },
        error: () => {
          this.auditService.log({
            userId,
            action: 'PHI_ACCESS_FAILED',
            resourceType,
            resourceId,
            metadata: { method, path },
            ipAddress,
            userAgent,
          });
        },
      }),
    );
  }
}
