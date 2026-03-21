import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/clinic_model.dart';
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/clinics_service.dart';

/// Provider for managing clinic state (CRUD + patient enrollment).
class ClinicsProvider extends ChangeNotifier {
  final ClinicsService _clinicsService;

  ClinicModel? _clinic;
  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;

  ClinicsProvider({ClinicsService? clinicsService})
      : _clinicsService = clinicsService ?? ClinicsService();

  ClinicModel? get clinic => _clinic;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get errorMessage => _errorMessage;

  /// Load the current clinician's clinic.
  Future<void> loadClinic() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _clinic = await _clinicsService.getMyClinic();
      _isLoading = false;
      notifyListeners();
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load clinic');
      _errorMessage = 'Failed to load clinic.';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create a new clinic. Returns the response (caller handles token swap).
  Future<CreateClinicResponse> createClinic({
    required String name,
    String? address,
    String? phone,
  }) async {
    _isSaving = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _clinicsService.create(
        name: name,
        address: address,
        phone: phone,
      );
      _clinic = response.clinic;
      _isSaving = false;
      notifyListeners();
      return response;
    } on NetworkException {
      _isSaving = false;
      _errorMessage = 'Unable to connect. Please check your network.';
      notifyListeners();
      rethrow;
    } catch (e) {
      debugPrint('Failed to create clinic');
      _isSaving = false;
      _errorMessage = 'Failed to create clinic.';
      notifyListeners();
      rethrow;
    }
  }

  /// Update clinic details.
  Future<void> updateClinic({
    String? name,
    String? address,
    String? phone,
  }) async {
    if (_clinic == null) return;

    _isSaving = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _clinic = await _clinicsService.updateClinic(
        _clinic!.id,
        name: name,
        address: address,
        phone: phone,
      );
      _isSaving = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to update clinic');
      _isSaving = false;
      _errorMessage = 'Failed to update clinic.';
      notifyListeners();
    }
  }

  /// Enroll a patient in the current clinic.
  Future<UserModel?> enrollPatient(String patientId) async {
    if (_clinic == null) return null;

    _errorMessage = null;
    try {
      final patient =
          await _clinicsService.enrollPatient(_clinic!.id, patientId);
      notifyListeners();
      return patient;
    } on ConflictException {
      _errorMessage = 'This patient is already enrolled in a clinic.';
      notifyListeners();
      return null;
    } catch (e) {
      debugPrint('Failed to enroll patient');
      _errorMessage = 'Failed to enroll patient.';
      notifyListeners();
      return null;
    }
  }

  /// Unenroll a patient from the current clinic.
  Future<void> unenrollPatient(String patientId) async {
    if (_clinic == null) return;

    _errorMessage = null;
    try {
      await _clinicsService.unenrollPatient(_clinic!.id, patientId);
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to unenroll patient');
      _errorMessage = 'Failed to unenroll patient.';
      notifyListeners();
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
