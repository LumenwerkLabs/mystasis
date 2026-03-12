/// Summary types matching the backend SummaryType enum
enum SummaryType {
  dailyRecap,
  weeklySummary,
  trendAnalysis,
  riskAssessment,
  wellnessNudge,
  clinicianReport;

  String toApiString() {
    switch (this) {
      case SummaryType.dailyRecap:
        return 'DAILY_RECAP';
      case SummaryType.weeklySummary:
        return 'WEEKLY_SUMMARY';
      case SummaryType.trendAnalysis:
        return 'TREND_ANALYSIS';
      case SummaryType.riskAssessment:
        return 'RISK_ASSESSMENT';
      case SummaryType.wellnessNudge:
        return 'WELLNESS_NUDGE';
      case SummaryType.clinicianReport:
        return 'CLINICIAN_REPORT';
    }
  }

  static SummaryType fromApiString(String value) {
    switch (value) {
      case 'DAILY_RECAP':
        return SummaryType.dailyRecap;
      case 'WEEKLY_SUMMARY':
        return SummaryType.weeklySummary;
      case 'TREND_ANALYSIS':
        return SummaryType.trendAnalysis;
      case 'RISK_ASSESSMENT':
        return SummaryType.riskAssessment;
      case 'WELLNESS_NUDGE':
        return SummaryType.wellnessNudge;
      case 'CLINICIAN_REPORT':
        return SummaryType.clinicianReport;
      default:
        return SummaryType.weeklySummary;
    }
  }

  String get displayName {
    switch (this) {
      case SummaryType.dailyRecap:
        return 'Daily Recap';
      case SummaryType.weeklySummary:
        return 'Weekly Summary';
      case SummaryType.trendAnalysis:
        return 'Trend Analysis';
      case SummaryType.riskAssessment:
        return 'Risk Assessment';
      case SummaryType.wellnessNudge:
        return 'Wellness Nudge';
      case SummaryType.clinicianReport:
        return 'Clinician Report';
    }
  }
}

/// Structured data extracted from LLM summaries
class StructuredData {
  final List<String>? flags;
  final List<String>? recommendations;
  final List<String>? questionsForDoctor;

  const StructuredData({
    this.flags,
    this.recommendations,
    this.questionsForDoctor,
  });

  factory StructuredData.fromJson(Map<String, dynamic> json) {
    return StructuredData(
      flags: (json['flags'] as List?)?.cast<String>(),
      recommendations: (json['recommendations'] as List?)?.cast<String>(),
      questionsForDoctor:
          (json['questionsForDoctor'] as List?)?.cast<String>(),
    );
  }

  bool get isEmpty =>
      (flags == null || flags!.isEmpty) &&
      (recommendations == null || recommendations!.isEmpty) &&
      (questionsForDoctor == null || questionsForDoctor!.isEmpty);
}

/// LLM summary response model matching the backend SummaryResponseDto
class LlmSummaryModel {
  final String id;
  final String content;
  final SummaryType type;
  final DateTime generatedAt;
  final String disclaimer;
  final StructuredData? structuredData;

  const LlmSummaryModel({
    required this.id,
    required this.content,
    required this.type,
    required this.generatedAt,
    required this.disclaimer,
    this.structuredData,
  });

  factory LlmSummaryModel.fromJson(Map<String, dynamic> json) {
    return LlmSummaryModel(
      id: json['id'] as String,
      content: json['content'] as String,
      type: SummaryType.fromApiString(json['type'] as String),
      generatedAt: DateTime.parse(json['generatedAt'] as String),
      disclaimer: json['disclaimer'] as String,
      structuredData: json['structuredData'] != null
          ? StructuredData.fromJson(
              json['structuredData'] as Map<String, dynamic>)
          : null,
    );
  }
}
