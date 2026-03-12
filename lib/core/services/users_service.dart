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
    final response = await _apiClient.get('${ApiEndpoints.users}/$id');
    return UserModel.fromJson(response as Map<String, dynamic>);
  }
}
