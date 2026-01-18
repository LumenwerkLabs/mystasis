import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * Controller for managing health alerts.
 *
 * @description Provides REST endpoints for CRUD operations on alerts.
 * All endpoints require JWT authentication. Access control:
 * - CLINICIAN: Full access to all user alerts
 * - PATIENT: Can only access their own alerts
 *
 * @remarks
 * Alerts are generated when biomarker values exceed defined thresholds.
 * They follow a status flow: ACTIVE -> ACKNOWLEDGED -> RESOLVED or DISMISSED
 */
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

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
      throw new ForbiddenException('You can only access your own alerts');
    }
  }

  /**
   * Validates alert ownership for a patient.
   *
   * @param alertId - The ID of the alert to validate
   * @param currentUser - The authenticated user making the request
   * @returns The alert if access is granted
   * @throws {ForbiddenException} When patient tries to access another user's alert
   */
  private async validateAlertOwnership(
    alertId: string,
    currentUser: UserPayload,
  ) {
    const alert = await this.alertsService.findOne(alertId);

    if (
      currentUser.role === UserRole.PATIENT &&
      alert.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('You can only access your own alerts');
    }

    return alert;
  }

  /**
   * Get paginated alerts for a user.
   *
   * @description Retrieves alerts with optional filtering by status,
   * severity, and pagination. Patients can only access their own alerts.
   *
   * @param userId - UUID of the user whose alerts to retrieve
   * @param query - Query parameters for filtering and pagination
   * @param user - The authenticated user from JWT token
   * @returns Array of alerts
   *
   * @throws {ForbiddenException} When patient tries to access another user's alerts
   */
  @Get(':userId')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  async getAlerts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetAlertsQueryDto,
    @CurrentUser() user: UserPayload,
  ) {
    this.validatePatientAccess(userId, user);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    return this.alertsService.findAll(userId, {
      status: query.status,
      severity: query.severity,
      skip,
      take: limit,
    });
  }

  /**
   * Get active alerts for a user.
   *
   * @description Retrieves only active alerts for a user.
   * Patients can only access their own alerts.
   *
   * @param userId - UUID of the user whose active alerts to retrieve
   * @param user - The authenticated user from JWT token
   * @returns Array of active alerts
   *
   * @throws {ForbiddenException} When patient tries to access another user's alerts
   */
  @Get(':userId/active')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  async getActiveAlerts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: UserPayload,
  ) {
    this.validatePatientAccess(userId, user);

    return this.alertsService.getActiveAlerts(userId);
  }

  /**
   * Get a single alert by ID.
   *
   * @description Retrieves a single alert. Patients can only access
   * their own alerts.
   *
   * @param id - UUID of the alert to retrieve
   * @param user - The authenticated user from JWT token
   * @returns The alert
   *
   * @throws {ForbiddenException} When patient tries to access another user's alert
   * @throws {NotFoundException} When alert is not found
   */
  @Get('detail/:id')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  async getAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.validateAlertOwnership(id, user);
  }

  /**
   * Create a new alert.
   *
   * @description Creates a new health alert. Only accessible by clinicians.
   *
   * @param dto - Alert creation data
   * @returns The created alert
   */
  @Post()
  @Roles(UserRole.CLINICIAN)
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.alertsService.create({
      userId: dto.userId,
      type: dto.type,
      severity: dto.severity,
      title: dto.title,
      message: dto.message,
      value: dto.value,
      threshold: dto.threshold,
    });
  }

  /**
   * Acknowledge an alert.
   *
   * @description Marks an alert as acknowledged. Patients can only
   * acknowledge their own alerts.
   *
   * @param id - UUID of the alert to acknowledge
   * @param user - The authenticated user from JWT token
   * @returns The updated alert
   *
   * @throws {ForbiddenException} When patient tries to acknowledge another user's alert
   * @throws {NotFoundException} When alert is not found
   */
  @Patch(':id/acknowledge')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.validateAlertOwnership(id, user);

    return this.alertsService.acknowledge(id);
  }

  /**
   * Dismiss an alert.
   *
   * @description Marks an alert as dismissed. Patients can only
   * dismiss their own alerts.
   *
   * @param id - UUID of the alert to dismiss
   * @param user - The authenticated user from JWT token
   * @returns The updated alert
   *
   * @throws {ForbiddenException} When patient tries to dismiss another user's alert
   * @throws {NotFoundException} When alert is not found
   */
  @Patch(':id/dismiss')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  async dismissAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.validateAlertOwnership(id, user);

    return this.alertsService.dismiss(id);
  }

  /**
   * Resolve an alert.
   *
   * @description Marks an alert as resolved. Only accessible by clinicians.
   *
   * @param id - UUID of the alert to resolve
   * @returns The updated alert
   *
   * @throws {NotFoundException} When alert is not found
   */
  @Patch(':id/resolve')
  @Roles(UserRole.CLINICIAN)
  async resolveAlert(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.resolve(id);
  }
}
