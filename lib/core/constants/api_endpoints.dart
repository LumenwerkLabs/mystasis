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
            'API_BASE_URL must use HTTPS for non-localhost environments');
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
  static const String me = '/auth/me';

  // Health data endpoints
  static const String biomarkers = '/health-data/biomarkers';
  static const String alerts = '/alerts';

  // User endpoints
  static const String users = '/users';
}
