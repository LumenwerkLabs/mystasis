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

  /// Static lookup for display name by biomarker type string.
  static String? displayNameFor(String type) => _displayNames[type];

  /// Category grouping for the biomarker type
  String get category => _categories[type] ?? 'Other';

  static const _displayNames = {
    // Cardiovascular
    'HEART_RATE': 'Heart Rate',
    'HEART_RATE_VARIABILITY': 'Heart Rate Variability',
    'BLOOD_PRESSURE_SYSTOLIC': 'Blood Pressure (Systolic)',
    'BLOOD_PRESSURE_DIASTOLIC': 'Blood Pressure (Diastolic)',
    'RESTING_HEART_RATE': 'Resting Heart Rate',
    'WALKING_HEART_RATE': 'Walking Heart Rate',
    // Vitals
    'BLOOD_OXYGEN': 'Blood Oxygen (SpO2)',
    'RESPIRATORY_RATE': 'Respiratory Rate',
    'BODY_TEMPERATURE': 'Body Temperature',
    'PERIPHERAL_PERFUSION_INDEX': 'Perfusion Index',
    // Metabolic
    'GLUCOSE': 'Fasting Glucose',
    'HBA1C': 'HbA1c',
    'CHOLESTEROL_TOTAL': 'Total Cholesterol',
    'CHOLESTEROL_LDL': 'LDL Cholesterol',
    'CHOLESTEROL_HDL': 'HDL Cholesterol',
    'TRIGLYCERIDES': 'Triglycerides',
    // Fitness
    'STEPS': 'Steps',
    'ACTIVE_CALORIES': 'Active Calories',
    'BASAL_CALORIES': 'Basal Calories',
    'SLEEP_DURATION': 'Sleep Duration',
    'SLEEP_QUALITY': 'Sleep Quality',
    'SLEEP_DEEP': 'Deep Sleep',
    'SLEEP_REM': 'REM Sleep',
    'SLEEP_LIGHT': 'Light Sleep',
    'SLEEP_AWAKE': 'Awake Time',
    'VO2_MAX': 'VO2 Max',
    'EXERCISE_TIME': 'Exercise Time',
    'DISTANCE_WALKING_RUNNING': 'Walk/Run Distance',
    'DISTANCE_SWIMMING': 'Swim Distance',
    'DISTANCE_CYCLING': 'Cycling Distance',
    'FLIGHTS_CLIMBED': 'Flights Climbed',
    // Body composition
    'WEIGHT': 'Weight',
    'BMI': 'BMI',
    'BODY_FAT_PERCENTAGE': 'Body Fat %',
    'HEIGHT': 'Height',
    'WAIST_CIRCUMFERENCE': 'Waist Circumference',
    // Hydration
    'WATER_INTAKE': 'Water Intake',
    // Pulmonary
    'FORCED_EXPIRATORY_VOLUME': 'FEV',
    // Cardiac diagnostics
    'ELECTRODERMAL_ACTIVITY': 'Electrodermal Activity',
    'ATRIAL_FIBRILLATION_BURDEN': 'AFib Burden',
    // Blood markers
    'VITAMIN_D': 'Vitamin D (25-OH)',
    'IRON': 'Iron',
    'FERRITIN': 'Ferritin',
    'B12': 'Vitamin B12',
    'FOLATE': 'Folate',
    // Inflammation
    'CRP': 'hsCRP',
    'ESR': 'ESR',
    // Hormones
    'TESTOSTERONE': 'Testosterone',
    'CORTISOL': 'Cortisol',
    'TSH': 'TSH',
    'T3': 'T3',
    'T4': 'T4',
    // HRV alternative
    'HEART_RATE_VARIABILITY_RMSSD': 'HRV (RMSSD)',
    // Diabetes management
    'INSULIN_DELIVERY': 'Insulin Delivery',
    // Wellness
    'MINDFULNESS': 'Mindfulness',
    // Sleep
    'SLEEP_IN_BED': 'Time in Bed',
    // Nutrition - Macronutrients
    'DIETARY_ENERGY_CONSUMED': 'Calories Consumed',
    'DIETARY_CARBS_CONSUMED': 'Carbohydrates',
    'DIETARY_PROTEIN_CONSUMED': 'Protein',
    'DIETARY_FATS_CONSUMED': 'Total Fat',
    'DIETARY_FIBER': 'Fiber',
    'DIETARY_SUGAR': 'Sugar',
    'DIETARY_CAFFEINE': 'Caffeine',
    'DIETARY_FAT_SATURATED': 'Saturated Fat',
    'DIETARY_FAT_MONOUNSATURATED': 'Monounsaturated Fat',
    'DIETARY_FAT_POLYUNSATURATED': 'Polyunsaturated Fat',
    'DIETARY_CHOLESTEROL': 'Dietary Cholesterol',
    // Nutrition - Vitamins
    'DIETARY_VITAMIN_A': 'Vitamin A',
    'DIETARY_VITAMIN_C': 'Vitamin C',
    'DIETARY_VITAMIN_D': 'Vitamin D (Dietary)',
    'DIETARY_VITAMIN_E': 'Vitamin E',
    'DIETARY_VITAMIN_K': 'Vitamin K',
    'DIETARY_THIAMIN': 'Thiamin (B1)',
    'DIETARY_RIBOFLAVIN': 'Riboflavin (B2)',
    'DIETARY_NIACIN': 'Niacin (B3)',
    'DIETARY_PANTOTHENIC_ACID': 'Pantothenic Acid (B5)',
    'DIETARY_VITAMIN_B6': 'Vitamin B6',
    'DIETARY_BIOTIN': 'Biotin (B7)',
    'DIETARY_VITAMIN_B12': 'Vitamin B12 (Dietary)',
    'DIETARY_FOLATE': 'Folate (Dietary)',
    // Nutrition - Minerals
    'DIETARY_CALCIUM': 'Calcium',
    'DIETARY_IRON': 'Iron (Dietary)',
    'DIETARY_MAGNESIUM': 'Magnesium',
    'DIETARY_PHOSPHORUS': 'Phosphorus',
    'DIETARY_POTASSIUM': 'Potassium',
    'DIETARY_SODIUM': 'Sodium',
    'DIETARY_ZINC': 'Zinc',
    'DIETARY_CHROMIUM': 'Chromium',
    'DIETARY_COPPER': 'Copper',
    'DIETARY_IODINE': 'Iodine',
    'DIETARY_MANGANESE': 'Manganese',
    'DIETARY_MOLYBDENUM': 'Molybdenum',
    'DIETARY_SELENIUM': 'Selenium',
    // Other
    'CUSTOM': 'Custom',
  };

  static const _categories = {
    // Cardiovascular
    'HEART_RATE': 'Cardiovascular',
    'HEART_RATE_VARIABILITY': 'Cardiovascular',
    'BLOOD_PRESSURE_SYSTOLIC': 'Cardiovascular',
    'BLOOD_PRESSURE_DIASTOLIC': 'Cardiovascular',
    'RESTING_HEART_RATE': 'Cardiovascular',
    'WALKING_HEART_RATE': 'Cardiovascular',
    // Vitals
    'BLOOD_OXYGEN': 'Vitals',
    'RESPIRATORY_RATE': 'Vitals',
    'BODY_TEMPERATURE': 'Vitals',
    'PERIPHERAL_PERFUSION_INDEX': 'Vitals',
    // Metabolic
    'GLUCOSE': 'Metabolic',
    'HBA1C': 'Metabolic',
    'CHOLESTEROL_TOTAL': 'Metabolic',
    'CHOLESTEROL_LDL': 'Metabolic',
    'CHOLESTEROL_HDL': 'Metabolic',
    'TRIGLYCERIDES': 'Metabolic',
    // Fitness
    'STEPS': 'Fitness',
    'ACTIVE_CALORIES': 'Fitness',
    'BASAL_CALORIES': 'Fitness',
    'SLEEP_DURATION': 'Fitness',
    'SLEEP_QUALITY': 'Fitness',
    'SLEEP_DEEP': 'Fitness',
    'SLEEP_REM': 'Fitness',
    'SLEEP_LIGHT': 'Fitness',
    'SLEEP_AWAKE': 'Fitness',
    'VO2_MAX': 'Fitness',
    'EXERCISE_TIME': 'Fitness',
    'DISTANCE_WALKING_RUNNING': 'Fitness',
    'DISTANCE_SWIMMING': 'Fitness',
    'DISTANCE_CYCLING': 'Fitness',
    'FLIGHTS_CLIMBED': 'Fitness',
    // Body Composition
    'WEIGHT': 'Body Composition',
    'BMI': 'Body Composition',
    'BODY_FAT_PERCENTAGE': 'Body Composition',
    'HEIGHT': 'Body Composition',
    'WAIST_CIRCUMFERENCE': 'Body Composition',
    // Hydration
    'WATER_INTAKE': 'Hydration',
    // Pulmonary
    'FORCED_EXPIRATORY_VOLUME': 'Pulmonary',
    // Cardiac Diagnostics
    'ELECTRODERMAL_ACTIVITY': 'Cardiac Diagnostics',
    'ATRIAL_FIBRILLATION_BURDEN': 'Cardiac Diagnostics',
    // Blood markers
    'VITAMIN_D': 'Vitamins',
    'IRON': 'Vitamins',
    'FERRITIN': 'Vitamins',
    'B12': 'Vitamins',
    'FOLATE': 'Vitamins',
    // Inflammatory
    'CRP': 'Inflammatory',
    'ESR': 'Inflammatory',
    // Hormonal
    'TESTOSTERONE': 'Hormonal',
    'CORTISOL': 'Hormonal',
    'TSH': 'Hormonal',
    'T3': 'Hormonal',
    'T4': 'Hormonal',
    // HRV alternative
    'HEART_RATE_VARIABILITY_RMSSD': 'Cardiovascular',
    // Diabetes management
    'INSULIN_DELIVERY': 'Metabolic',
    // Wellness
    'MINDFULNESS': 'Wellness',
    // Sleep
    'SLEEP_IN_BED': 'Fitness',
    // Nutrition
    'DIETARY_ENERGY_CONSUMED': 'Nutrition',
    'DIETARY_CARBS_CONSUMED': 'Nutrition',
    'DIETARY_PROTEIN_CONSUMED': 'Nutrition',
    'DIETARY_FATS_CONSUMED': 'Nutrition',
    'DIETARY_FIBER': 'Nutrition',
    'DIETARY_SUGAR': 'Nutrition',
    'DIETARY_CAFFEINE': 'Nutrition',
    'DIETARY_FAT_SATURATED': 'Nutrition',
    'DIETARY_FAT_MONOUNSATURATED': 'Nutrition',
    'DIETARY_FAT_POLYUNSATURATED': 'Nutrition',
    'DIETARY_CHOLESTEROL': 'Nutrition',
    'DIETARY_VITAMIN_A': 'Nutrition',
    'DIETARY_VITAMIN_C': 'Nutrition',
    'DIETARY_VITAMIN_D': 'Nutrition',
    'DIETARY_VITAMIN_E': 'Nutrition',
    'DIETARY_VITAMIN_K': 'Nutrition',
    'DIETARY_THIAMIN': 'Nutrition',
    'DIETARY_RIBOFLAVIN': 'Nutrition',
    'DIETARY_NIACIN': 'Nutrition',
    'DIETARY_PANTOTHENIC_ACID': 'Nutrition',
    'DIETARY_VITAMIN_B6': 'Nutrition',
    'DIETARY_BIOTIN': 'Nutrition',
    'DIETARY_VITAMIN_B12': 'Nutrition',
    'DIETARY_FOLATE': 'Nutrition',
    'DIETARY_CALCIUM': 'Nutrition',
    'DIETARY_IRON': 'Nutrition',
    'DIETARY_MAGNESIUM': 'Nutrition',
    'DIETARY_PHOSPHORUS': 'Nutrition',
    'DIETARY_POTASSIUM': 'Nutrition',
    'DIETARY_SODIUM': 'Nutrition',
    'DIETARY_ZINC': 'Nutrition',
    'DIETARY_CHROMIUM': 'Nutrition',
    'DIETARY_COPPER': 'Nutrition',
    'DIETARY_IODINE': 'Nutrition',
    'DIETARY_MANGANESE': 'Nutrition',
    'DIETARY_MOLYBDENUM': 'Nutrition',
    'DIETARY_SELENIUM': 'Nutrition',
  };

  /// Static reference ranges for status display (optimal min, optimal max)
  static const referenceRanges = {
    // Cardiovascular
    'HEART_RATE': (60.0, 100.0),
    'HEART_RATE_VARIABILITY': (20.0, 100.0),
    'HEART_RATE_VARIABILITY_RMSSD': (20.0, 100.0),
    'BLOOD_PRESSURE_SYSTOLIC': (90.0, 120.0),
    'BLOOD_PRESSURE_DIASTOLIC': (60.0, 80.0),
    'RESTING_HEART_RATE': (50.0, 80.0),
    'WALKING_HEART_RATE': (70.0, 120.0),
    // Vitals
    'BLOOD_OXYGEN': (95.0, 100.0),
    'RESPIRATORY_RATE': (12.0, 20.0),
    'BODY_TEMPERATURE': (36.1, 37.2),
    // Metabolic
    'GLUCOSE': (70.0, 100.0),
    'HBA1C': (4.0, 5.6),
    'CHOLESTEROL_TOTAL': (0.0, 200.0),
    'CHOLESTEROL_LDL': (0.0, 100.0),
    'CHOLESTEROL_HDL': (60.0, 100.0),
    'TRIGLYCERIDES': (0.0, 100.0),
    // Fitness
    'VO2_MAX': (30.0, 60.0),
    // Body Composition
    'WEIGHT': (50.0, 100.0),
    'BMI': (18.5, 24.9),
    'BODY_FAT_PERCENTAGE': (10.0, 25.0),
    // Blood markers
    'VITAMIN_D': (40.0, 80.0),
    'B12': (500.0, 1000.0),
    'FERRITIN': (50.0, 200.0),
    'IRON': (60.0, 170.0),
    'FOLATE': (3.0, 20.0),
    // Inflammatory
    'CRP': (0.0, 1.0),
    'ESR': (0.0, 20.0),
    // Hormonal
    'TSH': (0.5, 2.5),
    'TESTOSTERONE': (500.0, 900.0),
    'CORTISOL': (6.0, 18.0),
    'T3': (80.0, 200.0),
    'T4': (5.0, 12.0),
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
