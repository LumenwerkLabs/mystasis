import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseEnumPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BiomarkerType, UserRole } from '../../generated/prisma/client';
import { AnalyticsService } from './analytics.service';
import {
  GetAnalyticsQueryDto,
  CohortSummaryDto,
  RiskDistributionDto,
  AlertStatisticsDto,
  TrendSummaryDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';
import { AuditPhi } from '../audit/audit.decorator';

/**
 * Date range options for analytics queries.
 */
interface DateRangeOptions {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Controller for clinic-level analytics and cohort insights.
 *
 * @description Provides REST endpoints for aggregated population health analytics.
 * Designed for clinicians to monitor their patient cohorts and identify trends.
 *
 * **Access Control:**
 * - All endpoints require JWT authentication
 * - All endpoints are restricted to CLINICIAN role only
 * - Patients cannot access analytics data
 *
 * **Privacy Protections:**
 * - All data is aggregated at the population level
 * - Individual patient data is never exposed through these endpoints
 * - Sample sizes below threshold (5) suppress min/max values to prevent re-identification
 *
 * **Available Endpoints:**
 * - `GET /analytics/cohort/:clinicId/summary` - Cohort summary statistics
 * - `GET /analytics/cohort/:clinicId/risk-distribution` - Risk level breakdown
 * - `GET /analytics/cohort/:clinicId/alerts` - Alert statistics
 * - `GET /analytics/cohort/:clinicId/trends/:type` - Population biomarker trends
 *
 *
 * @example
 * ```typescript
 * // Get cohort summary for a clinic with date range
 * GET /analytics/cohort/clinic-uuid/summary?startDate=2024-01-01&endDate=2024-01-31
 *
 * // Get risk distribution for a clinic
 * GET /analytics/cohort/clinic-uuid/risk-distribution
 *
 * // Get trend summary for heart rate
 * GET /analytics/cohort/clinic-uuid/trends/HEART_RATE?startDate=2024-01-01
 * ```
 */
@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditPhi('Analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Validates that the current user has access to the specified clinic.
   *
   * @param clinicId - The clinic ID to validate access for
   * @param user - The current user payload
   * @throws {ForbiddenException} When user doesn't own the clinic
   */
  private validateClinicAccess(clinicId: string, user: UserPayload): void {
    if (!user.clinicId) {
      throw new ForbiddenException(
        'Access forbidden: no clinic assigned to this user',
      );
    }
    if (user.clinicId !== clinicId) {
      throw new ForbiddenException(
        'Access forbidden: not authorized to access this clinic',
      );
    }
  }

  /**
   * Parses date range from query DTO into Date objects.
   *
   * @param query - The analytics query DTO containing optional date strings
   * @returns Object with parsed startDate and endDate, or undefined if not provided
   * @throws {BadRequestException} When date string cannot be parsed into a valid date
   */
  private parseDateRange(query: GetAnalyticsQueryDto): DateRangeOptions {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (query.startDate) {
      startDate = new Date(query.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    }

    if (query.endDate) {
      endDate = new Date(query.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    }

    // Validate date range constraints
    if (startDate && endDate) {
      if (startDate > endDate) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate',
        );
      }
      const maxRangeDays = 365;
      const rangeDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (rangeDays > maxRangeDays) {
        throw new BadRequestException(
          `Date range cannot exceed ${maxRangeDays} days`,
        );
      }
    }

    return { startDate, endDate };
  }

  /**
   * Get cohort summary statistics for a clinic.
   *
   * @description Returns aggregated patient statistics for a clinic's cohort,
   * including total patient count, active patients (those with recent biomarker data),
   * patients with active alerts, and age distribution.
   *
   * This endpoint is restricted to CLINICIAN role only.
   *
   * @param clinicId - UUID of the clinic to retrieve summary for
   * @param query - Query parameters for optional date range filtering
   * @returns Cohort summary with patient counts and demographics
   *
   * @throws {UnauthorizedException} When JWT token is missing or invalid
   * @throws {ForbiddenException} When user does not have CLINICIAN role
   * @throws {BadRequestException} When clinicId is not a valid UUID or date range is invalid
   */
  @Get('cohort/:clinicId/summary')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get cohort summary statistics',
    description:
      'Returns aggregated statistics for a clinic patient cohort including patient counts and demographics. CLINICIAN role required.',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'UUID of the clinic',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Cohort summary retrieved successfully',
    type: CohortSummaryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinicId format or date range',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async getCohortSummary(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Query() query: GetAnalyticsQueryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<CohortSummaryDto> {
    this.validateClinicAccess(clinicId, user);
    const dateRange = this.parseDateRange(query);
    return this.analyticsService.getCohortSummary(clinicId, dateRange);
  }

  /**
   * Get risk distribution across the clinic's patient cohort.
   *
   * @description Calculates the distribution of patients across risk levels
   * based on their highest severity active alert. Patients without active
   * alerts are classified as LOW risk.
   *
   * Risk levels are determined by AlertSeverity enum:
   * - LOW: No alerts or only LOW severity alerts
   * - MEDIUM: Highest alert is MEDIUM severity
   * - HIGH: Highest alert is HIGH severity
   * - CRITICAL: At least one CRITICAL severity alert
   *
   * This endpoint is restricted to CLINICIAN role only.
   *
   * @param clinicId - UUID of the clinic to retrieve risk distribution for
   * @returns Risk distribution counts by level (LOW, MEDIUM, HIGH, CRITICAL)
   *
   * @throws {UnauthorizedException} When JWT token is missing or invalid
   * @throws {ForbiddenException} When user does not have CLINICIAN role
   * @throws {BadRequestException} When clinicId is not a valid UUID
   */
  @Get('cohort/:clinicId/risk-distribution')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get patient risk distribution',
    description:
      'Returns the count of patients at each risk level based on their highest severity active alert. CLINICIAN role required.',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'UUID of the clinic',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Risk distribution retrieved successfully',
    type: RiskDistributionDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid clinicId format' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async getRiskDistribution(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<RiskDistributionDto> {
    this.validateClinicAccess(clinicId, user);
    return this.analyticsService.getRiskDistribution(clinicId);
  }

  /**
   * Get alert statistics for a clinic.
   *
   * @description Returns comprehensive alert statistics for a clinic's patient cohort,
   * including total alerts, breakdowns by status and severity, and average resolution time.
   *
   * Statistics include:
   * - Total alert count within the date range
   * - Breakdown by status (ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED)
   * - Breakdown by severity (LOW, MEDIUM, HIGH, CRITICAL)
   * - Average resolution time in hours for RESOLVED alerts
   *
   * This endpoint is restricted to CLINICIAN role only.
   *
   * @param clinicId - UUID of the clinic to retrieve alert statistics for
   * @param query - Query parameters for optional date range filtering
   * @returns Alert statistics with breakdowns by status and severity
   *
   * @throws {UnauthorizedException} When JWT token is missing or invalid
   * @throws {ForbiddenException} When user does not have CLINICIAN role
   * @throws {BadRequestException} When clinicId is not a valid UUID or date range is invalid
   */
  @Get('cohort/:clinicId/alerts')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get alert statistics',
    description:
      'Returns aggregated alert statistics with breakdowns by status, severity, and average resolution time. CLINICIAN role required.',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'UUID of the clinic',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Alert statistics retrieved successfully',
    type: AlertStatisticsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinicId format or date range',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async getAlertStatistics(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Query() query: GetAnalyticsQueryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<AlertStatisticsDto> {
    this.validateClinicAccess(clinicId, user);
    const dateRange = this.parseDateRange(query);
    return this.analyticsService.getAlertStatistics(clinicId, dateRange);
  }

  /**
   * Get population biomarker trend summary for a clinic.
   *
   * @description Returns aggregated biomarker trends across the clinic's patient population
   * for a specific biomarker type. Includes population-wide statistics and daily data points.
   *
   * Trend data includes:
   * - Population-wide average, minimum, and maximum values
   * - Overall trend direction (increasing, decreasing, stable)
   * - Daily data points with averages and sample sizes
   * - Appropriate unit for the biomarker type
   *
   * **Privacy Protection:**
   * Daily data points with sample size below 5 will have min/max values suppressed
   * to prevent potential re-identification of individual patients.
   *
   * This endpoint is restricted to CLINICIAN role only.
   *
   * @param clinicId - UUID of the clinic to retrieve trends for
   * @param type - BiomarkerType enum value (e.g., HEART_RATE, GLUCOSE, STEPS)
   * @param query - Query parameters for optional date range filtering
   * @returns Trend summary with population statistics and daily data points
   *
   * @throws {UnauthorizedException} When JWT token is missing or invalid
   * @throws {ForbiddenException} When user does not have CLINICIAN role
   * @throws {BadRequestException} When clinicId is not a valid UUID, type is invalid, or date range is invalid
   */
  @Get('cohort/:clinicId/trends/:type')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get population biomarker trends',
    description:
      'Returns aggregated biomarker trend data for a specific biomarker type across the clinic population. CLINICIAN role required.',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'UUID of the clinic',
    type: String,
  })
  @ApiParam({
    name: 'type',
    description: 'Biomarker type to analyze',
    enum: BiomarkerType,
  })
  @ApiResponse({
    status: 200,
    description: 'Trend summary retrieved successfully',
    type: TrendSummaryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clinicId format, biomarker type, or date range',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async getTrendSummary(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('type', new ParseEnumPipe(BiomarkerType)) type: BiomarkerType,
    @Query() query: GetAnalyticsQueryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<TrendSummaryDto> {
    this.validateClinicAccess(clinicId, user);
    const dateRange = this.parseDateRange(query);
    return this.analyticsService.getTrendSummary(clinicId, type, dateRange);
  }
}
