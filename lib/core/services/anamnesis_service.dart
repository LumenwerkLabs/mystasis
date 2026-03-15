import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/models/anamnesis_model.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/services/api_client.dart';

/// Service for persisting and retrieving anamnesis records from the backend API.
///
/// Handles CRUD operations for structured clinical anamnesis data.
/// All data is PHI and transmitted over authenticated HTTPS connections.
class AnamnesisService {
  final ApiClient _apiClient;

  AnamnesisService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Save a reviewed anamnesis to the backend.
  ///
  /// Strips `id` and `clinicianId` from the body — the backend auto-generates
  /// the ID and sets clinicianId from the JWT token.
  Future<AnamnesisModel> create(AnamnesisModel anamnesis) async {
    final body = anamnesis.toJson()
      ..remove('id')
      ..remove('clinicianId');
    final response = await _apiClient.post(
      ApiEndpoints.anamnesis,
      body: body,
    );
    return AnamnesisModel.fromJson(response as Map<String, dynamic>);
  }

  /// Fetch paginated anamneses for a patient.
  Future<PaginatedResponse<AnamnesisModel>> getForPatient(
    String patientId, {
    int page = 1,
    int limit = 20,
  }) async {
    final endpoint =
        '${ApiEndpoints.anamnesisForPatient(patientId)}?page=$page&limit=$limit';
    final response = await _apiClient.get(endpoint);
    return PaginatedResponse.fromJson(
      response as Map<String, dynamic>,
      AnamnesisModel.fromJson,
    );
  }

  /// Fetch a single anamnesis by ID.
  Future<AnamnesisModel> getById(String id) async {
    final response = await _apiClient.get(ApiEndpoints.anamnesisById(id));
    return AnamnesisModel.fromJson(response as Map<String, dynamic>);
  }

  /// Update structured fields or mark as reviewed.
  Future<AnamnesisModel> update(
    String id,
    Map<String, dynamic> fields,
  ) async {
    final response = await _apiClient.patch(
      ApiEndpoints.anamnesisById(id),
      body: fields,
    );
    return AnamnesisModel.fromJson(response as Map<String, dynamic>);
  }

  /// Delete an anamnesis record.
  Future<void> delete(String id) async {
    await _apiClient.delete(ApiEndpoints.anamnesisById(id));
  }

  /// Request a single-use ElevenLabs transcription token from the backend.
  /// The token expires after 15 minutes and is consumed on first WebSocket connection.
  /// Throws if ElevenLabs is not configured on the server (503).
  Future<String> getTranscriptionToken() async {
    final response = await _apiClient.post(
      ApiEndpoints.transcriptionToken,
      body: {},
    );
    final data = response as Map<String, dynamic>?;
    final token = data?['token'];
    if (token is! String || token.isEmpty) {
      throw Exception('Invalid token response from server');
    }
    return token;
  }
}
