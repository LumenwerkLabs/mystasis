class UserModel {
  final String uid;
  final String email;
  final String? displayName;
  final DateTime? dateOfBirth;

  const UserModel({
    required this.uid,
    required this.email,
    this.displayName,
    this.dateOfBirth,
  });

  UserModel copyWith({
    String? uid,
    String? email,
    String? displayName,
    DateTime? dateOfBirth,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
    );
  }
}
