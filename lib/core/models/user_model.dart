/// User model representing a user from the backend API
class UserModel {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final DateTime? birthdate;
  final String role;
  final String? clinicId;
  final bool shareWithClinician;
  final bool anonymousResearch;
  final bool notifyLabResults;
  final bool notifyAppointments;
  final bool notifyHealthAlerts;
  final bool notifyWeeklyDigest;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const UserModel({
    required this.id,
    required this.email,
    this.birthdate,
    required this.role,
    this.firstName,
    this.lastName,
    this.clinicId,
    this.shareWithClinician = true,
    this.anonymousResearch = false,
    this.notifyLabResults = true,
    this.notifyAppointments = true,
    this.notifyHealthAlerts = true,
    this.notifyWeeklyDigest = false,
    this.createdAt,
    this.updatedAt,
  });

  /// Computed display name from firstName and lastName
  /// Returns null if both are null or empty
  String? get displayName {
    final first = firstName?.trim();
    final last = lastName?.trim();

    final hasFirst = first != null && first.isNotEmpty;
    final hasLast = last != null && last.isNotEmpty;

    if (hasFirst && hasLast) {
      return '$first $last';
    } else if (hasFirst) {
      return first;
    } else if (hasLast) {
      return last;
    }
    return null;
  }

  /// Check if user has patient role
  bool get isPatient => role.toLowerCase() == 'patient';

  /// Check if user has clinician role
  bool get isClinician => role.toLowerCase() == 'clinician';

  /// Create UserModel from JSON map
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      birthdate: json['birthdate'] != null
          ? DateTime.parse(json['birthdate'] as String)
          : null,
      role: json['role'] as String? ?? 'patient',
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      clinicId: json['clinicId'] as String?,
      shareWithClinician: json['shareWithClinician'] as bool? ?? true,
      anonymousResearch: json['anonymousResearch'] as bool? ?? false,
      notifyLabResults: json['notifyLabResults'] as bool? ?? true,
      notifyAppointments: json['notifyAppointments'] as bool? ?? true,
      notifyHealthAlerts: json['notifyHealthAlerts'] as bool? ?? true,
      notifyWeeklyDigest: json['notifyWeeklyDigest'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  /// Convert UserModel to JSON map
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'birthdate': birthdate?.toIso8601String(),
      'role': role,
      'firstName': firstName,
      'lastName': lastName,
      'clinicId': clinicId,
      'shareWithClinician': shareWithClinician,
      'anonymousResearch': anonymousResearch,
      'notifyLabResults': notifyLabResults,
      'notifyAppointments': notifyAppointments,
      'notifyHealthAlerts': notifyHealthAlerts,
      'notifyWeeklyDigest': notifyWeeklyDigest,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  /// Create a copy of UserModel with updated fields
  UserModel copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    DateTime? birthdate,
    String? role,
    String? clinicId,
    bool? shareWithClinician,
    bool? anonymousResearch,
    bool? notifyLabResults,
    bool? notifyAppointments,
    bool? notifyHealthAlerts,
    bool? notifyWeeklyDigest,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      birthdate: birthdate ?? this.birthdate,
      role: role ?? this.role,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      clinicId: clinicId ?? this.clinicId,
      shareWithClinician: shareWithClinician ?? this.shareWithClinician,
      anonymousResearch: anonymousResearch ?? this.anonymousResearch,
      notifyLabResults: notifyLabResults ?? this.notifyLabResults,
      notifyAppointments: notifyAppointments ?? this.notifyAppointments,
      notifyHealthAlerts: notifyHealthAlerts ?? this.notifyHealthAlerts,
      notifyWeeklyDigest: notifyWeeklyDigest ?? this.notifyWeeklyDigest,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is UserModel &&
        other.id == id &&
        other.email == email &&
        other.firstName == firstName &&
        other.lastName == lastName &&
        other.birthdate == birthdate &&
        other.role == role &&
        other.clinicId == clinicId &&
        other.shareWithClinician == shareWithClinician &&
        other.anonymousResearch == anonymousResearch &&
        other.notifyLabResults == notifyLabResults &&
        other.notifyAppointments == notifyAppointments &&
        other.notifyHealthAlerts == notifyHealthAlerts &&
        other.notifyWeeklyDigest == notifyWeeklyDigest;
  }

  @override
  int get hashCode {
    return Object.hash(
      id,
      email,
      firstName,
      lastName,
      birthdate,
      role,
      clinicId,
      shareWithClinician,
      anonymousResearch,
      notifyLabResults,
      notifyAppointments,
      notifyHealthAlerts,
      notifyWeeklyDigest,
    );
  }

  @override
  String toString() {
    return 'UserModel(id: $id, role: $role)';
  }
}
