import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/alert_model.dart';
import 'package:mystasis/core/services/alerts_service.dart';
import 'package:mystasis/core/services/api_client.dart';

/// Provider for managing alert data state.
class AlertsProvider extends ChangeNotifier {
  final AlertsService _alertsService;

  List<AlertModel> _alerts = [];
  bool _isLoading = false;
  String? _errorMessage;
  String? _loadedForUserId;
  AlertStatus? _statusFilter;
  AlertSeverity? _severityFilter;

  AlertsProvider({AlertsService? alertsService})
      : _alertsService = alertsService ?? AlertsService();

  List<AlertModel> get alerts => _alerts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  AlertStatus? get statusFilter => _statusFilter;
  AlertSeverity? get severityFilter => _severityFilter;

  /// Alerts filtered by current status and severity filters.
  List<AlertModel> get filteredAlerts {
    var result = _alerts;
    if (_statusFilter != null) {
      result = result.where((a) => a.status == _statusFilter).toList();
    }
    if (_severityFilter != null) {
      result = result.where((a) => a.severity == _severityFilter).toList();
    }
    return result;
  }

  /// Only active alerts.
  List<AlertModel> get activeAlerts =>
      _alerts.where((a) => a.status == AlertStatus.active).toList();

  /// Count of active alerts.
  int get activeCount => activeAlerts.length;

  /// Load alerts for a given user.
  Future<void> loadAlerts(String userId) async {
    if (_loadedForUserId == userId && _alerts.isNotEmpty) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _alerts = await _alertsService.getAlerts(userId);
      _loadedForUserId = userId;
      _isLoading = false;
      notifyListeners();
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load alerts');
      _errorMessage = 'Failed to load alerts.';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Force reload alerts (ignores cache).
  Future<void> reloadAlerts(String userId) async {
    _loadedForUserId = null;
    await loadAlerts(userId);
  }

  /// Acknowledge an alert and update local state.
  Future<void> acknowledgeAlert(String id) async {
    try {
      final updated = await _alertsService.acknowledgeAlert(id);
      _updateAlertInList(updated);
    } catch (e) {
      debugPrint('Failed to acknowledge alert');
      _errorMessage = 'Failed to update alert.';
      notifyListeners();
    }
  }

  /// Dismiss an alert and update local state.
  Future<void> dismissAlert(String id) async {
    try {
      final updated = await _alertsService.dismissAlert(id);
      _updateAlertInList(updated);
    } catch (e) {
      debugPrint('Failed to dismiss alert');
      _errorMessage = 'Failed to update alert.';
      notifyListeners();
    }
  }

  /// Resolve an alert and update local state.
  Future<void> resolveAlert(String id) async {
    try {
      final updated = await _alertsService.resolveAlert(id);
      _updateAlertInList(updated);
    } catch (e) {
      debugPrint('Failed to resolve alert');
      _errorMessage = 'Failed to update alert.';
      notifyListeners();
    }
  }

  /// Set the status filter for the alerts list.
  void setStatusFilter(AlertStatus? status) {
    _statusFilter = status;
    notifyListeners();
  }

  /// Set the severity filter for the alerts list.
  void setSeverityFilter(AlertSeverity? severity) {
    _severityFilter = severity;
    notifyListeners();
  }

  /// Clear state when switching patients.
  void clearForPatient() {
    _alerts = [];
    _loadedForUserId = null;
    _errorMessage = null;
    _statusFilter = null;
    _severityFilter = null;
    notifyListeners();
  }

  void _updateAlertInList(AlertModel updated) {
    final index = _alerts.indexWhere((a) => a.id == updated.id);
    if (index != -1) {
      _alerts = List.from(_alerts)..[index] = updated;
    }
    _errorMessage = null;
    notifyListeners();
  }
}
