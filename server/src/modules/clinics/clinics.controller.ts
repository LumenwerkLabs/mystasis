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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole, Clinic } from '@prisma/client';
import { CookieService } from '../../common/services/cookie.service';
import {
  ClinicsService,
  SafeUser,
  CreateClinicResponse,
} from './clinics.service';
import { CreateClinicDto, UpdateClinicDto } from './dto';
import {
  ClinicResponseDto,
  CreateClinicResponseDto,
  SafeUserResponseDto,
} from './dto/clinic-response.dto';
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
@ApiTags('Clinics')
@ApiBearerAuth('JWT-auth')
@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLINICIAN)
export class ClinicsController {
  constructor(
    private readonly clinicsService: ClinicsService,
    private readonly cookieService: CookieService,
  ) {}

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
   * @param res - Express response for setting HttpOnly cookie
   * @returns The created clinic and a new access token with updated clinicId
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new clinic',
    description:
      'Creates a new clinic and automatically associates the creating clinician as the owner. ' +
      'Sets a new HttpOnly cookie with updated clinicId for web clients (automatic). ' +
      'Also returns the token in body for mobile clients. Only CLINICIAN role can create clinics.',
  })
  @ApiResponse({
    status: 201,
    description: 'Clinic created successfully with new access token',
    type: CreateClinicResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid clinic data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async create(
    @Body() createClinicDto: CreateClinicDto,
    @CurrentUser() user: UserPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CreateClinicResponse> {
    // Create clinic and associate with the clinician, returns new token
    const result = await this.clinicsService.create(createClinicDto, user.sub);

    // Set HttpOnly cookie for web clients (mobile clients use the token from body)
    this.cookieService.setAuthCookie(res, result.accessToken);

    return result;
  }

  /**
   * Retrieves clinics accessible to the current user.
   * For security, only returns the clinician's own clinic.
   *
   * @param user - The current user payload
   * @returns Array containing only the user's own clinic, or empty array if no clinic
   */
  @Get()
  @ApiOperation({
    summary: 'List clinics accessible to current user',
    description:
      'Returns the clinician own clinic. For security, clinicians can only see their own clinic to prevent enumeration.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accessible clinics',
    type: [ClinicResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
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
  @ApiOperation({
    summary: 'Get clinic by ID',
    description:
      'Retrieves clinic details by ID. Only the clinic owner can view the details.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the clinic',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic details',
    type: ClinicResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinic ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be clinic owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
  })
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
  @ApiOperation({
    summary: 'Update a clinic',
    description:
      'Updates clinic details. Only the clinic owner can update it. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the clinic to update',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic updated successfully',
    type: ClinicResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinic ID format or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be clinic owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
  })
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
  @ApiOperation({
    summary: 'Delete a clinic',
    description:
      'Permanently deletes a clinic. Only the clinic owner can delete it. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the clinic to delete',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic deleted successfully',
    type: ClinicResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinic ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be clinic owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
  })
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
  @ApiOperation({
    summary: 'Enroll a patient in a clinic',
    description:
      'Enrolls a patient in the clinic. Only the clinic owner can enroll patients. Patients can only be enrolled in one clinic at a time.',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'UUID of the clinic',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'patientId',
    description: 'UUID of the patient to enroll',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Patient enrolled successfully',
    type: SafeUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinic or patient ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be clinic owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic or patient not found',
  })
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
  @ApiOperation({
    summary: 'Unenroll a patient from a clinic',
    description:
      'Removes a patient from the clinic enrollment. Only the clinic owner can unenroll patients.',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'UUID of the clinic',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'patientId',
    description: 'UUID of the patient to unenroll',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient unenrolled successfully',
    type: SafeUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinic or patient ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be clinic owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic or patient not found',
  })
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
  @ApiOperation({
    summary: 'List all patients in a clinic',
    description:
      'Retrieves all patients enrolled in the clinic. Only the clinic owner can view the patient list.',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'UUID of the clinic',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of patients enrolled in the clinic',
    type: [SafeUserResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinic ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be clinic owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
  })
  async getPatients(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<SafeUser[]> {
    this.validateClinicAccess(clinicId, user);
    return this.clinicsService.getPatients(clinicId);
  }
}
