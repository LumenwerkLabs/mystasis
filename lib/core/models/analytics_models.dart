/// Cohort summary statistics for a clinic.
class CohortSummary {
  final int totalPatients;
  final int activePatients;
  final int patientsWithAlerts;
  final double averageAge;
  final AgeDistribution ageDistribution;

  const CohortSummary({
    required this.totalPatients,
    required this.activePatients,
    required this.patientsWithAlerts,
    required this.averageAge,
    required this.ageDistribution,
  });

  factory CohortSummary.fromJson(Map<String, dynamic> json) {
    return CohortSummary(
      totalPatients: json['totalPatients'] as int,
      activePatients: json['activePatients'] as int,
      patientsWithAlerts: json['patientsWithAlerts'] as int,
      averageAge: (json['averageAge'] as num).toDouble(),
      ageDistribution: AgeDistribution.fromJson(
          json['ageDistribution'] as Map<String, dynamic>),
    );
  }
}

class AgeDistribution {
  final int under30;
  final int between30And50;
  final int between50And70;
  final int over70;

  const AgeDistribution({
    required this.under30,
    required this.between30And50,
    required this.between50And70,
    required this.over70,
  });

  factory AgeDistribution.fromJson(Map<String, dynamic> json) {
    return AgeDistribution(
      under30: json['under30'] as int,
      between30And50: json['between30And50'] as int,
      between50And70: json['between50And70'] as int,
      over70: json['over70'] as int,
    );
  }
}

/// Risk level distribution across the clinic's patient cohort.
class RiskDistribution {
  final int low;
  final int medium;
  final int high;
  final int critical;

  const RiskDistribution({
    required this.low,
    required this.medium,
    required this.high,
    required this.critical,
  });

  int get total => low + medium + high + critical;

  factory RiskDistribution.fromJson(Map<String, dynamic> json) {
    return RiskDistribution(
      low: json['low'] as int,
      medium: json['medium'] as int,
      high: json['high'] as int,
      critical: json['critical'] as int,
    );
  }
}

/// Alert statistics for a clinic within a date range.
class AlertStatistics {
  final int totalAlerts;
  final AlertsByStatus byStatus;
  final AlertsBySeverity bySeverity;
  final int averageResolutionTimeHours;

  const AlertStatistics({
    required this.totalAlerts,
    required this.byStatus,
    required this.bySeverity,
    required this.averageResolutionTimeHours,
  });

  factory AlertStatistics.fromJson(Map<String, dynamic> json) {
    return AlertStatistics(
      totalAlerts: json['totalAlerts'] as int,
      byStatus:
          AlertsByStatus.fromJson(json['byStatus'] as Map<String, dynamic>),
      bySeverity: AlertsBySeverity.fromJson(
          json['bySeverity'] as Map<String, dynamic>),
      averageResolutionTimeHours: json['averageResolutionTimeHours'] as int,
    );
  }
}

class AlertsByStatus {
  final int active;
  final int acknowledged;
  final int resolved;
  final int dismissed;

  const AlertsByStatus({
    required this.active,
    required this.acknowledged,
    required this.resolved,
    required this.dismissed,
  });

  factory AlertsByStatus.fromJson(Map<String, dynamic> json) {
    return AlertsByStatus(
      active: json['active'] as int,
      acknowledged: json['acknowledged'] as int,
      resolved: json['resolved'] as int,
      dismissed: json['dismissed'] as int,
    );
  }
}

class AlertsBySeverity {
  final int low;
  final int medium;
  final int high;
  final int critical;

  const AlertsBySeverity({
    required this.low,
    required this.medium,
    required this.high,
    required this.critical,
  });

  factory AlertsBySeverity.fromJson(Map<String, dynamic> json) {
    return AlertsBySeverity(
      low: json['low'] as int,
      medium: json['medium'] as int,
      high: json['high'] as int,
      critical: json['critical'] as int,
    );
  }
}

/// Population-level biomarker trend summary.
class TrendSummary {
  final String biomarkerType;
  final String unit;
  final double populationAverage;
  final double populationMin;
  final double populationMax;
  final String trend;
  final List<TrendDataPoint> dataPoints;

  const TrendSummary({
    required this.biomarkerType,
    required this.unit,
    required this.populationAverage,
    required this.populationMin,
    required this.populationMax,
    required this.trend,
    required this.dataPoints,
  });

  factory TrendSummary.fromJson(Map<String, dynamic> json) {
    return TrendSummary(
      biomarkerType: json['biomarkerType'] as String,
      unit: json['unit'] as String,
      populationAverage: (json['populationAverage'] as num).toDouble(),
      populationMin: (json['populationMin'] as num).toDouble(),
      populationMax: (json['populationMax'] as num).toDouble(),
      trend: json['trend'] as String,
      dataPoints: (json['dataPoints'] as List)
          .map((e) => TrendDataPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TrendDataPoint {
  final String date;
  final double averageValue;
  final double? minValue;
  final double? maxValue;
  final int sampleSize;

  const TrendDataPoint({
    required this.date,
    required this.averageValue,
    this.minValue,
    this.maxValue,
    required this.sampleSize,
  });

  factory TrendDataPoint.fromJson(Map<String, dynamic> json) {
    return TrendDataPoint(
      date: json['date'] as String,
      averageValue: (json['averageValue'] as num).toDouble(),
      minValue: json['minValue'] != null
          ? (json['minValue'] as num).toDouble()
          : null,
      maxValue: json['maxValue'] != null
          ? (json['maxValue'] as num).toDouble()
          : null,
      sampleSize: json['sampleSize'] as int,
    );
  }
}
