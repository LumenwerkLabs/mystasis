import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/models/clinic_model.dart';
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Service for clinic management and patient enrollment.
class ClinicsService {
  late final ApiClient _apiClient;

  ClinicsService({ApiClient? apiClient, StorageService? storageService}) {
    final storage = storageService ?? StorageService();
    _apiClient = apiClient ??
        ApiClient(
          baseUrl: ApiEndpoints.baseUrl,
          storageService: storage,
        );
  }

  /// Create a new clinic. Returns the clinic and a new JWT with clinicId.
  Future<CreateClinicResponse> create({
    required String name,
    String? address,
    String? phone,
  }) async {
    final body = <String, dynamic>{'name': name};
    if (address != null) body['address'] = address;
    if (phone != null) body['phone'] = phone;

    final response = await _apiClient.post(ApiEndpoints.clinics, body: body);
    return CreateClinicResponse.fromJson(response as Map<String, dynamic>);
  }

  /// Get the current clinician's clinic (returns first from list, or null).
  Future<ClinicModel?> getMyClinic() async {
    final response = await _apiClient.get(ApiEndpoints.clinics);
    if (response is List && response.isNotEmpty) {
      return ClinicModel.fromJson(response.first as Map<String, dynamic>);
    }
    return null;
  }

  /// Get a clinic by ID.
  Future<ClinicModel> getClinic(String id) async {
    final response = await _apiClient.get(ApiEndpoints.clinicById(id));
    return ClinicModel.fromJson(response as Map<String, dynamic>);
  }

  /// Update clinic details.
  Future<ClinicModel> updateClinic(
    String id, {
    String? name,
    String? address,
    String? phone,
  }) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (address != null) body['address'] = address;
    if (phone != null) body['phone'] = phone;

    final response =
        await _apiClient.patch(ApiEndpoints.clinicById(id), body: body);
    return ClinicModel.fromJson(response as Map<String, dynamic>);
  }

  /// Delete a clinic.
  Future<void> deleteClinic(String id) async {
    await _apiClient.delete(ApiEndpoints.clinicById(id));
  }

  /// Get all patients enrolled in a clinic.
  Future<List<UserModel>> getClinicPatients(String clinicId) async {
    final response =
        await _apiClient.get(ApiEndpoints.clinicPatients(clinicId));
    if (response is List) {
      return response
          .map((item) => UserModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Enroll a patient in a clinic.
  Future<UserModel> enrollPatient(String clinicId, String patientId) async {
    final response = await _apiClient
        .post(ApiEndpoints.enrollPatient(clinicId, patientId));
    return UserModel.fromJson(response as Map<String, dynamic>);
  }

  /// Unenroll a patient from a clinic.
  Future<UserModel> unenrollPatient(String clinicId, String patientId) async {
    final response = await _apiClient
        .delete(ApiEndpoints.enrollPatient(clinicId, patientId));
    return UserModel.fromJson(response as Map<String, dynamic>);
  }
}
