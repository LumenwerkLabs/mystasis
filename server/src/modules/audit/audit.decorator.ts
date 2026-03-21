import { SetMetadata } from '@nestjs/common';

export const AUDIT_PHI_RESOURCE_TYPE = 'AUDIT_PHI_RESOURCE_TYPE';

/**
 * Marks a controller or endpoint as handling PHI data.
 * The PhiAuditInterceptor will log access to endpoints decorated with this.
 *
 * @param resourceType - The type of PHI resource (e.g., 'BiomarkerValue', 'Alert')
 */
export const AuditPhi = (resourceType: string) =>
  SetMetadata(AUDIT_PHI_RESOURCE_TYPE, resourceType);
