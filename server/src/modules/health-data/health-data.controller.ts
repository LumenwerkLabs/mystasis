import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BiomarkerType, UserRole } from '../../generated/prisma/client';
import { HealthDataService } from './health-data.service';
import { CreateBiomarkerDto } from './dto/create-biomarker.dto';
import { WearableSyncDto } from './dto/wearable-sync.dto';
import { PatientSyncDto } from './dto/patient-sync.dto';
import { GetBiomarkersQueryDto } from './dto/get-biomarkers-query.dto';
import { GetTrendQueryDto } from './dto/get-trend-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '../../common/decorators/throttle.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * Controller for managing health data biomarkers.
 *
 * @description Provides REST endpoints for CRUD operations on biomarker data.
 * All endpoints require JWT authentication. Access control:
 * - CLINICIAN: Full access to all user biomarkers
 * - PATIENT: Can only access their own biomarkers
 *
 * @remarks
 * All biomarker data is considered PHI under HIPAA. Access is restricted
 * to authorized users and logged for audit purposes.
 */
@ApiTags('Health-Data')
@ApiBearerAuth('JWT-auth')
@Controller('health-data')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  /**
   * Validates that a patient can only access their own data.
   *
   * @param userId - The ID of the user whose data is being accessed
   * @param currentUser - The authenticated user making the request
   * @throws {ForbiddenException} When patient tries to access another user's data
   */
  private validatePatientAccess(
    userId: string,
    currentUser: UserPayload,
  ): void {
    if (currentUser.role === UserRole.PATIENT && userId !== currentUser.sub) {
      throw new ForbiddenException('You can only access your own health data');
    }
  }

  /**
   * Get paginated biomarkers for a user.
   *
   * @description Retrieves biomarker values with optional filtering by type,
   * date range, and pagination. Patients can only access their own data.
   *
   * @param userId - UUID of the user whose biomarkers to retrieve
   * @param query - Query parameters for filtering and pagination
   * @param user - The authenticated user from JWT token
   * @returns Paginated biomarkers response
   *
   * @throws {ForbiddenException} When patient tries to access another user's data
   */
  @Get('biomarkers/:userId')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get paginated biomarkers for a user',
    description:
      'Retrieves biomarker values with optional filtering by type, date range, and pagination. Patients can only access their own data; clinicians can access any patient data.',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the user whose biomarkers to retrieve',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of biomarkers',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid userId format or query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - patient cannot access other user data',
  })
  async getBiomarkers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetBiomarkersQueryDto,
    @CurrentUser() user: UserPayload,
  ) {
    this.validatePatientAccess(userId, user);

    return this.healthDataService.findAll(userId, {
      type: query.type,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Create a single biomarker entry.
   *
   * @description Creates a new biomarker value. Only accessible by clinicians.
   *
   * @param dto - Biomarker creation data
   * @returns The created biomarker
   */
  @Post('biomarkers')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Create a single biomarker entry',
    description:
      'Creates a new biomarker value for a user. Only accessible by clinicians. All biomarker data is PHI under HIPAA.',
  })
  @ApiResponse({
    status: 201,
    description: 'Biomarker created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid biomarker data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async createBiomarker(@Body() dto: CreateBiomarkerDto) {
    return this.healthDataService.create({
      userId: dto.userId,
      type: dto.type,
      value: dto.value,
      unit: dto.unit,
      timestamp: new Date(dto.timestamp),
      source: dto.source,
      metadata: dto.metadata,
    });
  }

  /**
   * Batch sync biomarkers from wearable devices.
   *
   * @description Creates multiple biomarker entries in a single operation.
   * Optimized for wearable device data sync. Only accessible by clinicians.
   *
   * @param dto - Wearable sync data containing userId and biomarkers array
   * @returns Count of created records
   */
  @Post('sync')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Batch sync biomarkers from wearable devices',
    description:
      'Creates multiple biomarker entries in a single operation. Optimized for wearable device data sync (Apple Health, Fitbit, etc.). Only accessible by clinicians. Max 1000 biomarkers per request.',
  })
  @ApiResponse({
    status: 201,
    description: 'Biomarkers synced successfully',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of biomarkers created',
          example: 150,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error - invalid data or exceeds 1000 biomarker limit',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async syncWearableData(@Body() dto: WearableSyncDto) {
    const biomarkersToCreate = dto.biomarkers.map((biomarker) => ({
      userId: dto.userId,
      type: biomarker.type,
      value: biomarker.value,
      unit: biomarker.unit,
      timestamp: new Date(biomarker.timestamp),
      source: biomarker.source,
    }));

    return this.healthDataService.createMany(biomarkersToCreate);
  }

  /**
   * Patient-initiated health data sync (e.g., Apple Health).
   *
   * @description Creates multiple biomarker entries from a patient's own
   * health data source. The userId is inferred from the JWT token.
   *
   * @param dto - Biomarkers array (without userId)
   * @param user - The authenticated user from JWT token
   * @returns Count of created records
   */
  @Post('sync/me')
  @Throttle(30, 60)
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Sync health data from patient device (e.g., Apple Health)',
    description:
      'Creates multiple biomarker entries from a patient\'s own health data source. The userId is inferred from the JWT token, ensuring patients can only sync to their own account. Max 1000 biomarkers per request.',
  })
  @ApiResponse({
    status: 201,
    description: 'Health data synced successfully',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of biomarkers created',
          example: 150,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error - invalid data or exceeds 1000 biomarker limit',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  async syncMyHealthData(
    @Body() dto: PatientSyncDto,
    @CurrentUser() user: UserPayload,
  ) {
    const biomarkersToCreate = dto.biomarkers.map((biomarker) => ({
      userId: user.sub,
      type: biomarker.type,
      value: biomarker.value,
      unit: biomarker.unit,
      timestamp: new Date(biomarker.timestamp),
      source: biomarker.source,
    }));

    return this.healthDataService.createMany(biomarkersToCreate);
  }

  /**
   * Get the latest biomarker of a specific type for a user.
   *
   * @description Retrieves the most recent biomarker value of the specified type.
   * Patients can only access their own data.
   *
   * @param userId - UUID of the user
   * @param type - Biomarker type to retrieve
   * @param user - The authenticated user from JWT token
   * @returns The latest biomarker or null
   *
   * @throws {ForbiddenException} When patient tries to access another user's data
   */
  @Get('biomarkers/:userId/latest/:type')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get the latest biomarker of a specific type',
    description:
      'Retrieves the most recent biomarker value of the specified type for a user. Patients can only access their own data.',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the user',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'type',
    description: 'Biomarker type to retrieve',
    enum: BiomarkerType,
  })
  @ApiResponse({
    status: 200,
    description: 'Latest biomarker value (or null if none exists)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid userId format or biomarker type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - patient cannot access other user data',
  })
  async getLatestBiomarker(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('type', new ParseEnumPipe(BiomarkerType)) type: BiomarkerType,
    @CurrentUser() user: UserPayload,
  ) {
    this.validatePatientAccess(userId, user);

    return this.healthDataService.findLatest(userId, type);
  }

  /**
   * Get biomarker trend data within a date range.
   *
   * @description Retrieves biomarker values for trend analysis within the
   * specified date range, ordered by timestamp ascending.
   * Patients can only access their own data.
   *
   * @param userId - UUID of the user
   * @param type - Biomarker type to retrieve
   * @param query - Date range query parameters
   * @param user - The authenticated user from JWT token
   * @returns Array of biomarkers for trend analysis
   *
   * @throws {ForbiddenException} When patient tries to access another user's data
   */
  @Get('biomarkers/:userId/trend/:type')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get biomarker trend data within a date range',
    description:
      'Retrieves biomarker values for trend analysis within the specified date range, ordered by timestamp ascending. Patients can only access their own data.',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the user',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'type',
    description: 'Biomarker type to analyze',
    enum: BiomarkerType,
  })
  @ApiResponse({
    status: 200,
    description: 'Array of biomarker values for trend analysis',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid userId, biomarker type, or date range',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - patient cannot access other user data',
  })
  async getTrendData(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('type', new ParseEnumPipe(BiomarkerType)) type: BiomarkerType,
    @Query() query: GetTrendQueryDto,
    @CurrentUser() user: UserPayload,
  ) {
    this.validatePatientAccess(userId, user);

    return this.healthDataService.getTrend(
      userId,
      type,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  /**
   * Delete a biomarker entry.
   *
   * @description Permanently deletes a biomarker value. Only accessible by clinicians.
   *
   * @param id - UUID of the biomarker to delete
   * @returns The deleted biomarker
   */
  @Delete('biomarkers/:id')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Delete a biomarker entry',
    description:
      'Permanently deletes a biomarker value. Only accessible by clinicians. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the biomarker to delete',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Biomarker deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid biomarker ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Biomarker not found',
  })
  async deleteBiomarker(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthDataService.remove(id);
  }
}
