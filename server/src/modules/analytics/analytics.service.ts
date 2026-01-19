import { Injectable } from '@nestjs/common';
import {
  BiomarkerType,
  AlertSeverity,
  AlertStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CohortSummaryDto,
  RiskDistributionDto,
  AlertStatisticsDto,
  TrendSummaryDto,
  TrendDataPointDto,
} from './dto';

/**
 * Date range options for analytics queries.
 */
interface DateRangeOptions {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Default measurement units for each biomarker type.
 *
 * This mapping is used when returning trend summaries to provide
 * appropriate units for display. Units follow standard medical conventions:
 * - Cardiovascular: bpm (beats per minute), ms (milliseconds), mmHg (millimeters of mercury)
 * - Metabolic: mg/dL (milligrams per deciliter), % (percentage)
 * - Fitness: steps, kcal (kilocalories), hours
 * - Body composition: kg, kg/m2 (BMI units), %
 * - Blood markers: ng/mL, mcg/dL, pg/mL
 * - Hormones: ng/dL, mcg/dL, mIU/L
 */
const BIOMARKER_UNITS: Record<BiomarkerType, string> = {
  HEART_RATE: 'bpm',
  HEART_RATE_VARIABILITY: 'ms',
  BLOOD_PRESSURE_SYSTOLIC: 'mmHg',
  BLOOD_PRESSURE_DIASTOLIC: 'mmHg',
  RESTING_HEART_RATE: 'bpm',
  GLUCOSE: 'mg/dL',
  HBA1C: '%',
  CHOLESTEROL_TOTAL: 'mg/dL',
  CHOLESTEROL_LDL: 'mg/dL',
  CHOLESTEROL_HDL: 'mg/dL',
  TRIGLYCERIDES: 'mg/dL',
  STEPS: 'steps',
  ACTIVE_CALORIES: 'kcal',
  SLEEP_DURATION: 'hours',
  SLEEP_QUALITY: 'score',
  VO2_MAX: 'mL/kg/min',
  WEIGHT: 'kg',
  BMI: 'kg/m2',
  BODY_FAT_PERCENTAGE: '%',
  VITAMIN_D: 'ng/mL',
  IRON: 'mcg/dL',
  FERRITIN: 'ng/mL',
  B12: 'pg/mL',
  FOLATE: 'ng/mL',
  CRP: 'mg/L',
  ESR: 'mm/hr',
  TESTOSTERONE: 'ng/dL',
  CORTISOL: 'mcg/dL',
  TSH: 'mIU/L',
  T3: 'pg/mL',
  T4: 'mcg/dL',
  CUSTOM: '',
};

/**
 * Service for clinic-level analytics and cohort analysis.
 *
 * @description
 * Provides aggregated statistics and insights for clinicians to monitor
 * their patient population. All methods are designed to be called only
 * by users with CLINICIAN role (enforced at controller level).
 *
 * **Analytics Capabilities:**
 * - Cohort summary statistics (patient counts, demographics)
 * - Risk distribution across the patient population
 * - Alert statistics and resolution metrics
 * - Population-level biomarker trends
 *
 * **Privacy Protections:**
 * - All data is aggregated at the population level
 * - Individual patient data is never returned directly
 * - Sample sizes below threshold (5) suppress detailed statistics (min/max values)
 *   to prevent potential re-identification of individual patients
 * - Only aggregated averages, counts, and distributions are exposed
 *
 * **Data Aggregation Logic:**
 * - Biomarker values are grouped by day for trend analysis
 * - Trend direction is calculated by comparing first-half and second-half averages
 * - Risk levels are determined by highest severity active alert per patient
 * - Resolution time is calculated as the difference between alert creation and update time
 *
 * @remarks
 * All analytics methods filter data by clinicId to ensure clinic-level
 * isolation. Only patients belonging to the specified clinic are included
 * in the aggregations.
 *
 * @example
 * // Get cohort summary for a clinic
 * const summary = await analyticsService.getCohortSummary('clinic-123', {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 * });
 *
 * @example
 * // Get trend summary for heart rate
 * const trends = await analyticsService.getTrendSummary(
 *   'clinic-123',
 *   BiomarkerType.HEART_RATE,
 *   { startDate: new Date('2024-01-01') }
 * );
 */
/** Trend direction for biomarker analysis. */
type TrendDirection = 'increasing' | 'decreasing' | 'stable';

/** Threshold percentage for determining trend direction. */
const TREND_THRESHOLD_PERCENT = 5;

/** Milliseconds in one hour for time calculations. */
const MS_PER_HOUR = 1000 * 60 * 60;

/** Minimum sample size required to show detailed statistics (min/max values). */
const MIN_SAMPLE_SIZE_FOR_DETAILED_STATS = 5;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds a Prisma date filter from a DateRangeOptions object.
   *
   * @param options - Date range options containing optional startDate and endDate
   * @param fieldName - The name of the date field to filter on (e.g., 'timestamp', 'createdAt')
   * @returns A partial Prisma filter object with the date range, or empty object if no dates provided
   *
   * @example
   * // Returns { timestamp: { gte: startDate, lte: endDate } }
   * const filter = this.buildDateFilter({ startDate, endDate }, 'timestamp');
   */
  private buildDateFilter<T extends Record<string, unknown>>(
    options: DateRangeOptions | undefined,
    fieldName: keyof T,
  ): Partial<T> {
    if (!options?.startDate && !options?.endDate) {
      return {};
    }

    const dateCondition: Prisma.DateTimeFilter = {};
    if (options.startDate) {
      dateCondition.gte = options.startDate;
    }
    if (options.endDate) {
      dateCondition.lte = options.endDate;
    }

    return { [fieldName]: dateCondition } as Partial<T>;
  }

  /**
   * Calculates the trend direction based on comparing first and second half averages.
   *
   * @param dataPoints - Array of data points with averageValue property
   * @returns The trend direction: 'increasing', 'decreasing', or 'stable'
   */
  private calculateTrendDirection(
    dataPoints: Array<{ averageValue: number }>,
  ): TrendDirection {
    if (dataPoints.length < 2) {
      return 'stable';
    }

    const midpoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, midpoint);
    const secondHalf = dataPoints.slice(midpoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, dp) => sum + dp.averageValue, 0) /
      firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, dp) => sum + dp.averageValue, 0) /
      secondHalf.length;

    // Avoid division by zero
    if (firstHalfAvg === 0) {
      return 'stable';
    }

    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (percentChange > TREND_THRESHOLD_PERCENT) {
      return 'increasing';
    } else if (percentChange < -TREND_THRESHOLD_PERCENT) {
      return 'decreasing';
    }
    return 'stable';
  }

  /**
   * Get cohort summary statistics for a clinic.
   *
   * @param clinicId - UUID of the clinic to analyze
   * @param options - Date range options
   * @returns Cohort summary with patient counts and demographics
   *
   * @description
   * Returns aggregated patient statistics for patients in the specified clinic, including:
   * - Total patient count
   * - Active patients (those with biomarker data in the date range)
   * - Patients with active alerts
   * - Age distribution (returns zeros until birthDate field is added to User model)
   */
  async getCohortSummary(
    clinicId: string,
    options?: DateRangeOptions,
  ): Promise<CohortSummaryDto> {
    // Count total patients in this clinic
    const totalPatients = await this.prisma.user.count({
      where: { role: UserRole.PATIENT, clinicId },
    });

    // Build date filter for biomarker activity
    const dateFilter = this.buildDateFilter<Prisma.BiomarkerValueWhereInput>(
      options,
      'timestamp',
    );

    // Count active patients (those with biomarker data in the date range)
    const activePatientIds = await this.prisma.biomarkerValue.findMany({
      where: {
        ...dateFilter,
        user: { clinicId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    const activePatients = activePatientIds.length;

    // Count patients with active alerts in this clinic
    const patientsWithAlertsIds = await this.prisma.alert.findMany({
      where: {
        status: AlertStatus.ACTIVE,
        user: { clinicId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    const patientsWithAlerts = patientsWithAlertsIds.length;

    // Note: Age distribution requires birthDate field in User model
    // For MVP, return zeros
    return {
      totalPatients,
      activePatients,
      patientsWithAlerts,
      averageAge: 0,
      ageDistribution: {
        under30: 0,
        between30And50: 0,
        between50And70: 0,
        over70: 0,
      },
    };
  }

  /**
   * Get risk distribution across the clinic's patient cohort.
   *
   * @param clinicId - UUID of the clinic to analyze
   * @returns Risk distribution by level
   *
   * @description
   * Calculates patient risk levels for patients in the specified clinic based
   * on their highest severity active alert. Patients without active alerts
   * are considered LOW risk.
   */
  async getRiskDistribution(clinicId: string): Promise<RiskDistributionDto> {
    // Get all patients in this clinic
    const allPatients = await this.prisma.user.findMany({
      where: { role: UserRole.PATIENT, clinicId },
      select: { id: true },
    });

    if (allPatients.length === 0) {
      return {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
    }

    // Get the highest severity active alert for each patient in this clinic
    // Security: Filter by clinic to prevent cross-tenant data leakage
    const alertsByPatient = await this.prisma.alert.groupBy({
      by: ['userId'],
      where: {
        status: AlertStatus.ACTIVE,
        user: { clinicId },
      },
      _max: { severity: true },
    });

    // Create a map of userId to highest severity
    const patientSeverityMap = new Map<string, AlertSeverity>();
    for (const alert of alertsByPatient) {
      if (alert._max.severity) {
        patientSeverityMap.set(alert.userId, alert._max.severity);
      }
    }

    // Count patients by risk level
    let low = 0;
    let medium = 0;
    let high = 0;
    let critical = 0;

    for (const patient of allPatients) {
      const severity = patientSeverityMap.get(patient.id);
      switch (severity) {
        case AlertSeverity.CRITICAL:
          critical++;
          break;
        case AlertSeverity.HIGH:
          high++;
          break;
        case AlertSeverity.MEDIUM:
          medium++;
          break;
        case AlertSeverity.LOW:
          low++;
          break;
        default:
          // No active alerts = LOW risk
          low++;
          break;
      }
    }

    return {
      low,
      medium,
      high,
      critical,
    };
  }

  /**
   * Get alert statistics for a clinic.
   *
   * @param clinicId - UUID of the clinic to analyze
   * @param options - Date range options
   * @returns Alert statistics with breakdowns
   *
   * @description
   * Returns aggregated alert statistics for alerts belonging to patients in
   * the specified clinic, including:
   * - Total alert count
   * - Breakdown by status (ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED)
   * - Breakdown by severity (LOW, MEDIUM, HIGH, CRITICAL)
   * - Average resolution time in hours
   */
  async getAlertStatistics(
    clinicId: string,
    options?: DateRangeOptions,
  ): Promise<AlertStatisticsDto> {
    // Build date filter for alert creation time
    const dateFilter = this.buildDateFilter<Prisma.AlertWhereInput>(
      options,
      'createdAt',
    );

    // Build clinic filter
    const clinicFilter = { user: { clinicId } };

    // Combine filters
    const whereFilter = { ...dateFilter, ...clinicFilter };

    // Get total count
    const totalAlerts = await this.prisma.alert.count({
      where: whereFilter,
    });

    // Count by status
    const statusCounts = await this.prisma.alert.groupBy({
      by: ['status'],
      where: whereFilter,
      _count: { id: true },
    });

    const byStatus = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
      dismissed: 0,
    };

    for (const statusCount of statusCounts) {
      switch (statusCount.status) {
        case AlertStatus.ACTIVE:
          byStatus.active = statusCount._count.id;
          break;
        case AlertStatus.ACKNOWLEDGED:
          byStatus.acknowledged = statusCount._count.id;
          break;
        case AlertStatus.RESOLVED:
          byStatus.resolved = statusCount._count.id;
          break;
        case AlertStatus.DISMISSED:
          byStatus.dismissed = statusCount._count.id;
          break;
      }
    }

    // Count by severity
    const severityCounts = await this.prisma.alert.groupBy({
      by: ['severity'],
      where: whereFilter,
      _count: { id: true },
    });

    const bySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const severityCount of severityCounts) {
      switch (severityCount.severity) {
        case AlertSeverity.LOW:
          bySeverity.low = severityCount._count.id;
          break;
        case AlertSeverity.MEDIUM:
          bySeverity.medium = severityCount._count.id;
          break;
        case AlertSeverity.HIGH:
          bySeverity.high = severityCount._count.id;
          break;
        case AlertSeverity.CRITICAL:
          bySeverity.critical = severityCount._count.id;
          break;
      }
    }

    // Calculate average resolution time
    // Resolution time = updatedAt - createdAt for RESOLVED alerts
    const resolvedAlerts = await this.prisma.alert.findMany({
      where: {
        ...whereFilter,
        status: AlertStatus.RESOLVED,
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    const averageResolutionTimeHours =
      this.calculateAverageResolutionTime(resolvedAlerts);

    return {
      totalAlerts,
      byStatus,
      bySeverity,
      averageResolutionTimeHours,
    };
  }

  /**
   * Calculates the average resolution time in hours for a list of resolved alerts.
   *
   * @param alerts - Array of alerts with createdAt and updatedAt timestamps
   * @returns Average resolution time in hours, rounded to nearest whole number
   */
  private calculateAverageResolutionTime(
    alerts: Array<{ createdAt: Date; updatedAt: Date }>,
  ): number {
    if (alerts.length === 0) {
      return 0;
    }

    const totalResolutionTimeMs = alerts.reduce((sum, alert) => {
      return sum + (alert.updatedAt.getTime() - alert.createdAt.getTime());
    }, 0);

    const avgMs = totalResolutionTimeMs / alerts.length;
    return Math.round(avgMs / MS_PER_HOUR);
  }

  /**
   * Get population biomarker trend summary for a clinic.
   *
   * @param clinicId - UUID of the clinic to analyze
   * @param biomarkerType - The type of biomarker to analyze
   * @param options - Date range options
   * @returns Trend summary with data points
   *
   * @description
   * Returns aggregated biomarker trends for patients in the specified clinic, including:
   * - Population-wide average, min, and max values
   * - Overall trend direction (increasing, decreasing, stable)
   * - Daily data points with statistics
   */
  async getTrendSummary(
    clinicId: string,
    biomarkerType: BiomarkerType,
    options?: DateRangeOptions,
  ): Promise<TrendSummaryDto> {
    // Build date filter with biomarker type and clinic filter
    const baseDateFilter =
      this.buildDateFilter<Prisma.BiomarkerValueWhereInput>(
        options,
        'timestamp',
      );
    const dateFilter: Prisma.BiomarkerValueWhereInput = {
      type: biomarkerType,
      user: { clinicId },
      ...baseDateFilter,
    };

    // Get population-wide aggregates
    const aggregates = await this.prisma.biomarkerValue.aggregate({
      where: dateFilter,
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
    });

    const populationAverage = aggregates._avg.value ?? 0;
    const populationMin = aggregates._min.value ?? 0;
    const populationMax = aggregates._max.value ?? 0;

    // Get all biomarker values for trend calculation
    const biomarkerValues = await this.prisma.biomarkerValue.findMany({
      where: dateFilter,
      select: {
        value: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group biomarker values by day and calculate daily data points
    const dataPoints = this.aggregateBiomarkerValuesByDay(biomarkerValues);

    // Calculate trend direction using the helper method
    const trend = this.calculateTrendDirection(dataPoints);

    // Get unit for this biomarker type
    const unit = BIOMARKER_UNITS[biomarkerType] || '';

    return {
      biomarkerType,
      unit,
      populationAverage: Math.round(populationAverage * 100) / 100,
      populationMin,
      populationMax,
      trend,
      dataPoints,
    };
  }

  /**
   * Aggregates biomarker values by day, calculating daily statistics.
   *
   * @param biomarkerValues - Array of biomarker values with value and timestamp
   * @returns Array of daily data points with averages, min, max, and sample size
   */
  private aggregateBiomarkerValuesByDay(
    biomarkerValues: Array<{ value: number; timestamp: Date }>,
  ): TrendDataPointDto[] {
    // Group by date (day) and calculate daily statistics
    const dailyData = new Map<
      string,
      { values: number[]; min: number; max: number }
    >();

    for (const bv of biomarkerValues) {
      const dateKey = bv.timestamp.toISOString().split('T')[0];
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          values: [],
          min: Infinity,
          max: -Infinity,
        });
      }
      const day = dailyData.get(dateKey)!;
      day.values.push(bv.value);
      day.min = Math.min(day.min, bv.value);
      day.max = Math.max(day.max, bv.value);
    }

    // Create data points from aggregated daily data
    const dataPoints: TrendDataPointDto[] = [];
    for (const [date, data] of dailyData) {
      const sum = data.values.reduce((a, b) => a + b, 0);
      const avg = sum / data.values.length;
      const sampleSize = data.values.length;

      // Suppress min/max values when sample size is below threshold to prevent re-identification
      const shouldSuppressDetailedStats =
        sampleSize < MIN_SAMPLE_SIZE_FOR_DETAILED_STATS;

      dataPoints.push({
        date,
        averageValue: Math.round(avg * 100) / 100,
        minValue: shouldSuppressDetailedStats
          ? null
          : data.min === Infinity
            ? 0
            : data.min,
        maxValue: shouldSuppressDetailedStats
          ? null
          : data.max === -Infinity
            ? 0
            : data.max,
        sampleSize,
      });
    }

    return dataPoints;
  }
}
