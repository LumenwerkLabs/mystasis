/// Represents a computed homeostasis score with category breakdowns.
class HomeostasisScore {
  /// Overall score from 0–100.
  final double overallScore;

  /// Human-readable status: "Excellent", "Good", "Fair", "Needs Attention".
  final String status;

  /// Category breakdowns keyed by category name.
  final Map<String, CategoryScore> categories;

  /// Whether any scoreable biomarker data was available.
  final bool hasData;

  const HomeostasisScore({
    required this.overallScore,
    required this.status,
    required this.categories,
    required this.hasData,
  });

  /// Empty score returned when no data is available.
  static const empty = HomeostasisScore(
    overallScore: 0,
    status: 'No Data',
    categories: {},
    hasData: false,
  );
}

/// Score for a single biomarker category (e.g., Metabolic, Cardiovascular).
class CategoryScore {
  final String name;

  /// Score from 0–100.
  final double score;

  /// Number of biomarkers that contributed to this score.
  final int biomarkerCount;

  const CategoryScore({
    required this.name,
    required this.score,
    required this.biomarkerCount,
  });
}
