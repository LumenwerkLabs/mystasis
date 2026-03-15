import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/client';
import { AnamnesisService } from './anamnesis.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { UpdateAnamnesisDto } from './dto/update-anamnesis.dto';
import { GetAnamnesesQueryDto } from './dto/get-anamneses-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * Controller for managing structured clinical anamnesis records.
 *
 * @description Provides REST endpoints for CRUD operations on anamnesis data.
 * All endpoints require JWT authentication. Access control:
 * - CLINICIAN: Full CRUD access (create, read, update, delete)
 * - PATIENT: Read-only access to their own anamneses
 *
 * @remarks
 * Anamnesis records contain PHI (raw consultation transcripts and structured
 * clinical data). The clinicianId is auto-set from the JWT token on creation
 * to ensure audit trail integrity.
 */
@ApiTags('Anamnesis')
@ApiBearerAuth('JWT-auth')
@Controller('anamnesis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnamnesisController {
  constructor(private readonly anamnesisService: AnamnesisService) {}

  /**
   * Validates that a patient can only access their own data.
   */
  private validatePatientAccess(
    patientId: string,
    currentUser: UserPayload,
  ): void {
    if (
      currentUser.role === UserRole.PATIENT &&
      patientId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You can only access your own anamnesis records',
      );
    }
  }

  /**
   * Create a new anamnesis record after clinician review.
   *
   * @description Persists a structured anamnesis. The clinicianId is
   * automatically set from the authenticated user's JWT token.
   */
  @Post()
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Create a new anamnesis record',
    description:
      'Persists a clinician-reviewed structured anamnesis. The clinicianId is auto-set from the JWT token. Only accessible by clinicians.',
  })
  @ApiResponse({ status: 201, description: 'Anamnesis created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - CLINICIAN role required' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async create(
    @Body() dto: CreateAnamnesisDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.anamnesisService.create({
      patientId: dto.patientId,
      clinicianId: user.sub,
      rawTranscript: dto.rawTranscript,
      chiefComplaint: dto.chiefComplaint,
      historyOfPresentIllness: dto.historyOfPresentIllness,
      pastMedicalHistory: dto.pastMedicalHistory,
      currentMedications: dto.currentMedications,
      allergies: dto.allergies,
      familyHistory: dto.familyHistory,
      reviewOfSystems: dto.reviewOfSystems,
      socialHistory: dto.socialHistory,
      recordedAt: new Date(dto.recordedAt),
      isReviewed: dto.isReviewed,
    });
  }

  /**
   * Generate a temporary ElevenLabs transcription token.
   *
   * @description Returns a single-use token (15 min expiry) for client-side
   * WebSocket connection to ElevenLabs real-time STT. The real API key
   * never leaves the server.
   */
  @Post('transcription-token')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Generate a temporary ElevenLabs transcription token',
    description:
      'Returns a single-use token (15 min expiry) for client-side WebSocket connection to ElevenLabs STT. Only clinicians can request tokens.',
  })
  @ApiResponse({ status: 201, description: 'Token generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - CLINICIAN role required' })
  @ApiResponse({ status: 500, description: 'Token generation failed' })
  @ApiResponse({ status: 503, description: 'Cloud transcription not configured' })
  async getTranscriptionToken(@CurrentUser() user: UserPayload) {
    return this.anamnesisService.generateTranscriptionToken(user.sub);
  }

  /**
   * Get paginated anamneses for a patient.
   */
  @Get('patient/:patientId')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get paginated anamneses for a patient',
    description:
      'Retrieves anamnesis records with optional date range filtering and pagination. Patients can only access their own records.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'UUID of the patient',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of anamneses' })
  @ApiResponse({ status: 400, description: 'Invalid patientId format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - patient cannot access other user data' })
  async findAllForPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: GetAnamnesesQueryDto,
    @CurrentUser() user: UserPayload,
  ) {
    this.validatePatientAccess(patientId, user);

    return this.anamnesisService.findAllForPatient(patientId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get a single anamnesis by ID.
   */
  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get a single anamnesis by ID',
    description:
      'Retrieves a single anamnesis record. Patients can only access their own records.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the anamnesis',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'The anamnesis record' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Anamnesis not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const anamnesis = await this.anamnesisService.findOne(id);
    this.validatePatientAccess(anamnesis.patientId, user);
    return anamnesis;
  }

  /**
   * Update an existing anamnesis (edit structured fields, mark as reviewed).
   */
  @Patch(':id')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Update an anamnesis record',
    description:
      'Partially updates structured fields or marks as reviewed. Only accessible by clinicians. The patientId and rawTranscript are immutable.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the anamnesis to update',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Anamnesis updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - CLINICIAN role required' })
  @ApiResponse({ status: 404, description: 'Anamnesis not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnamnesisDto,
  ) {
    return this.anamnesisService.update(id, dto);
  }

  /**
   * Delete an anamnesis record.
   */
  @Delete(':id')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Delete an anamnesis record',
    description:
      'Permanently deletes an anamnesis record. Only accessible by clinicians. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the anamnesis to delete',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Anamnesis deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - CLINICIAN role required' })
  @ApiResponse({ status: 404, description: 'Anamnesis not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.anamnesisService.remove(id);
  }
}
