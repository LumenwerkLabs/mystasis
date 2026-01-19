import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, Clinic } from '@prisma/client';
import { ClinicsService, SafeUser } from './clinics.service';
import { CreateClinicDto, UpdateClinicDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * Controller for clinic management endpoints.
 *
 * @description Provides REST endpoints for clinic CRUD operations
 * and patient enrollment management.
 *
 * **Access Control:**
 * - All endpoints require JWT authentication
 * - All endpoints are restricted to CLINICIAN role only
 * - Clinic-specific operations (update, delete, enrollment) require clinic ownership
 *
 * **Endpoints:**
 * - `POST /clinics` - Create a new clinic (any CLINICIAN)
 * - `GET /clinics` - List all clinics (any CLINICIAN)
 * - `GET /clinics/:id` - Get clinic by ID (any CLINICIAN)
 * - `PATCH /clinics/:id` - Update clinic (owner only)
 * - `DELETE /clinics/:id` - Delete clinic (owner only)
 * - `POST /clinics/:clinicId/patients/:patientId` - Enroll patient (owner only)
 * - `DELETE /clinics/:clinicId/patients/:patientId` - Unenroll patient (owner only)
 * - `GET /clinics/:clinicId/patients` - List patients (owner only)
 */
@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLINICIAN)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  /**
   * Validates that the current user has access to the specified clinic.
   *
   * @param clinicId - The clinic ID to validate access for
   * @param user - The current user payload
   * @throws {ForbiddenException} When user doesn't own the clinic
   */
  private validateClinicAccess(clinicId: string, user: UserPayload): void {
    if (user.clinicId !== clinicId) {
      throw new ForbiddenException(
        'You do not have permission to access this clinic',
      );
    }
  }

  /**
   * Creates a new clinic and associates the creating clinician with it.
   *
   * @param createClinicDto - The clinic creation data
   * @param user - The current user payload
   * @returns The created clinic
   */
  @Post()
  async create(
    @Body() createClinicDto: CreateClinicDto,
    @CurrentUser() user: UserPayload,
  ): Promise<Clinic> {
    // Create clinic and associate with the clinician
    return this.clinicsService.create(createClinicDto, user.sub);
  }

  /**
   * Retrieves clinics accessible to the current user.
   * For security, only returns the clinician's own clinic.
   *
   * @param user - The current user payload
   * @returns Array containing only the user's own clinic, or empty array if no clinic
   */
  @Get()
  async findAll(@CurrentUser() user: UserPayload): Promise<Clinic[]> {
    // Security: Only return the clinician's own clinic to prevent clinic enumeration
    if (!user.clinicId) {
      return [];
    }
    try {
      const clinic = await this.clinicsService.findOne(user.clinicId);
      return [clinic];
    } catch {
      return [];
    }
  }

  /**
   * Retrieves a clinic by its ID.
   * Only the clinic owner can view the clinic details.
   *
   * @param id - UUID of the clinic
   * @param user - The current user payload
   * @returns The clinic
   * @throws {ForbiddenException} When user doesn't own the clinic
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<Clinic> {
    this.validateClinicAccess(id, user);
    return this.clinicsService.findOne(id);
  }

  /**
   * Updates a clinic by its ID.
   * Only the clinic owner can update it.
   *
   * @param id - UUID of the clinic
   * @param updateClinicDto - The clinic update data
   * @param user - The current user payload
   * @returns The updated clinic
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClinicDto: UpdateClinicDto,
    @CurrentUser() user: UserPayload,
  ): Promise<Clinic> {
    this.validateClinicAccess(id, user);
    return this.clinicsService.update(id, updateClinicDto);
  }

  /**
   * Deletes a clinic by its ID.
   * Only the clinic owner can delete it.
   *
   * @param id - UUID of the clinic
   * @param user - The current user payload
   * @returns The deleted clinic
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<Clinic> {
    this.validateClinicAccess(id, user);
    return this.clinicsService.remove(id);
  }

  /**
   * Enrolls a patient in a clinic.
   * Only the clinic owner can enroll patients.
   *
   * @param clinicId - UUID of the clinic
   * @param patientId - UUID of the patient
   * @param user - The current user payload
   * @returns The enrolled patient (without password)
   */
  @Post(':clinicId/patients/:patientId')
  async enrollPatient(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<SafeUser> {
    this.validateClinicAccess(clinicId, user);
    // After validateClinicAccess, we know user.clinicId === clinicId
    return this.clinicsService.enrollPatient(
      clinicId,
      patientId,
      user.clinicId!,
    );
  }

  /**
   * Unenrolls a patient from a clinic.
   * Only the clinic owner can unenroll patients.
   *
   * @param clinicId - UUID of the clinic
   * @param patientId - UUID of the patient
   * @param user - The current user payload
   * @returns The unenrolled patient (without password)
   */
  @Delete(':clinicId/patients/:patientId')
  async unenrollPatient(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<SafeUser> {
    this.validateClinicAccess(clinicId, user);
    // After validateClinicAccess, we know user.clinicId === clinicId
    return this.clinicsService.unenrollPatient(
      clinicId,
      patientId,
      user.clinicId!,
    );
  }

  /**
   * Gets all patients enrolled in a clinic.
   * Only the clinic owner can view the patient list.
   *
   * @param clinicId - UUID of the clinic
   * @param user - The current user payload
   * @returns Array of patients in the clinic (without passwords)
   */
  @Get(':clinicId/patients')
  async getPatients(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<SafeUser[]> {
    this.validateClinicAccess(clinicId, user);
    return this.clinicsService.getPatients(clinicId);
  }
}
