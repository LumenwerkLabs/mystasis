import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/llm_summary_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/llm_service.dart';

/// Provider for managing LLM-generated insights state
class InsightsProvider extends ChangeNotifier {
  final LlmService _llmService;

  // Clinician summaries state
  List<LlmSummaryModel> _summaries = [];
  bool _isGenerating = false;
  String? _errorMessage;

  // Patient nudge state
  LlmSummaryModel? _currentNudge;
  bool _isLoadingNudge = false;
  String? _nudgeError;

  InsightsProvider({LlmService? llmService})
      : _llmService = llmService ?? LlmService();

  List<LlmSummaryModel> get summaries => _summaries;
  LlmSummaryModel? get latestSummary =>
      _summaries.isNotEmpty ? _summaries.first : null;
  bool get isGenerating => _isGenerating;
  String? get errorMessage => _errorMessage;

  LlmSummaryModel? get currentNudge => _currentNudge;
  bool get isLoadingNudge => _isLoadingNudge;
  String? get nudgeError => _nudgeError;

  /// Generate a new summary for a patient
  Future<void> generateSummary(String userId, SummaryType type) async {
    _isGenerating = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final summary = await _llmService.generateSummary(userId, type);
      _summaries.insert(0, summary);
      _isGenerating = false;
      notifyListeners();
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isGenerating = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to generate insights. Please try again.';
      _isGenerating = false;
      notifyListeners();
    }
  }

  /// Generate a wellness nudge for the current patient
  Future<void> generateNudge(String userId) async {
    _isLoadingNudge = true;
    _nudgeError = null;
    notifyListeners();

    try {
      _currentNudge = await _llmService.generateNudge(userId);
      _isLoadingNudge = false;
      notifyListeners();
    } on NetworkException {
      _nudgeError = 'Unable to connect. Please check your network.';
      _isLoadingNudge = false;
      notifyListeners();
    } catch (e) {
      _nudgeError = 'Failed to generate insights. Please try again.';
      _isLoadingNudge = false;
      notifyListeners();
    }
  }

  /// Clear nudge state
  void clearNudge() {
    _currentNudge = null;
    _nudgeError = null;
    notifyListeners();
  }

  /// Clear summaries when switching patients
  void clearSummaries() {
    _summaries = [];
    _errorMessage = null;
    notifyListeners();
  }
}
