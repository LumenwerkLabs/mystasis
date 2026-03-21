import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/models/alert_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Service for fetching and managing alerts from the backend API.
class AlertsService {
  late final ApiClient _apiClient;

  AlertsService({ApiClient? apiClient, StorageService? storageService}) {
    final storage = storageService ?? StorageService();
    _apiClient = apiClient ??
        ApiClient(
          baseUrl: ApiEndpoints.baseUrl,
          storageService: storage,
        );
  }

  /// Fetch alerts for a user with optional filters.
  Future<List<AlertModel>> getAlerts(
    String userId, {
    int page = 1,
    int limit = 50,
    AlertStatus? status,
    AlertSeverity? severity,
  }) async {
    var endpoint =
        '${ApiEndpoints.alertsForUser(userId)}?page=$page&limit=$limit';
    if (status != null) {
      endpoint += '&status=${status.apiValue}';
    }
    if (severity != null) {
      endpoint += '&severity=${severity.apiValue}';
    }
    final response = await _apiClient.get(endpoint);
    if (response is List) {
      return response
          .map((item) => AlertModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Fetch only active alerts for a user.
  Future<List<AlertModel>> getActiveAlerts(String userId) async {
    final response =
        await _apiClient.get(ApiEndpoints.activeAlertsForUser(userId));
    if (response is List) {
      return response
          .map((item) => AlertModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Fetch a single alert by ID.
  Future<AlertModel> getAlert(String id) async {
    final response = await _apiClient.get(ApiEndpoints.alertDetail(id));
    return AlertModel.fromJson(response as Map<String, dynamic>);
  }

  /// Create a new alert (clinician only).
  Future<AlertModel> createAlert({
    required String userId,
    required String type,
    required String severity,
    required String title,
    required String message,
    double? value,
    double? threshold,
  }) async {
    final body = <String, dynamic>{
      'userId': userId,
      'type': type,
      'severity': severity,
      'title': title,
      'message': message,
    };
    if (value != null) body['value'] = value;
    if (threshold != null) body['threshold'] = threshold;

    final response = await _apiClient.post(ApiEndpoints.alerts, body: body);
    return AlertModel.fromJson(response as Map<String, dynamic>);
  }

  /// Mark an alert as acknowledged.
  Future<AlertModel> acknowledgeAlert(String id) async {
    final response =
        await _apiClient.patch(ApiEndpoints.acknowledgeAlert(id));
    return AlertModel.fromJson(response as Map<String, dynamic>);
  }

  /// Mark an alert as dismissed.
  Future<AlertModel> dismissAlert(String id) async {
    final response = await _apiClient.patch(ApiEndpoints.dismissAlert(id));
    return AlertModel.fromJson(response as Map<String, dynamic>);
  }

  /// Mark an alert as resolved (clinician only).
  Future<AlertModel> resolveAlert(String id) async {
    final response = await _apiClient.patch(ApiEndpoints.resolveAlert(id));
    return AlertModel.fromJson(response as Map<String, dynamic>);
  }
}
