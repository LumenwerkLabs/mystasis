import { PartialType } from '@nestjs/mapped-types';
import { CreateClinicDto } from './create-clinic.dto';

/**
 * DTO for updating a clinic.
 *
 * @description Extends CreateClinicDto with all fields made optional.
 * Uses NestJS PartialType utility for partial updates.
 */
export class UpdateClinicDto extends PartialType(CreateClinicDto) {}
