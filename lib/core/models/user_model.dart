/// User model representing a user from the backend API
class UserModel {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String role;
  final String? clinicId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.firstName,
    this.lastName,
    this.clinicId,
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
      role: json['role'] as String? ?? 'patient',
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      clinicId: json['clinicId'] as String?,
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
      'role': role,
      'firstName': firstName,
      'lastName': lastName,
      'clinicId': clinicId,
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
    String? role,
    String? clinicId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      role: role ?? this.role,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      clinicId: clinicId ?? this.clinicId,
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
        other.role == role &&
        other.clinicId == clinicId;
  }

  @override
  int get hashCode {
    return Object.hash(id, email, firstName, lastName, role, clinicId);
  }

  @override
  String toString() {
    return 'UserModel(id: $id, email: $email, displayName: $displayName, role: $role)';
  }
}
