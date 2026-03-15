/// Grounding verification status for an AI-extracted field.
/// Used during clinician review to flag potential hallucinations.
enum GroundingStatus { grounded, partial, ungrounded, empty }

/// Grounding result for a single field or array item.
class FieldGrounding {
  final GroundingStatus status;
  final double score;
  final List<String> unmatchedTerms;

  const FieldGrounding({
    required this.status,
    required this.score,
    this.unmatchedTerms = const [],
  });

  factory FieldGrounding.fromMap(Map<String, dynamic> map) {
    return FieldGrounding(
      status: GroundingStatus.values.firstWhere(
        (e) => e.name == (map['status'] as String? ?? 'empty'),
        orElse: () => GroundingStatus.empty,
      ),
      score: (map['score'] as num?)?.toDouble() ?? 0.0,
      unmatchedTerms: AnamnesisModel._castStringList(map['unmatchedTerms']),
    );
  }
}

/// Grounding report for the entire anamnesis.
/// Ephemeral — used during review, not persisted to the backend.
class AnamnesisGrounding {
  final GroundingStatus overallStatus;
  final FieldGrounding chiefComplaint;
  final FieldGrounding historyOfPresentIllness;
  final List<FieldGrounding> pastMedicalHistory;
  final List<FieldGrounding> currentMedications;
  final List<FieldGrounding> allergies;
  final List<FieldGrounding> familyHistory;
  final List<FieldGrounding> reviewOfSystems;
  final List<FieldGrounding> socialHistory;

  const AnamnesisGrounding({
    required this.overallStatus,
    required this.chiefComplaint,
    required this.historyOfPresentIllness,
    required this.pastMedicalHistory,
    required this.currentMedications,
    required this.allergies,
    required this.familyHistory,
    required this.reviewOfSystems,
    required this.socialHistory,
  });

  factory AnamnesisGrounding.fromMap(Map<String, dynamic> map) {
    return AnamnesisGrounding(
      overallStatus: GroundingStatus.values.firstWhere(
        (e) => e.name == (map['overallStatus'] as String? ?? 'empty'),
        orElse: () => GroundingStatus.empty,
      ),
      chiefComplaint: FieldGrounding.fromMap(
          Map<String, dynamic>.from(map['chiefComplaint'] as Map? ?? {})),
      historyOfPresentIllness: FieldGrounding.fromMap(
          Map<String, dynamic>.from(
              map['historyOfPresentIllness'] as Map? ?? {})),
      pastMedicalHistory: _castFieldGroundingList(map['pastMedicalHistory']),
      currentMedications: _castFieldGroundingList(map['currentMedications']),
      allergies: _castFieldGroundingList(map['allergies']),
      familyHistory: _castFieldGroundingList(map['familyHistory']),
      reviewOfSystems: _castFieldGroundingList(map['reviewOfSystems']),
      socialHistory: _castFieldGroundingList(map['socialHistory']),
    );
  }

  static List<FieldGrounding> _castFieldGroundingList(dynamic value) {
    if (value is List) {
      return value
          .map((e) =>
              FieldGrounding.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
    }
    return [];
  }
}

/// Structured anamnesis data extracted from a voice-transcribed consultation.
/// All structured fields are AI-generated from the raw transcript and require
/// clinician review before being considered accurate.
class AnamnesisModel {
  final String? id;
  final String patientId;
  final String rawTranscript;
  final String chiefComplaint;
  final String historyOfPresentIllness;
  final List<String> pastMedicalHistory;
  final List<String> currentMedications;
  final List<String> allergies;
  final List<String> familyHistory;
  final List<String> reviewOfSystems;
  final List<String> socialHistory;
  final DateTime recordedAt;
  final String? clinicianId;
  final bool isReviewed;

  /// Grounding verification report from on-device structuring.
  /// Null for records loaded from the backend (grounding is ephemeral).
  final AnamnesisGrounding? grounding;

  const AnamnesisModel({
    this.id,
    required this.patientId,
    required this.rawTranscript,
    required this.chiefComplaint,
    required this.historyOfPresentIllness,
    required this.pastMedicalHistory,
    required this.currentMedications,
    required this.allergies,
    required this.familyHistory,
    required this.reviewOfSystems,
    required this.socialHistory,
    required this.recordedAt,
    this.clinicianId,
    this.isReviewed = false,
    this.grounding,
  });

  /// Create from the structured output map returned by the native channel.
  factory AnamnesisModel.fromStructuredOutput({
    required String patientId,
    required String rawTranscript,
    required Map<String, dynamic> structured,
    String? clinicianId,
  }) {
    AnamnesisGrounding? grounding;
    if (structured['grounding'] != null) {
      grounding = AnamnesisGrounding.fromMap(
          Map<String, dynamic>.from(structured['grounding'] as Map));
    }

    return AnamnesisModel(
      patientId: patientId,
      rawTranscript: rawTranscript,
      chiefComplaint: structured['chiefComplaint'] as String? ?? '',
      historyOfPresentIllness:
          structured['historyOfPresentIllness'] as String? ?? '',
      pastMedicalHistory:
          _castStringList(structured['pastMedicalHistory']),
      currentMedications:
          _castStringList(structured['currentMedications']),
      allergies: _castStringList(structured['allergies']),
      familyHistory: _castStringList(structured['familyHistory']),
      reviewOfSystems: _castStringList(structured['reviewOfSystems']),
      socialHistory: _castStringList(structured['socialHistory']),
      recordedAt: DateTime.now(),
      clinicianId: clinicianId,
      grounding: grounding,
    );
  }

  factory AnamnesisModel.fromJson(Map<String, dynamic> json) {
    return AnamnesisModel(
      id: json['id'] as String?,
      patientId: json['patientId'] as String,
      rawTranscript: json['rawTranscript'] as String,
      chiefComplaint: json['chiefComplaint'] as String? ?? '',
      historyOfPresentIllness:
          json['historyOfPresentIllness'] as String? ?? '',
      pastMedicalHistory: _castStringList(json['pastMedicalHistory']),
      currentMedications: _castStringList(json['currentMedications']),
      allergies: _castStringList(json['allergies']),
      familyHistory: _castStringList(json['familyHistory']),
      reviewOfSystems: _castStringList(json['reviewOfSystems']),
      socialHistory: _castStringList(json['socialHistory']),
      recordedAt: DateTime.parse(json['recordedAt'] as String),
      clinicianId: json['clinicianId'] as String?,
      isReviewed: json['isReviewed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'patientId': patientId,
      'rawTranscript': rawTranscript,
      'chiefComplaint': chiefComplaint,
      'historyOfPresentIllness': historyOfPresentIllness,
      'pastMedicalHistory': pastMedicalHistory,
      'currentMedications': currentMedications,
      'allergies': allergies,
      'familyHistory': familyHistory,
      'reviewOfSystems': reviewOfSystems,
      'socialHistory': socialHistory,
      'recordedAt': recordedAt.toIso8601String(),
      if (clinicianId != null) 'clinicianId': clinicianId,
      'isReviewed': isReviewed,
    };
  }

  AnamnesisModel copyWith({
    String? id,
    String? patientId,
    String? rawTranscript,
    String? chiefComplaint,
    String? historyOfPresentIllness,
    List<String>? pastMedicalHistory,
    List<String>? currentMedications,
    List<String>? allergies,
    List<String>? familyHistory,
    List<String>? reviewOfSystems,
    List<String>? socialHistory,
    DateTime? recordedAt,
    String? clinicianId,
    bool? isReviewed,
    AnamnesisGrounding? grounding,
  }) {
    return AnamnesisModel(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      rawTranscript: rawTranscript ?? this.rawTranscript,
      chiefComplaint: chiefComplaint ?? this.chiefComplaint,
      historyOfPresentIllness:
          historyOfPresentIllness ?? this.historyOfPresentIllness,
      pastMedicalHistory: pastMedicalHistory ?? this.pastMedicalHistory,
      currentMedications: currentMedications ?? this.currentMedications,
      allergies: allergies ?? this.allergies,
      familyHistory: familyHistory ?? this.familyHistory,
      reviewOfSystems: reviewOfSystems ?? this.reviewOfSystems,
      socialHistory: socialHistory ?? this.socialHistory,
      recordedAt: recordedAt ?? this.recordedAt,
      clinicianId: clinicianId ?? this.clinicianId,
      isReviewed: isReviewed ?? this.isReviewed,
      grounding: grounding ?? this.grounding,
    );
  }

  /// Safely cast a dynamic list to List<String>.
  static List<String> _castStringList(dynamic value) {
    if (value is List) {
      return value.map((e) => e.toString()).toList();
    }
    return [];
  }
}
