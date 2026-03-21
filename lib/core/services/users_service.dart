import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Service for fetching user data from the backend API
class UsersService {
  late final ApiClient _apiClient;

  UsersService({ApiClient? apiClient, StorageService? storageService}) {
    final storage = storageService ?? StorageService();
    _apiClient = apiClient ??
        ApiClient(
          baseUrl: ApiEndpoints.baseUrl,
          storageService: storage,
        );
  }

  /// Fetch paginated list of users, optionally filtered by role
  Future<PaginatedResponse<UserModel>> getUsers({
    int page = 1,
    int limit = 50,
    String? role,
  }) async {
    var endpoint = '${ApiEndpoints.users}?page=$page&limit=$limit';
    if (role != null) {
      endpoint += '&role=$role';
    }
    final response = await _apiClient.get(endpoint);
    return PaginatedResponse.fromJson(
      response as Map<String, dynamic>,
      UserModel.fromJson,
    );
  }

  /// Fetch a single user by ID
  Future<UserModel> getUser(String id) async {
    final response = await _apiClient.get(ApiEndpoints.userById(id));
    return UserModel.fromJson(response as Map<String, dynamic>);
  }

  /// Update user profile (firstName, lastName, password).
  /// When changing password, [currentPassword] is required for verification.
  Future<UserModel> updateUser(
    String id, {
    String? firstName,
    String? lastName,
    String? password,
    String? currentPassword,
    bool? shareWithClinician,
    bool? anonymousResearch,
  }) async {
    final body = <String, dynamic>{};
    if (firstName != null) body['firstName'] = firstName;
    if (lastName != null) body['lastName'] = lastName;
    if (password != null) body['password'] = password;
    if (currentPassword != null) body['currentPassword'] = currentPassword;
    if (shareWithClinician != null) body['shareWithClinician'] = shareWithClinician;
    if (anonymousResearch != null) body['anonymousResearch'] = anonymousResearch;

    final response =
        await _apiClient.patch(ApiEndpoints.userById(id), body: body);
    return UserModel.fromJson(response as Map<String, dynamic>);
  }

  /// Delete a user account (cascade deletes all related data).
  Future<void> deleteUser(String id) async {
    await _apiClient.delete(ApiEndpoints.userById(id));
  }
}
