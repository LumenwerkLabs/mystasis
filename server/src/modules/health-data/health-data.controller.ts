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
import { BiomarkerType, UserRole } from '@prisma/client';
import { HealthDataService } from './health-data.service';
import { CreateBiomarkerDto } from './dto/create-biomarker.dto';
import { WearableSyncDto } from './dto/wearable-sync.dto';
import { GetBiomarkersQueryDto } from './dto/get-biomarkers-query.dto';
import { GetTrendQueryDto } from './dto/get-trend-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
  async deleteBiomarker(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthDataService.remove(id);
  }
}
