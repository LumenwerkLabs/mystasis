import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/health_data_service.dart';

/// Provider for managing biomarker data state
class BiomarkersProvider extends ChangeNotifier {
  final HealthDataService _healthDataService;

  List<BiomarkerModel> _biomarkers = [];
  bool _isLoading = false;
  String? _errorMessage;
  String? _loadedForUserId;

  BiomarkersProvider({HealthDataService? healthDataService})
      : _healthDataService = healthDataService ?? HealthDataService();

  List<BiomarkerModel> get biomarkers => _biomarkers;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Load biomarkers for a given user
  Future<void> loadBiomarkers(String userId) async {
    // Skip if already loaded for this user
    if (_loadedForUserId == userId && _biomarkers.isNotEmpty) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _healthDataService.getBiomarkers(
        userId,
        limit: 100,
      );
      _biomarkers = response.data;
      _loadedForUserId = userId;
      _isLoading = false;
      notifyListeners();
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to load biomarkers.';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Force reload biomarkers (ignores cache)
  Future<void> reloadBiomarkers(String userId) async {
    _loadedForUserId = null;
    await loadBiomarkers(userId);
  }

  /// Get biomarkers grouped by type (latest reading per type)
  Map<String, List<BiomarkerModel>> get groupedByType {
    final map = <String, List<BiomarkerModel>>{};
    for (final b in _biomarkers) {
      map.putIfAbsent(b.type, () => []).add(b);
    }
    return map;
  }

  /// Get the latest reading for each biomarker type
  List<BiomarkerModel> get latestByType {
    final map = <String, BiomarkerModel>{};
    for (final b in _biomarkers) {
      if (!map.containsKey(b.type) ||
          b.timestamp.isAfter(map[b.type]!.timestamp)) {
        map[b.type] = b;
      }
    }
    return map.values.toList();
  }
}
