import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Service for fetching health data from the backend API
class HealthDataService {
  late final ApiClient _apiClient;

  HealthDataService({ApiClient? apiClient, StorageService? storageService}) {
    final storage = storageService ?? StorageService();
    _apiClient = apiClient ??
        ApiClient(
          baseUrl: ApiEndpoints.baseUrl,
          storageService: storage,
        );
  }

  /// Fetch paginated biomarkers for a user
  Future<PaginatedResponse<BiomarkerModel>> getBiomarkers(
    String userId, {
    int page = 1,
    int limit = 20,
    String? type,
  }) async {
    var endpoint = '${ApiEndpoints.biomarkersForUser(userId)}?page=$page&limit=$limit';
    if (type != null) {
      endpoint += '&type=$type';
    }
    final response = await _apiClient.get(endpoint);
    return PaginatedResponse.fromJson(
      response as Map<String, dynamic>,
      BiomarkerModel.fromJson,
    );
  }

  /// Fetch the latest reading for a specific biomarker type
  Future<BiomarkerModel?> getLatestBiomarker(String userId, String type) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.latestBiomarker(userId, type),
      );
      if (response == null) return null;
      return BiomarkerModel.fromJson(response as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Fetch biomarker trend data for a type within a date range
  Future<List<BiomarkerModel>> getTrend(
    String userId,
    String type,
    DateTime startDate,
    DateTime endDate,
  ) async {
    final start = startDate.toIso8601String();
    final end = endDate.toIso8601String();
    final response = await _apiClient.get(
      '${ApiEndpoints.biomarkerTrend(userId, type)}?startDate=$start&endDate=$end',
    );
    if (response is List) {
      return response
          .map((item) => BiomarkerModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
