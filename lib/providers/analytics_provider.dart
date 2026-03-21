import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/analytics_models.dart';
import 'package:mystasis/core/services/analytics_service.dart';
import 'package:mystasis/core/services/api_client.dart';

/// Provider for managing cohort analytics state.
class AnalyticsProvider extends ChangeNotifier {
  final AnalyticsService _analyticsService;

  CohortSummary? _summary;
  RiskDistribution? _riskDistribution;
  AlertStatistics? _alertStatistics;
  TrendSummary? _trendSummary;
  bool _isLoading = false;
  bool _isTrendLoading = false;
  String? _errorMessage;
  String _selectedBiomarkerType = 'HEART_RATE';
  String? _loadedForClinicId;

  AnalyticsProvider({AnalyticsService? analyticsService})
      : _analyticsService = analyticsService ?? AnalyticsService();

  CohortSummary? get summary => _summary;
  RiskDistribution? get riskDistribution => _riskDistribution;
  AlertStatistics? get alertStatistics => _alertStatistics;
  TrendSummary? get trendSummary => _trendSummary;
  bool get isLoading => _isLoading;
  bool get isTrendLoading => _isTrendLoading;
  String? get errorMessage => _errorMessage;
  String get selectedBiomarkerType => _selectedBiomarkerType;

  /// Load all analytics data for a clinic (summary, risk, alerts in parallel).
  Future<void> loadAnalytics(String clinicId) async {
    if (_loadedForClinicId == clinicId && _summary != null) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _analyticsService.getCohortSummary(clinicId),
        _analyticsService.getRiskDistribution(clinicId),
        _analyticsService.getAlertStatistics(clinicId),
      ]);
      _summary = results[0] as CohortSummary;
      _riskDistribution = results[1] as RiskDistribution;
      _alertStatistics = results[2] as AlertStatistics;
      _loadedForClinicId = clinicId;
      _isLoading = false;
      notifyListeners();

      // Load default trend after main data
      loadTrend(clinicId, _selectedBiomarkerType);
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load analytics');
      _errorMessage = 'Failed to load analytics.';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load trend data for a specific biomarker type.
  Future<void> loadTrend(String clinicId, String type) async {
    _isTrendLoading = true;
    notifyListeners();

    try {
      _trendSummary =
          await _analyticsService.getTrendSummary(clinicId, type);
      _isTrendLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load trend');
      _trendSummary = null;
      _isTrendLoading = false;
      notifyListeners();
    }
  }

  /// Change selected biomarker type and reload trend.
  void setSelectedBiomarkerType(String type, String clinicId) {
    _selectedBiomarkerType = type;
    notifyListeners();
    loadTrend(clinicId, type);
  }

  /// Force reload all analytics.
  Future<void> reloadAnalytics(String clinicId) async {
    _loadedForClinicId = null;
    await loadAnalytics(clinicId);
  }
}
