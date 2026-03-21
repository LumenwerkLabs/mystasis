/// Clinic model matching the backend Clinic entity.
class ClinicModel {
  final String id;
  final String name;
  final String? address;
  final String? phone;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ClinicModel({
    required this.id,
    required this.name,
    this.address,
    this.phone,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ClinicModel.fromJson(Map<String, dynamic> json) {
    return ClinicModel(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'phone': phone,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  ClinicModel copyWith({
    String? id,
    String? name,
    String? address,
    String? phone,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ClinicModel(
      id: id ?? this.id,
      name: name ?? this.name,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Response from POST /clinics — includes a new JWT with clinicId embedded.
class CreateClinicResponse {
  final ClinicModel clinic;
  final String accessToken;
  final String tokenType;

  const CreateClinicResponse({
    required this.clinic,
    required this.accessToken,
    required this.tokenType,
  });

  factory CreateClinicResponse.fromJson(Map<String, dynamic> json) {
    return CreateClinicResponse(
      clinic: ClinicModel.fromJson(json['clinic'] as Map<String, dynamic>),
      accessToken: json['accessToken'] as String,
      tokenType: json['tokenType'] as String,
    );
  }
}
