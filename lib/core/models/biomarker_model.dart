/// Biomarker value model matching the backend BiomarkerValue entity
class BiomarkerModel {
  final String id;
  final String userId;
  final String type;
  final double value;
  final String unit;
  final DateTime timestamp;
  final String? source;
  final Map<String, dynamic>? metadata;
  final DateTime? createdAt;

  const BiomarkerModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.value,
    required this.unit,
    required this.timestamp,
    this.source,
    this.metadata,
    this.createdAt,
  });

  factory BiomarkerModel.fromJson(Map<String, dynamic> json) {
    return BiomarkerModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      type: json['type'] as String,
      value: (json['value'] as num).toDouble(),
      unit: json['unit'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      source: json['source'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'type': type,
      'value': value,
      'unit': unit,
      'timestamp': timestamp.toIso8601String(),
      'source': source,
      'metadata': metadata,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  /// Human-readable display name for the biomarker type
  String get displayName => _displayNames[type] ?? type;

  /// Category grouping for the biomarker type
  String get category => _categories[type] ?? 'Other';

  static const _displayNames = {
    'HEART_RATE': 'Heart Rate',
    'HEART_RATE_VARIABILITY': 'Heart Rate Variability',
    'BLOOD_PRESSURE_SYSTOLIC': 'Blood Pressure (Systolic)',
    'BLOOD_PRESSURE_DIASTOLIC': 'Blood Pressure (Diastolic)',
    'RESTING_HEART_RATE': 'Resting Heart Rate',
    'GLUCOSE': 'Fasting Glucose',
    'HBA1C': 'HbA1c',
    'CHOLESTEROL_TOTAL': 'Total Cholesterol',
    'CHOLESTEROL_LDL': 'LDL Cholesterol',
    'CHOLESTEROL_HDL': 'HDL Cholesterol',
    'TRIGLYCERIDES': 'Triglycerides',
    'STEPS': 'Steps',
    'ACTIVE_CALORIES': 'Active Calories',
    'SLEEP_DURATION': 'Sleep Duration',
    'SLEEP_QUALITY': 'Sleep Quality',
    'VO2_MAX': 'VO2 Max',
    'WEIGHT': 'Weight',
    'BMI': 'BMI',
    'BODY_FAT_PERCENTAGE': 'Body Fat %',
    'VITAMIN_D': 'Vitamin D (25-OH)',
    'IRON': 'Iron',
    'FERRITIN': 'Ferritin',
    'B12': 'Vitamin B12',
    'FOLATE': 'Folate',
    'CRP': 'hsCRP',
    'ESR': 'ESR',
    'TESTOSTERONE': 'Testosterone',
    'CORTISOL': 'Cortisol',
    'TSH': 'TSH',
    'T3': 'T3',
    'T4': 'T4',
    'CUSTOM': 'Custom',
  };

  static const _categories = {
    'HEART_RATE': 'Cardiovascular',
    'HEART_RATE_VARIABILITY': 'Cardiovascular',
    'BLOOD_PRESSURE_SYSTOLIC': 'Cardiovascular',
    'BLOOD_PRESSURE_DIASTOLIC': 'Cardiovascular',
    'RESTING_HEART_RATE': 'Cardiovascular',
    'GLUCOSE': 'Metabolic',
    'HBA1C': 'Metabolic',
    'CHOLESTEROL_TOTAL': 'Cardiovascular',
    'CHOLESTEROL_LDL': 'Cardiovascular',
    'CHOLESTEROL_HDL': 'Cardiovascular',
    'TRIGLYCERIDES': 'Cardiovascular',
    'STEPS': 'Fitness',
    'ACTIVE_CALORIES': 'Fitness',
    'SLEEP_DURATION': 'Fitness',
    'SLEEP_QUALITY': 'Fitness',
    'VO2_MAX': 'Fitness',
    'WEIGHT': 'Body Composition',
    'BMI': 'Body Composition',
    'BODY_FAT_PERCENTAGE': 'Body Composition',
    'VITAMIN_D': 'Vitamins',
    'IRON': 'Vitamins',
    'FERRITIN': 'Vitamins',
    'B12': 'Vitamins',
    'FOLATE': 'Vitamins',
    'CRP': 'Inflammatory',
    'ESR': 'Inflammatory',
    'TESTOSTERONE': 'Hormonal',
    'CORTISOL': 'Hormonal',
    'TSH': 'Hormonal',
    'T3': 'Hormonal',
    'T4': 'Hormonal',
  };

  /// Static reference ranges for status display (optimal min, optimal max)
  static const referenceRanges = {
    'GLUCOSE': (70.0, 100.0),
    'HBA1C': (4.0, 5.6),
    'CHOLESTEROL_LDL': (0.0, 100.0),
    'CHOLESTEROL_HDL': (60.0, 100.0),
    'TRIGLYCERIDES': (0.0, 100.0),
    'VITAMIN_D': (40.0, 80.0),
    'B12': (500.0, 1000.0),
    'FERRITIN': (50.0, 200.0),
    'TSH': (0.5, 2.5),
    'TESTOSTERONE': (500.0, 900.0),
    'CORTISOL': (6.0, 18.0),
    'CRP': (0.0, 1.0),
    'CHOLESTEROL_TOTAL': (0.0, 200.0),
    'HEART_RATE': (60.0, 100.0),
    'HEART_RATE_VARIABILITY': (20.0, 100.0),
    'BLOOD_PRESSURE_SYSTOLIC': (90.0, 120.0),
    'BLOOD_PRESSURE_DIASTOLIC': (60.0, 80.0),
    'RESTING_HEART_RATE': (50.0, 80.0),
    'WEIGHT': (50.0, 100.0),
    'BMI': (18.5, 24.9),
    'BODY_FAT_PERCENTAGE': (10.0, 25.0),
    'IRON': (60.0, 170.0),
    'FOLATE': (3.0, 20.0),
    'ESR': (0.0, 20.0),
    'T3': (80.0, 200.0),
    'T4': (5.0, 12.0),
    'VO2_MAX': (30.0, 60.0),
  };

  /// Get status based on reference ranges
  String get status {
    final range = referenceRanges[type];
    if (range == null) return 'unknown';
    final (min, max) = range;
    if (value >= min && value <= max) return 'optimal';
    final rangeSize = max - min;
    if (value < min - rangeSize * 0.2 || value > max + rangeSize * 0.2) {
      return 'critical';
    }
    return 'borderline';
  }

  /// Get the optimal range string for display
  String get rangeDisplay {
    final range = referenceRanges[type];
    if (range == null) return '-';
    final (min, max) = range;
    if (min == 0) return '<${max.toStringAsFixed(0)}';
    return '${min.toStringAsFixed(0)}-${max.toStringAsFixed(0)}';
  }
}
