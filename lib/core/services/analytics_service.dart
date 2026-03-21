import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/models/analytics_models.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Service for fetching cohort analytics from the backend.
class AnalyticsService {
  late final ApiClient _apiClient;

  AnalyticsService({ApiClient? apiClient, StorageService? storageService}) {
    final storage = storageService ?? StorageService();
    _apiClient = apiClient ??
        ApiClient(
          baseUrl: ApiEndpoints.baseUrl,
          storageService: storage,
        );
  }

  Future<CohortSummary> getCohortSummary(
    String clinicId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final endpoint =
        _appendDateParams(ApiEndpoints.cohortSummary(clinicId), startDate, endDate);
    final response = await _apiClient.get(endpoint);
    return CohortSummary.fromJson(response as Map<String, dynamic>);
  }

  Future<RiskDistribution> getRiskDistribution(String clinicId) async {
    final response =
        await _apiClient.get(ApiEndpoints.riskDistribution(clinicId));
    return RiskDistribution.fromJson(response as Map<String, dynamic>);
  }

  Future<AlertStatistics> getAlertStatistics(
    String clinicId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final endpoint = _appendDateParams(
        ApiEndpoints.alertStatistics(clinicId), startDate, endDate);
    final response = await _apiClient.get(endpoint);
    return AlertStatistics.fromJson(response as Map<String, dynamic>);
  }

  Future<TrendSummary> getTrendSummary(
    String clinicId,
    String type, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final endpoint = _appendDateParams(
        ApiEndpoints.trendSummary(clinicId, type), startDate, endDate);
    final response = await _apiClient.get(endpoint);
    return TrendSummary.fromJson(response as Map<String, dynamic>);
  }

  String _appendDateParams(
      String endpoint, DateTime? startDate, DateTime? endDate) {
    final params = <String>[];
    if (startDate != null) {
      params.add('startDate=${startDate.toIso8601String()}');
    }
    if (endDate != null) {
      params.add('endDate=${endDate.toIso8601String()}');
    }
    if (params.isEmpty) return endpoint;
    return '$endpoint?${params.join('&')}';
  }
}
