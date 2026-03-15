import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/anamnesis_model.dart';
import 'package:mystasis/core/services/anamnesis_channel.dart';
import 'package:mystasis/core/services/anamnesis_service.dart';

/// Recording session states for the anamnesis workflow.
enum AnamnesisSessionState {
  idle,
  requesting,
  recording,
  stopping,
  structuring,
  reviewing,
  saved,
  error,
}

/// Provider managing the anamnesis recording, transcription, and structuring workflow.
class AnamnesisProvider extends ChangeNotifier {
  final AnamnesisChannel _channel;
  final AnamnesisService? _anamnesisService;

  AnamnesisSessionState _state = AnamnesisSessionState.idle;
  String _liveTranscript = '';
  String _finalTranscript = '';
  AnamnesisModel? _structuredAnamnesis;
  String? _errorMessage;
  AnamnesisAvailability? _availability;
  StreamSubscription? _transcriptSubscription;
  List<AnamnesisModel> _savedAnamneses = [];
  Duration _recordingDuration = Duration.zero;
  Timer? _durationTimer;
  String? _currentPatientId;
  bool _isLoadingHistory = false;

  AnamnesisProvider({
    AnamnesisChannel? channel,
    AnamnesisService? anamnesisService,
  })  : _channel = channel ?? AnamnesisChannel(),
        _anamnesisService = anamnesisService;

  // Getters
  AnamnesisSessionState get state => _state;
  String get liveTranscript => _liveTranscript;
  String get finalTranscript => _finalTranscript;
  AnamnesisModel? get structuredAnamnesis => _structuredAnamnesis;
  String? get errorMessage => _errorMessage;
  AnamnesisAvailability? get availability => _availability;
  bool get isRecording => _state == AnamnesisSessionState.recording;
  bool get isProcessing => _state == AnamnesisSessionState.structuring;
  bool get hasResult => _state == AnamnesisSessionState.reviewing;
  List<AnamnesisModel> get savedAnamneses => _savedAnamneses;
  Duration get recordingDuration => _recordingDuration;
  bool get isLoadingHistory => _isLoadingHistory;

  /// Check if the feature is available on this device.
  Future<void> checkAvailability() async {
    _availability = await _channel.checkAvailability();
    notifyListeners();
  }

  /// Start a new anamnesis recording session.
  Future<void> startRecording({
    String locale = 'en-US',
    String? patientId,
  }) async {
    _state = AnamnesisSessionState.requesting;
    _errorMessage = null;
    _liveTranscript = '';
    _finalTranscript = '';
    _structuredAnamnesis = null;
    _currentPatientId = patientId;
    notifyListeners();

    // Request microphone permission
    final granted = await _channel.requestMicrophonePermission();
    if (!granted) {
      _state = AnamnesisSessionState.error;
      _errorMessage =
          'Microphone access is required for anamnesis recording. '
          'Please enable it in System Settings > Privacy & Security > Microphone.';
      notifyListeners();
      return;
    }

    try {
      await _channel.startTranscription(locale: locale);

      // Listen to live transcript updates
      _transcriptSubscription = _channel.transcriptStream.listen(
        (update) {
          _liveTranscript = update.text;
          notifyListeners();
        },
        onError: (error) {
          _state = AnamnesisSessionState.error;
          _errorMessage = 'Transcription error: $error';
          notifyListeners();
        },
      );

      _state = AnamnesisSessionState.recording;
      _recordingDuration = Duration.zero;
      _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        _recordingDuration += const Duration(seconds: 1);
        notifyListeners();
      });
      notifyListeners();
    } catch (e) {
      _state = AnamnesisSessionState.error;
      _errorMessage = 'Failed to start recording: $e';
      notifyListeners();
    }
  }

  /// Stop recording and get the final transcript.
  Future<void> stopRecording() async {
    _state = AnamnesisSessionState.stopping;
    _durationTimer?.cancel();
    notifyListeners();

    try {
      await _transcriptSubscription?.cancel();
      _transcriptSubscription = null;
      _channel.resetTranscriptStream();
      _finalTranscript = await _channel.stopTranscription();

      // Automatically proceed to structuring
      await _structureTranscript();
    } catch (e) {
      _state = AnamnesisSessionState.error;
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  /// Structure the transcript using Foundation Models.
  Future<void> _structureTranscript() async {
    _state = AnamnesisSessionState.structuring;
    notifyListeners();

    try {
      final structured =
          await _channel.structureAnamnesis(_finalTranscript);
      _structuredAnamnesis = AnamnesisModel.fromStructuredOutput(
        patientId: _currentPatientId ?? '',
        rawTranscript: _finalTranscript,
        structured: structured,
      );
      _state = AnamnesisSessionState.reviewing;
      notifyListeners();
    } catch (e) {
      _state = AnamnesisSessionState.error;
      _errorMessage = 'Failed to structure anamnesis: $e';
      notifyListeners();
    }
  }

  /// Re-structure the transcript (retry after failure).
  Future<void> reStructure() async {
    if (_finalTranscript.isEmpty) return;
    await _structureTranscript();
  }

  /// Save the reviewed anamnesis to the backend.
  /// Falls back to local-only storage if no AnamnesisService is configured.
  Future<void> saveAnamnesis(String patientId, String clinicianId) async {
    if (_structuredAnamnesis == null) return;

    final toSave = _structuredAnamnesis!.copyWith(
      patientId: patientId,
      clinicianId: clinicianId,
      isReviewed: true,
    );

    if (_anamnesisService != null) {
      try {
        final saved = await _anamnesisService.create(toSave);
        _savedAnamneses.insert(0, saved);
      } catch (e) {
        _state = AnamnesisSessionState.error;
        _errorMessage = 'Failed to save anamnesis: $e';
        notifyListeners();
        return;
      }
    } else {
      _savedAnamneses.insert(0, toSave);
    }

    _state = AnamnesisSessionState.saved;
    notifyListeners();
  }

  /// Load saved anamneses for a patient from the backend.
  Future<void> loadAnamneses(String patientId) async {
    if (_anamnesisService == null) return;

    _isLoadingHistory = true;
    notifyListeners();

    try {
      final response = await _anamnesisService.getForPatient(patientId);
      _savedAnamneses = response.data;
    } catch (e) {
      _errorMessage = 'Failed to load anamnesis history: $e';
    }

    _isLoadingHistory = false;
    notifyListeners();
  }

  /// Delete an anamnesis record from the backend.
  Future<void> deleteAnamnesis(String id) async {
    if (_anamnesisService == null) return;

    try {
      await _anamnesisService.delete(id);
      _savedAnamneses.removeWhere((a) => a.id == id);
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to delete anamnesis: $e';
      notifyListeners();
    }
  }

  /// Reset to idle state for a new session.
  void resetSession() {
    _state = AnamnesisSessionState.idle;
    _liveTranscript = '';
    _finalTranscript = '';
    _structuredAnamnesis = null;
    _errorMessage = null;
    _currentPatientId = null;
    _recordingDuration = Duration.zero;
    _durationTimer?.cancel();
    notifyListeners();
  }

  /// Clear saved anamneses when switching patients.
  void clearForPatient() {
    _savedAnamneses = [];
    resetSession();
  }

  @override
  void dispose() {
    _transcriptSubscription?.cancel();
    _durationTimer?.cancel();
    super.dispose();
  }
}
