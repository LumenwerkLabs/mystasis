import 'package:flutter/foundation.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/apple_health_service.dart';
import 'package:mystasis/core/services/health_data_service.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Sync status for the Apple Health sync flow.
enum SyncStatus {
  idle,
  requestingPermissions,
  fetching,
  uploading,
  done,
  error,
}

/// Provider managing the Apple Health sync flow state.
class HealthSyncProvider extends ChangeNotifier {
  final AppleHealthService _appleHealthService;
  final HealthDataService _healthDataService;
  final StorageService _storageService;

  bool _isAvailable = false;
  bool _hasPermissions = false;
  SyncStatus _status = SyncStatus.idle;
  String? _errorMessage;
  DateTime? _lastSyncTimestamp;
  int _lastSyncCount = 0;

  /// Maximum biomarkers per API request (backend limit).
  static const int _batchSize = 1000;

  HealthSyncProvider({
    AppleHealthService? appleHealthService,
    HealthDataService? healthDataService,
    StorageService? storageService,
  })  : _appleHealthService = appleHealthService ?? AppleHealthService(),
        _healthDataService = healthDataService ?? HealthDataService(),
        _storageService = storageService ?? StorageService();

  bool get isAvailable => _isAvailable;
  bool get hasPermissions => _hasPermissions;
  SyncStatus get status => _status;
  String? get errorMessage => _errorMessage;
  DateTime? get lastSyncTimestamp => _lastSyncTimestamp;
  int get lastSyncCount => _lastSyncCount;
  bool get isSyncing =>
      _status == SyncStatus.fetching || _status == SyncStatus.uploading;

  /// Initialize: check platform availability and load last sync timestamp.
  Future<void> initialize() async {
    _isAvailable = AppleHealthService.isAvailable;

    if (_isAvailable) {
      _hasPermissions = await _appleHealthService.hasPermissions();
      _lastSyncTimestamp = await _storageService.getLastHealthSync();
    }

    notifyListeners();
  }

  /// Request HealthKit permissions.
  Future<bool> requestPermissions() async {
    _status = SyncStatus.requestingPermissions;
    _errorMessage = null;
    notifyListeners();

    try {
      _hasPermissions = await _appleHealthService.requestPermissions();
      _status = SyncStatus.idle;
      notifyListeners();
      return _hasPermissions;
    } catch (e) {
      _status = SyncStatus.error;
      _errorMessage = 'Failed to request permissions.';
      notifyListeners();
      return false;
    }
  }

  /// Run the full sync flow: fetch from HealthKit, upload to backend.
  Future<void> syncHealthData() async {
    _errorMessage = null;
    _lastSyncCount = 0;

    // Fetch from HealthKit
    _status = SyncStatus.fetching;
    notifyListeners();

    List<Map<String, dynamic>> healthData;
    try {
      healthData = await _appleHealthService.fetchHealthData(
        since: _lastSyncTimestamp,
      );
      if (kDebugMode) {
        debugPrint('[HealthSync] Fetched ${healthData.length} records from HealthKit');
      }
    } catch (e, stack) {
      if (kDebugMode) {
        debugPrint('[HealthSync] Failed to fetch health data: $e\n$stack');
      }
      _status = SyncStatus.error;
      _errorMessage = 'Failed to read health data from your device.';
      notifyListeners();
      return;
    }

    if (healthData.isEmpty) {
      _lastSyncCount = 0;
      _status = SyncStatus.done;
      notifyListeners();
      return;
    }

    // Upload in batches
    _status = SyncStatus.uploading;
    notifyListeners();

    int totalSynced = 0;
    try {
      for (var i = 0; i < healthData.length; i += _batchSize) {
        final end =
            (i + _batchSize < healthData.length) ? i + _batchSize : healthData.length;
        final batch = healthData.sublist(i, end);

        if (kDebugMode) {
          debugPrint('[HealthSync] Uploading batch ${i ~/ _batchSize + 1}: ${batch.length} records');
        }
        final result = await _healthDataService.syncBiomarkers(batch);
        totalSynced += (result['count'] as num?)?.toInt() ?? batch.length;
      }

      _lastSyncCount = totalSynced;
      _lastSyncTimestamp = DateTime.now();
      await _storageService.saveLastHealthSync(_lastSyncTimestamp!);
      _status = SyncStatus.done;
      notifyListeners();
    } on UnauthorizedException {
      _status = SyncStatus.error;
      _errorMessage = 'Session expired. Please log in again.';
      notifyListeners();
    } on NetworkException catch (_) {
      _status = SyncStatus.error;
      _errorMessage = 'Unable to connect. Please check your network.';
      notifyListeners();
    } catch (e, stack) {
      if (kDebugMode) {
        debugPrint('[HealthSync] Upload failed: $e\n$stack');
      }
      _status = SyncStatus.error;
      _errorMessage = 'Failed to upload health data. Please try again.';
      notifyListeners();
    }
  }

  /// Reset to idle state (e.g., after dismissing results).
  void reset() {
    _status = SyncStatus.idle;
    _errorMessage = null;
    notifyListeners();
  }
}
