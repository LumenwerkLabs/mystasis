import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/users_service.dart';

/// Provider for managing patient list state in the clinician dashboard.
/// The server's /users endpoint already enforces clinic-scoped access
/// via the clinicId in the JWT token.
class PatientsProvider extends ChangeNotifier {
  final UsersService _usersService;

  List<UserModel> _patients = [];
  UserModel? _selectedPatient;
  bool _isLoading = false;
  String? _errorMessage;

  PatientsProvider({UsersService? usersService})
      : _usersService = usersService ?? UsersService();

  List<UserModel> get patients => _patients;
  UserModel? get selectedPatient => _selectedPatient;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Load patients from the backend (PATIENT role only).
  /// The server scopes results to the clinician's clinic automatically.
  Future<void> loadPatients() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _usersService.getUsers(role: 'PATIENT');
      _patients = response.data;
      // Auto-select first patient if none selected
      if (_selectedPatient == null && _patients.isNotEmpty) {
        _selectedPatient = _patients.first;
      }
      _isLoading = false;
      notifyListeners();
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to load patients.';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Select a patient by user model.
  void selectPatient(UserModel patient) {
    _selectedPatient = patient;
    notifyListeners();
  }

  /// Select a patient by ID.
  void selectPatientById(String id) {
    if (_patients.isEmpty) return;
    final patient = _patients.firstWhere(
      (p) => p.id == id,
      orElse: () => _patients.first,
    );
    _selectedPatient = patient;
    notifyListeners();
  }

  /// Add a patient to the local list (after enrollment).
  void addPatient(UserModel patient) {
    _patients = [..._patients, patient];
    _selectedPatient ??= patient;
    notifyListeners();
  }

  /// Remove a patient from the local list (after unenrollment).
  void removePatient(String patientId) {
    _patients = _patients.where((p) => p.id != patientId).toList();
    if (_selectedPatient?.id == patientId) {
      _selectedPatient = _patients.isNotEmpty ? _patients.first : null;
    }
    notifyListeners();
  }
}
