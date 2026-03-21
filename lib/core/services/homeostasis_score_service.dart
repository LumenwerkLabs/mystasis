import 'dart:math' as math;

import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/models/homeostasis_score_model.dart';

/// Pure computation service for homeostasis scores.
///
/// Computes a 0–100 score for each of four health categories
/// (Metabolic, Cardiovascular, Inflammatory, Hormonal) based on
/// how close the latest biomarker readings are to their optimal
/// reference ranges. No state, no API calls.
///
/// IMPORTANT: This score is a statistical summary, not a clinical
/// assessment. Individual biomarker values should always be reviewed
/// independently by clinicians.
class HomeostasisScoreService {
  /// The four categories that contribute to the homeostasis score.
  static const scoredCategories = [
    'Metabolic',
    'Cardiovascular',
    'Inflammatory',
    'Hormonal',
  ];

  /// Compute the homeostasis score from the latest biomarker readings.
  HomeostasisScore compute(List<BiomarkerModel> latestByType) {
    final categoryScores = <String, CategoryScore>{};

    for (final category in scoredCategories) {
      // Filter to biomarkers in this category that have reference ranges
      // and valid (finite, non-negative) values
      final biomarkers = latestByType
          .where((b) =>
              b.category == category &&
              BiomarkerModel.referenceRanges.containsKey(b.type) &&
              b.value.isFinite &&
              b.value >= 0)
          .toList();

      if (biomarkers.isEmpty) continue;

      // Average the per-biomarker scores, filtering out any non-finite results
      final scores =
          biomarkers.map(_scoreBiomarker).where((s) => s.isFinite).toList();
      if (scores.isEmpty) continue;

      final avgScore = scores.reduce((a, b) => a + b) / scores.length;

      categoryScores[category] = CategoryScore(
        name: category,
        score: avgScore,
        biomarkerCount: scores.length,
      );
    }

    if (categoryScores.isEmpty) {
      return HomeostasisScore.empty;
    }

    // Overall = equal-weight average of present categories
    final overall = categoryScores.values
            .map((c) => c.score)
            .reduce((a, b) => a + b) /
        categoryScores.length;

    return HomeostasisScore(
      overallScore: overall,
      status: _statusLabel(overall),
      categories: categoryScores,
      hasData: true,
    );
  }

  /// Compute a continuous 0–100 score for a single biomarker.
  ///
  /// Uses two models depending on range type:
  /// - **One-sided ranges** (min == 0, e.g., CRP, LDL): lower is better,
  ///   score 100 for any value within range, penalize proportionally above.
  /// - **Two-sided ranges** (e.g., glucose, heart rate): score based on
  ///   distance from optimal midpoint.
  double _scoreBiomarker(BiomarkerModel biomarker) {
    if (!biomarker.value.isFinite || biomarker.value < 0) return double.nan;

    final range = BiomarkerModel.referenceRanges[biomarker.type];
    if (range == null) return 50;

    final (min, max) = range;

    // One-sided ranges (lower is better): score 100 for values within range
    if (min == 0) {
      if (max == 0) return biomarker.value == 0 ? 100 : 0;
      if (biomarker.value <= max) return 100;
      final overshoot = (biomarker.value - max) / max;
      return math.max(0, 100 - overshoot * 100);
    }

    // Two-sided ranges: score 100 within range, penalize outside
    final rangeHalf = (max - min) / 2;
    if (rangeHalf == 0) return biomarker.value == min ? 100 : 0;

    if (biomarker.value >= min && biomarker.value <= max) return 100;

    final nearest = biomarker.value < min ? min : max;
    final deviation = (biomarker.value - nearest).abs() / rangeHalf;
    return math.max(0, 100 - deviation * 50);
  }

  String _statusLabel(double score) {
    if (score >= 85) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 45) return 'Fair';
    return 'Needs Attention';
  }
}
