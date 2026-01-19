import { PartialType } from '@nestjs/swagger';
import { CreateClinicDto } from './create-clinic.dto';

/**
 * DTO for updating a clinic.
 *
 * @description Extends CreateClinicDto with all fields made optional.
 * Uses NestJS Swagger PartialType utility for partial updates with proper OpenAPI documentation.
 */
export class UpdateClinicDto extends PartialType(CreateClinicDto) {}
