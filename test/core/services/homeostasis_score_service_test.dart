import 'package:flutter_test/flutter_test.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/services/homeostasis_score_service.dart';

BiomarkerModel _biomarker(String type, double value) {
  return BiomarkerModel(
    id: 'test-$type',
    userId: 'u1',
    type: type,
    value: value,
    unit: 'test',
    timestamp: DateTime(2026, 3, 21),
  );
}

void main() {
  late HomeostasisScoreService service;

  setUp(() {
    service = HomeostasisScoreService();
  });

  group('HomeostasisScoreService', () {
    group('empty/no data', () {
      test('returns hasData=false for empty list', () {
        final score = service.compute([]);
        expect(score.hasData, isFalse);
        expect(score.categories, isEmpty);
      });

      test('returns hasData=false when no biomarkers have reference ranges', () {
        final score = service.compute([
          _biomarker('STEPS', 8000),
          _biomarker('ACTIVE_CALORIES', 500),
        ]);
        expect(score.hasData, isFalse);
      });

      test('returns hasData=false when biomarkers are not in scored categories',
          () {
        final score = service.compute([
          _biomarker('VO2_MAX', 45), // Fitness category, not scored
        ]);
        expect(score.hasData, isFalse);
      });
    });

    group('two-sided ranges (symmetric)', () {
      test('scores optimal biomarkers near 100', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 85), // midpoint of 70-100
          _biomarker('HBA1C', 4.8), // midpoint of 4.0-5.6
        ]);
        expect(score.hasData, isTrue);
        expect(score.overallScore, greaterThan(90));
        expect(score.categories['Metabolic']!.score, greaterThan(90));
        expect(score.categories['Metabolic']!.biomarkerCount, equals(2));
      });

      test('scores critical biomarkers near 0', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 200), // far above 70-100
          _biomarker('HBA1C', 10), // far above 4.0-5.6
        ]);
        expect(score.hasData, isTrue);
        expect(score.overallScore, lessThan(20));
      });

      test('biomarker at exact midpoint scores 100', () {
        final score = service.compute([_biomarker('GLUCOSE', 85)]);
        expect(score.categories['Metabolic']!.score, equals(100));
      });

      test('biomarker at range edge scores 100 (within range)', () {
        // GLUCOSE range 70-100 — value at min edge is still within range
        final score = service.compute([_biomarker('GLUCOSE', 70)]);
        expect(score.categories['Metabolic']!.score, equals(100));
      });

      test('biomarker slightly outside range scores less than 100', () {
        // GLUCOSE range 70-100 — value just below min
        final score = service.compute([_biomarker('GLUCOSE', 65)]);
        expect(score.categories['Metabolic']!.score, lessThan(100));
        expect(score.categories['Metabolic']!.score, greaterThan(50));
      });

      test('CHOLESTEROL_HDL uses two-sided scoring', () {
        // HDL range 60-100, value at midpoint (80) scores 100
        final atMid = service.compute([_biomarker('CHOLESTEROL_HDL', 80)]);
        expect(atMid.categories['Metabolic']!.score, equals(100));

        // HDL below range scores less than 100
        final below = service.compute([_biomarker('CHOLESTEROL_HDL', 40)]);
        expect(below.categories['Metabolic']!.score, lessThan(100));
      });
    });

    group('one-sided ranges (lower is better)', () {
      test('CRP of 0.0 scores 100 (optimal)', () {
        final score = service.compute([_biomarker('CRP', 0.0)]);
        expect(score.categories['Inflammatory']!.score, equals(100));
      });

      test('CRP within range scores 100', () {
        final score = service.compute([_biomarker('CRP', 0.5)]);
        expect(score.categories['Inflammatory']!.score, equals(100));
      });

      test('CRP at max boundary scores 100', () {
        final score = service.compute([_biomarker('CRP', 1.0)]);
        expect(score.categories['Inflammatory']!.score, equals(100));
      });

      test('CRP slightly above range scores between 0 and 100', () {
        // CRP range (0, 1), value 1.5: overshoot = 0.5/1.0 = 0.5, score = 50
        final score = service.compute([_biomarker('CRP', 1.5)]);
        expect(score.categories['Inflammatory']!.score, lessThan(100));
        expect(score.categories['Inflammatory']!.score, greaterThan(0));
      });

      test('CRP far above range scores 0', () {
        // CRP range (0, 1), value 2.0: overshoot = 1.0/1.0 = 1.0, score = 0
        final score = service.compute([_biomarker('CRP', 2.0)]);
        expect(score.categories['Inflammatory']!.score, equals(0));
      });

      test('LDL of 0 scores 100 (lower is better)', () {
        // CHOLESTEROL_LDL range is (0, 100)
        final score = service.compute([_biomarker('CHOLESTEROL_LDL', 50)]);
        expect(score.categories['Metabolic']!.score, equals(100));
      });
    });

    group('category computation', () {
      test('computes mixed category scores correctly', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 85), // Metabolic: optimal
          _biomarker('RESTING_HEART_RATE', 90), // Cardiovascular: borderline
          _biomarker('CRP', 0.5), // Inflammatory: optimal (one-sided)
        ]);
        expect(score.hasData, isTrue);
        expect(score.categories.length, equals(3));
        expect(score.categories['Metabolic']!.score, greaterThan(80));
        expect(score.categories['Cardiovascular']!.score, lessThan(80));
        expect(score.categories['Inflammatory']!.score, equals(100));
      });

      test('overall is average of present categories only', () {
        final score = service.compute([_biomarker('GLUCOSE', 85)]);
        expect(score.hasData, isTrue);
        expect(score.categories.length, equals(1));
        expect(
            score.overallScore, equals(score.categories['Metabolic']!.score));
      });

      test('includes all four categories when data is available', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 85),
          _biomarker('HEART_RATE', 75),
          _biomarker('CRP', 0.5),
          _biomarker('TSH', 1.5),
        ]);
        expect(score.categories.length, equals(4));
      });
    });

    group('status labels', () {
      test('Excellent for high scores', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 85),
          _biomarker('HBA1C', 4.8),
          _biomarker('CHOLESTEROL_HDL', 80),
        ]);
        expect(score.status, equals('Excellent'));
      });

      test('Needs Attention for low scores', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 200),
          _biomarker('HBA1C', 10),
        ]);
        expect(score.status, equals('Needs Attention'));
      });
    });

    group('edge cases', () {
      test('NaN biomarker value is excluded', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 85), // valid
          _biomarker('HBA1C', double.nan), // invalid
        ]);
        expect(score.hasData, isTrue);
        // Only GLUCOSE should contribute
        expect(score.categories['Metabolic']!.biomarkerCount, equals(1));
      });

      test('Infinity biomarker value is excluded', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 85),
          _biomarker('HBA1C', double.infinity),
        ]);
        expect(score.hasData, isTrue);
        expect(score.categories['Metabolic']!.biomarkerCount, equals(1));
      });

      test('negative biomarker value is excluded', () {
        final score = service.compute([
          _biomarker('GLUCOSE', 85),
          _biomarker('HBA1C', -5.0),
        ]);
        expect(score.hasData, isTrue);
        expect(score.categories['Metabolic']!.biomarkerCount, equals(1));
      });

      test('extremely large value scores 0', () {
        final score = service.compute([_biomarker('GLUCOSE', 999999)]);
        expect(score.categories['Metabolic']!.score, equals(0));
      });

      test('all biomarkers invalid returns hasData=false', () {
        final score = service.compute([
          _biomarker('GLUCOSE', double.nan),
          _biomarker('CRP', -1.0),
        ]);
        expect(score.hasData, isFalse);
      });
    });
  });
}
