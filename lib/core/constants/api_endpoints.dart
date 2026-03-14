/// API endpoint constants for the Mystasis backend
class ApiEndpoints {
  /// Base URL for the API
  /// Supports environment configuration via --dart-define=API_BASE_URL=https://api.example.com
  /// HTTP is only allowed for localhost during development
  static String get baseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) {
      // Enforce HTTPS for non-localhost URLs
      if (!envUrl.startsWith('https://') &&
          !envUrl.contains('localhost') &&
          !envUrl.contains('127.0.0.1')) {
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
  static const String me = '/auth/me';

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

  // User endpoints
  static const String users = '/users';
}
