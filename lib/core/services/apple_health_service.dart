import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:health/health.dart';

/// Configuration for mapping a HealthKit data type to a Mystasis biomarker.
class _HealthTypeConfig {
  final String biomarkerType;
  final String unit;

  const _HealthTypeConfig(this.biomarkerType, this.unit);
}

/// Service for reading health data from Apple HealthKit via the `health` package.
///
/// Handles permission requests, data fetching, and mapping HealthKit types
/// to the backend's BiomarkerType enum values.
class AppleHealthService {
  static final Health _health = Health();
  static const _vo2MaxChannel = MethodChannel('com.mystasis/vo2max');

  /// Whether Apple Health is available on this platform (iOS only).
  static bool get isAvailable {
    if (kIsWeb) return false;
    return Platform.isIOS;
  }

  /// HealthKit data types that represent sleep intervals (duration-based).
  static final Set<HealthDataType> _sleepTypes = {
    HealthDataType.SLEEP_ASLEEP,
    HealthDataType.SLEEP_DEEP,
    HealthDataType.SLEEP_REM,
    HealthDataType.SLEEP_LIGHT,
    HealthDataType.SLEEP_AWAKE,
    HealthDataType.SLEEP_IN_BED,
    HealthDataType.MINDFULNESS,
  };

  /// Mapping from HealthKit data types to Mystasis biomarker types.
  static final Map<HealthDataType, _HealthTypeConfig> _typeMapping = {
    // Cardiovascular
    HealthDataType.HEART_RATE: _HealthTypeConfig('HEART_RATE', 'bpm'),
    HealthDataType.HEART_RATE_VARIABILITY_SDNN:
        _HealthTypeConfig('HEART_RATE_VARIABILITY', 'ms'),
    HealthDataType.RESTING_HEART_RATE:
        _HealthTypeConfig('RESTING_HEART_RATE', 'bpm'),
    HealthDataType.WALKING_HEART_RATE:
        _HealthTypeConfig('WALKING_HEART_RATE', 'bpm'),
    HealthDataType.BLOOD_PRESSURE_SYSTOLIC:
        _HealthTypeConfig('BLOOD_PRESSURE_SYSTOLIC', 'mmHg'),
    HealthDataType.BLOOD_PRESSURE_DIASTOLIC:
        _HealthTypeConfig('BLOOD_PRESSURE_DIASTOLIC', 'mmHg'),

    // Vitals
    HealthDataType.BLOOD_OXYGEN: _HealthTypeConfig('BLOOD_OXYGEN', '%'),
    HealthDataType.RESPIRATORY_RATE:
        _HealthTypeConfig('RESPIRATORY_RATE', 'breaths/min'),
    HealthDataType.BODY_TEMPERATURE:
        _HealthTypeConfig('BODY_TEMPERATURE', '\u00B0C'),
    HealthDataType.PERIPHERAL_PERFUSION_INDEX:
        _HealthTypeConfig('PERIPHERAL_PERFUSION_INDEX', '%'),

    // Metabolic
    HealthDataType.BLOOD_GLUCOSE: _HealthTypeConfig('GLUCOSE', 'mg/dL'),
    HealthDataType.BASAL_ENERGY_BURNED:
        _HealthTypeConfig('BASAL_CALORIES', 'kcal'),

    // Fitness
    HealthDataType.STEPS: _HealthTypeConfig('STEPS', 'count'),
    HealthDataType.ACTIVE_ENERGY_BURNED:
        _HealthTypeConfig('ACTIVE_CALORIES', 'kcal'),
    HealthDataType.EXERCISE_TIME: _HealthTypeConfig('EXERCISE_TIME', 'min'),
    HealthDataType.DISTANCE_WALKING_RUNNING:
        _HealthTypeConfig('DISTANCE_WALKING_RUNNING', 'km'),
    HealthDataType.DISTANCE_SWIMMING:
        _HealthTypeConfig('DISTANCE_SWIMMING', 'm'),
    HealthDataType.DISTANCE_CYCLING:
        _HealthTypeConfig('DISTANCE_CYCLING', 'km'),
    HealthDataType.FLIGHTS_CLIMBED:
        _HealthTypeConfig('FLIGHTS_CLIMBED', 'flights'),

    // Sleep (interval-based — duration computed from dateFrom/dateTo)
    HealthDataType.SLEEP_ASLEEP: _HealthTypeConfig('SLEEP_DURATION', 'min'),
    HealthDataType.SLEEP_DEEP: _HealthTypeConfig('SLEEP_DEEP', 'min'),
    HealthDataType.SLEEP_REM: _HealthTypeConfig('SLEEP_REM', 'min'),
    HealthDataType.SLEEP_LIGHT: _HealthTypeConfig('SLEEP_LIGHT', 'min'),
    HealthDataType.SLEEP_AWAKE: _HealthTypeConfig('SLEEP_AWAKE', 'min'),

    // Body composition
    HealthDataType.WEIGHT: _HealthTypeConfig('WEIGHT', 'kg'),
    HealthDataType.BODY_MASS_INDEX: _HealthTypeConfig('BMI', 'kg/m\u00B2'),
    HealthDataType.BODY_FAT_PERCENTAGE:
        _HealthTypeConfig('BODY_FAT_PERCENTAGE', '%'),
    HealthDataType.HEIGHT: _HealthTypeConfig('HEIGHT', 'cm'),
    HealthDataType.WAIST_CIRCUMFERENCE:
        _HealthTypeConfig('WAIST_CIRCUMFERENCE', 'cm'),

    // Hydration
    HealthDataType.WATER: _HealthTypeConfig('WATER_INTAKE', 'mL'),

    // Pulmonary
    HealthDataType.FORCED_EXPIRATORY_VOLUME:
        _HealthTypeConfig('FORCED_EXPIRATORY_VOLUME', 'L'),

    // Cardiac diagnostics
    HealthDataType.ELECTRODERMAL_ACTIVITY:
        _HealthTypeConfig('ELECTRODERMAL_ACTIVITY', '\u00B5S'),
    HealthDataType.ATRIAL_FIBRILLATION_BURDEN:
        _HealthTypeConfig('ATRIAL_FIBRILLATION_BURDEN', '%'),

    // Diabetes management
    HealthDataType.INSULIN_DELIVERY:
        _HealthTypeConfig('INSULIN_DELIVERY', 'IU'),

    // Wellness (interval-based — duration computed from dateFrom/dateTo)
    HealthDataType.MINDFULNESS: _HealthTypeConfig('MINDFULNESS', 'min'),

    // Sleep (interval-based — duration computed from dateFrom/dateTo)
    HealthDataType.SLEEP_IN_BED: _HealthTypeConfig('SLEEP_IN_BED', 'min'),

    // Nutrition - Macronutrients
    HealthDataType.DIETARY_ENERGY_CONSUMED:
        _HealthTypeConfig('DIETARY_ENERGY_CONSUMED', 'kcal'),
    HealthDataType.DIETARY_CARBS_CONSUMED:
        _HealthTypeConfig('DIETARY_CARBS_CONSUMED', 'g'),
    HealthDataType.DIETARY_PROTEIN_CONSUMED:
        _HealthTypeConfig('DIETARY_PROTEIN_CONSUMED', 'g'),
    HealthDataType.DIETARY_FATS_CONSUMED:
        _HealthTypeConfig('DIETARY_FATS_CONSUMED', 'g'),
    HealthDataType.DIETARY_FIBER: _HealthTypeConfig('DIETARY_FIBER', 'g'),
    HealthDataType.DIETARY_SUGAR: _HealthTypeConfig('DIETARY_SUGAR', 'g'),
    HealthDataType.DIETARY_CAFFEINE:
        _HealthTypeConfig('DIETARY_CAFFEINE', 'g'),
    HealthDataType.DIETARY_FAT_SATURATED:
        _HealthTypeConfig('DIETARY_FAT_SATURATED', 'g'),
    HealthDataType.DIETARY_FAT_MONOUNSATURATED:
        _HealthTypeConfig('DIETARY_FAT_MONOUNSATURATED', 'g'),
    HealthDataType.DIETARY_FAT_POLYUNSATURATED:
        _HealthTypeConfig('DIETARY_FAT_POLYUNSATURATED', 'g'),
    HealthDataType.DIETARY_CHOLESTEROL:
        _HealthTypeConfig('DIETARY_CHOLESTEROL', 'g'),

    // Nutrition - Vitamins
    HealthDataType.DIETARY_VITAMIN_A:
        _HealthTypeConfig('DIETARY_VITAMIN_A', 'g'),
    HealthDataType.DIETARY_VITAMIN_C:
        _HealthTypeConfig('DIETARY_VITAMIN_C', 'g'),
    HealthDataType.DIETARY_VITAMIN_D:
        _HealthTypeConfig('DIETARY_VITAMIN_D', 'g'),
    HealthDataType.DIETARY_VITAMIN_E:
        _HealthTypeConfig('DIETARY_VITAMIN_E', 'g'),
    HealthDataType.DIETARY_VITAMIN_K:
        _HealthTypeConfig('DIETARY_VITAMIN_K', 'g'),
    HealthDataType.DIETARY_THIAMIN:
        _HealthTypeConfig('DIETARY_THIAMIN', 'g'),
    HealthDataType.DIETARY_RIBOFLAVIN:
        _HealthTypeConfig('DIETARY_RIBOFLAVIN', 'g'),
    HealthDataType.DIETARY_NIACIN: _HealthTypeConfig('DIETARY_NIACIN', 'g'),
    HealthDataType.DIETARY_PANTOTHENIC_ACID:
        _HealthTypeConfig('DIETARY_PANTOTHENIC_ACID', 'g'),
    HealthDataType.DIETARY_VITAMIN_B6:
        _HealthTypeConfig('DIETARY_VITAMIN_B6', 'g'),
    HealthDataType.DIETARY_BIOTIN: _HealthTypeConfig('DIETARY_BIOTIN', 'g'),
    HealthDataType.DIETARY_VITAMIN_B12:
        _HealthTypeConfig('DIETARY_VITAMIN_B12', 'g'),
    HealthDataType.DIETARY_FOLATE: _HealthTypeConfig('DIETARY_FOLATE', 'g'),

    // Nutrition - Minerals
    HealthDataType.DIETARY_CALCIUM:
        _HealthTypeConfig('DIETARY_CALCIUM', 'g'),
    HealthDataType.DIETARY_IRON: _HealthTypeConfig('DIETARY_IRON', 'g'),
    HealthDataType.DIETARY_MAGNESIUM:
        _HealthTypeConfig('DIETARY_MAGNESIUM', 'g'),
    HealthDataType.DIETARY_PHOSPHORUS:
        _HealthTypeConfig('DIETARY_PHOSPHORUS', 'g'),
    HealthDataType.DIETARY_POTASSIUM:
        _HealthTypeConfig('DIETARY_POTASSIUM', 'g'),
    HealthDataType.DIETARY_SODIUM: _HealthTypeConfig('DIETARY_SODIUM', 'g'),
    HealthDataType.DIETARY_ZINC: _HealthTypeConfig('DIETARY_ZINC', 'g'),
    HealthDataType.DIETARY_CHROMIUM:
        _HealthTypeConfig('DIETARY_CHROMIUM', 'g'),
    HealthDataType.DIETARY_COPPER: _HealthTypeConfig('DIETARY_COPPER', 'g'),
    HealthDataType.DIETARY_IODINE: _HealthTypeConfig('DIETARY_IODINE', 'g'),
    HealthDataType.DIETARY_MANGANESE:
        _HealthTypeConfig('DIETARY_MANGANESE', 'g'),
    HealthDataType.DIETARY_MOLYBDENUM:
        _HealthTypeConfig('DIETARY_MOLYBDENUM', 'g'),
    HealthDataType.DIETARY_SELENIUM:
        _HealthTypeConfig('DIETARY_SELENIUM', 'g'),
  };

  /// The HealthKit data types we request read access for.
  static List<HealthDataType> get supportedTypes => _typeMapping.keys.toList();

  /// Human-readable labels for each supported data type.
  static const Map<String, String> typeLabels = {
    // Cardiovascular
    'HEART_RATE': 'Heart Rate',
    'HEART_RATE_VARIABILITY': 'HRV',
    'RESTING_HEART_RATE': 'Resting Heart Rate',
    'WALKING_HEART_RATE': 'Walking Heart Rate',
    'BLOOD_PRESSURE_SYSTOLIC': 'Blood Pressure (Sys)',
    'BLOOD_PRESSURE_DIASTOLIC': 'Blood Pressure (Dia)',
    // Vitals
    'BLOOD_OXYGEN': 'Blood Oxygen (SpO2)',
    'RESPIRATORY_RATE': 'Respiratory Rate',
    'BODY_TEMPERATURE': 'Body Temperature',
    'PERIPHERAL_PERFUSION_INDEX': 'Perfusion Index',
    // Metabolic
    'GLUCOSE': 'Blood Glucose',
    'BASAL_CALORIES': 'Basal Calories',
    // Fitness
    'STEPS': 'Steps',
    'ACTIVE_CALORIES': 'Active Calories',
    'EXERCISE_TIME': 'Exercise Time',
    'DISTANCE_WALKING_RUNNING': 'Walk/Run Distance',
    'DISTANCE_SWIMMING': 'Swim Distance',
    'DISTANCE_CYCLING': 'Cycling Distance',
    'FLIGHTS_CLIMBED': 'Flights Climbed',
    // Sleep
    'SLEEP_DURATION': 'Sleep Duration',
    'SLEEP_DEEP': 'Deep Sleep',
    'SLEEP_REM': 'REM Sleep',
    'SLEEP_LIGHT': 'Light Sleep',
    'SLEEP_AWAKE': 'Awake Time',
    // Body
    'WEIGHT': 'Weight',
    'BMI': 'BMI',
    'BODY_FAT_PERCENTAGE': 'Body Fat',
    'HEIGHT': 'Height',
    'WAIST_CIRCUMFERENCE': 'Waist',
    // Other
    'WATER_INTAKE': 'Water Intake',
    'FORCED_EXPIRATORY_VOLUME': 'FEV',
    'ELECTRODERMAL_ACTIVITY': 'EDA',
    'ATRIAL_FIBRILLATION_BURDEN': 'AFib Burden',
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
    // VO2 Max (via native platform channel — not in health package)
    'VO2_MAX': 'VO2 Max',
  };

  /// Request read-only permissions for all supported health data types.
  ///
  /// Returns `true` if the user granted access (note: iOS does not report
  /// which specific types were denied — the app gets empty results for those).
  Future<bool> requestPermissions() async {
    if (!isAvailable) return false;

    final permissions =
        supportedTypes.map((_) => HealthDataAccess.READ).toList();

    return await _health.requestAuthorization(
      supportedTypes,
      permissions: permissions,
    );
  }

  /// Check if health data permissions have been requested.
  Future<bool> hasPermissions() async {
    if (!isAvailable) return false;

    return await _health.hasPermissions(
      supportedTypes,
      permissions: supportedTypes.map((_) => HealthDataAccess.READ).toList(),
    ) ?? false;
  }

  /// Fetch health data points since the given timestamp.
  ///
  /// If [since] is null, fetches the last 7 days.
  /// Returns a list of maps matching the backend sync DTO shape.
  Future<List<Map<String, dynamic>>> fetchHealthData({DateTime? since}) async {
    if (!isAvailable) return [];

    final now = DateTime.now();
    final startDate = since ?? now.subtract(const Duration(days: 7));

    final healthData = await _health.getHealthDataFromTypes(
      types: supportedTypes,
      startTime: startDate,
      endTime: now,
    );

    // Remove duplicates (the health package can return duplicates)
    final uniqueData = _health.removeDuplicates(healthData);

    final results = <Map<String, dynamic>>[];

    for (final point in uniqueData) {
      final config = _typeMapping[point.type];
      if (config == null) continue;

      // Sleep data: calculate duration in minutes from the interval
      if (_sleepTypes.contains(point.type)) {
        final durationMinutes =
            point.dateTo.difference(point.dateFrom).inMinutes.toDouble();
        if (durationMinutes <= 0) continue;

        results.add({
          'type': config.biomarkerType,
          'value': durationMinutes,
          'unit': config.unit,
          'timestamp': point.dateFrom.toUtc().toIso8601String(),
          'source': 'apple_health',
        });
        continue;
      }

      // Numeric data points
      final numValue = point.value;
      if (numValue is! NumericHealthValue) continue;

      results.add({
        'type': config.biomarkerType,
        'value': numValue.numericValue.toDouble(),
        'unit': config.unit,
        'timestamp': point.dateFrom.toUtc().toIso8601String(),
        'source': 'apple_health',
      });
    }

    // Fetch VO2 Max via native platform channel (not in health package)
    final vo2MaxData = await _fetchVO2Max(since: startDate);
    results.addAll(vo2MaxData);

    return results;
  }

  /// Fetch VO2 Max samples via native iOS platform channel.
  ///
  /// The Flutter `health` package does not expose HKQuantityType.vo2Max,
  /// so we read it directly from HealthKit via a MethodChannel.
  static Future<List<Map<String, dynamic>>> _fetchVO2Max({
    DateTime? since,
  }) async {
    if (!isAvailable) return [];

    try {
      final result = await _vo2MaxChannel.invokeMethod<List<dynamic>>(
        'getVO2Max',
        {
          if (since != null)
            'sinceMs': since.millisecondsSinceEpoch.toDouble(),
        },
      );

      if (result == null || result.isEmpty) return [];

      return result.cast<Map<dynamic, dynamic>>().map((sample) {
        return {
          'type': 'VO2_MAX',
          'value': (sample['value'] as num).toDouble(),
          'unit': 'mL/kg/min',
          'timestamp': sample['timestamp'] as String,
          'source': 'apple_health',
        };
      }).toList();
    } on PlatformException {
      return [];
    } on MissingPluginException {
      // Platform channel not available (e.g. running on Android/web)
      return [];
    }
  }
}
