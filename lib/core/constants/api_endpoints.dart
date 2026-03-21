/// API endpoint constants for the Mystasis backend
class ApiEndpoints {
  /// Base URL for the API
  /// Supports environment configuration via flutter run -d chrome --web-port=3000 --dart-define=API_BASE_URL=https://api.mystasis.lumenwerklabs.com
  /// HTTP is only allowed for localhost during development
  static String get baseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) {
      // Enforce HTTPS for non-localhost URLs
      final uri = Uri.parse(envUrl);
      final isLocal = uri.host == 'localhost' || uri.host == '127.0.0.1';
      if (!envUrl.startsWith('https://') && !isLocal) {
        throw StateError(
          'API_BASE_URL must use HTTPS for non-localhost environments',
        );
      }
      return envUrl;
    }
    // Development fallback
    return 'http://localhost:3000';
  }

  /// Whether the app is running in production mode
  static bool get isProduction =>
      const String.fromEnvironment('API_BASE_URL').isNotEmpty;

  // Auth endpoints
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String refresh = '/auth/refresh';
  static const String me = '/auth/me';
  static const String verifyPassword = '/auth/verify-password';

  // Health data endpoints
  static const String biomarkers = '/health-data/biomarkers';
  static const String syncMe = '/health-data/sync/me';
  static const String alerts = '/alerts';

  // Parameterized health data helpers
  static String biomarkersForUser(String userId) =>
      '/health-data/biomarkers/$userId';
  static String latestBiomarker(String userId, String type) =>
      '/health-data/biomarkers/$userId/latest/$type';
  static String biomarkerTrend(String userId, String type) =>
      '/health-data/biomarkers/$userId/trend/$type';

  // LLM endpoints
  static String llmSummary(String userId) => '/llm/summary/$userId';
  static String llmNudge(String userId) => '/llm/nudge/$userId';

  // Anamnesis endpoints
  static const String anamnesis = '/anamnesis';
  static const String transcriptionToken = '/anamnesis/transcription-token';
  static String anamnesisForPatient(String patientId) =>
      '/anamnesis/patient/$patientId';
  static String anamnesisById(String id) => '/anamnesis/$id';

  // Analytics endpoints
  static String cohortSummary(String clinicId) =>
      '/analytics/cohort/$clinicId/summary';
  static String riskDistribution(String clinicId) =>
      '/analytics/cohort/$clinicId/risk-distribution';
  static String alertStatistics(String clinicId) =>
      '/analytics/cohort/$clinicId/alerts';
  static String trendSummary(String clinicId, String type) =>
      '/analytics/cohort/$clinicId/trends/$type';

  // Clinic endpoints
  static const String clinics = '/clinics';
  static String clinicById(String id) => '/clinics/$id';
  static String clinicPatients(String clinicId) =>
      '/clinics/$clinicId/patients';
  static String enrollPatient(String clinicId, String patientId) =>
      '/clinics/$clinicId/patients/$patientId';

  // Alert endpoints
  static String alertsForUser(String userId) => '/alerts/$userId';
  static String activeAlertsForUser(String userId) => '/alerts/$userId/active';
  static String alertDetail(String id) => '/alerts/detail/$id';
  static String acknowledgeAlert(String id) => '/alerts/$id/acknowledge';
  static String dismissAlert(String id) => '/alerts/$id/dismiss';
  static String resolveAlert(String id) => '/alerts/$id/resolve';

  // User endpoints
  static const String users = '/users';
  static String userById(String id) => '/users/$id';
}
