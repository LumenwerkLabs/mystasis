import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/models/llm_summary_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Service for generating LLM summaries and insights from the backend
class LlmService {
  late final ApiClient _apiClient;

  LlmService({ApiClient? apiClient, StorageService? storageService}) {
    final storage = storageService ?? StorageService();
    _apiClient = apiClient ??
        ApiClient(
          baseUrl: ApiEndpoints.baseUrl,
          storageService: storage,
        );
  }

  /// Generate a health summary for a patient (clinician-only)
  Future<LlmSummaryModel> generateSummary(
    String userId,
    SummaryType type,
  ) async {
    final response = await _apiClient.post(
      ApiEndpoints.llmSummary(userId),
      body: {'summaryType': type.toApiString()},
    );
    return LlmSummaryModel.fromJson(response as Map<String, dynamic>);
  }

  /// Generate a wellness nudge for a patient (patient-only)
  Future<LlmSummaryModel> generateNudge(String userId) async {
    final response = await _apiClient.get(
      ApiEndpoints.llmNudge(userId),
    );
    return LlmSummaryModel.fromJson(response as Map<String, dynamic>);
  }
}
