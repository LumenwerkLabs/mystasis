import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/constants/api_endpoints.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/auth_service.dart';
import 'package:mystasis/core/services/health_data_service.dart';
import 'package:mystasis/core/services/llm_service.dart';
import 'package:mystasis/core/services/storage_service.dart';
import 'package:mystasis/core/services/users_service.dart';
import 'package:mystasis/core/services/clinics_service.dart';
import 'package:mystasis/core/services/analytics_service.dart';
import 'package:mystasis/core/services/alerts_service.dart';
import 'package:mystasis/core/services/anamnesis_service.dart';
import 'package:mystasis/providers/alerts_provider.dart';
import 'package:mystasis/providers/analytics_provider.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/clinics_provider.dart';
import 'package:mystasis/providers/patients_provider.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';
import 'package:mystasis/providers/health_sync_provider.dart';
import 'package:mystasis/providers/anamnesis_provider.dart';
import 'package:mystasis/screens/auth/login_screen.dart';
import 'package:mystasis/screens/auth/signup_screen.dart';
import 'package:mystasis/screens/auth/forgot_password_screen.dart';
import 'package:mystasis/screens/dashboard/clinician_dashboard.dart';
import 'package:mystasis/screens/health_sync/apple_health_sync_screen.dart';
import 'package:mystasis/screens/mobile_home_screen.dart';
import 'package:mystasis/screens/insights/patient_insights_screen.dart';
import 'package:mystasis/screens/profile/patient_profile_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Single shared instances — all providers and services use the same
  // StorageService and ApiClient, ensuring consistent token management.
  final storageService = StorageService();
  final apiClient = ApiClient(
    baseUrl: ApiEndpoints.baseUrl,
    storageService: storageService,
  );
  final authService = AuthService(
    apiClient: apiClient,
    storageService: storageService,
  );
  final healthDataService = HealthDataService(apiClient: apiClient);
  final usersService = UsersService(apiClient: apiClient);
  final clinicsService = ClinicsService(apiClient: apiClient);
  final analyticsService = AnalyticsService(apiClient: apiClient);
  final llmService = LlmService(apiClient: apiClient);
  final alertsService = AlertsService(apiClient: apiClient);
  final anamnesisService = AnamnesisService(apiClient: apiClient);

  // Wire session expiry: when token refresh fails, force logout.
  // AuthService.forceLogout() emits null auth state → AuthWrapper shows LoginScreen.
  apiClient.setSessionExpiredCallback(() {
    authService.forceLogout().catchError((_) {});
  });

  runApp(MystasisApp(
    storageService: storageService,
    authService: authService,
    healthDataService: healthDataService,
    usersService: usersService,
    clinicsService: clinicsService,
    llmService: llmService,
    alertsService: alertsService,
    analyticsService: analyticsService,
    anamnesisService: anamnesisService,
  ));
}

class MystasisApp extends StatelessWidget {
  final StorageService storageService;
  final AuthService authService;
  final HealthDataService healthDataService;
  final UsersService usersService;
  final ClinicsService clinicsService;
  final LlmService llmService;
  final AlertsService alertsService;
  final AnalyticsService analyticsService;
  final AnamnesisService anamnesisService;

  const MystasisApp({
    super.key,
    required this.storageService,
    required this.authService,
    required this.healthDataService,
    required this.usersService,
    required this.clinicsService,
    required this.llmService,
    required this.alertsService,
    required this.analyticsService,
    required this.anamnesisService,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<StorageService>.value(value: storageService),
        ChangeNotifierProvider(
            create: (_) => AuthProvider(
                  authService: authService,
                  usersService: usersService,
                  storageService: storageService,
                )),
        ChangeNotifierProvider(
            create: (_) =>
                PatientsProvider(usersService: usersService)),
        ChangeNotifierProvider(
            create: (_) =>
                ClinicsProvider(clinicsService: clinicsService)),
        ChangeNotifierProvider(
            create: (_) =>
                BiomarkersProvider(healthDataService: healthDataService)),
        ChangeNotifierProvider(
            create: (_) => InsightsProvider(llmService: llmService)),
        ChangeNotifierProvider(
            create: (_) => AlertsProvider(alertsService: alertsService)),
        ChangeNotifierProvider(
            create: (_) =>
                AnalyticsProvider(analyticsService: analyticsService)),
        ChangeNotifierProvider(
            create: (_) => HealthSyncProvider(
                  healthDataService: healthDataService,
                  storageService: storageService,
                )),
        ChangeNotifierProvider(
            create: (_) =>
                AnamnesisProvider(anamnesisService: anamnesisService)),
      ],
      child: MaterialApp(
        title: 'Mystasis',
        debugShowCheckedModeBanner: false,
        theme: MystasisTheme.light(),
        home: const AuthWrapper(),
        onGenerateRoute: (settings) {
          switch (settings.name) {
            // Public routes
            case '/login':
              return MaterialPageRoute(
                builder: (_) => const LoginScreen(),
                settings: settings,
              );
            case '/signup':
              return MaterialPageRoute(
                builder: (_) => const SignupScreen(),
                settings: settings,
              );
            case '/forgot-password':
              return MaterialPageRoute(
                builder: (_) => const ForgotPasswordScreen(),
                settings: settings,
              );
            // Clinician-only route
            case '/dashboard':
              return MaterialPageRoute(
                builder: (_) => const _ClinicianRouteGuard(),
                settings: settings,
              );
            // Authenticated routes
            case '/health-sync':
              return MaterialPageRoute(
                builder: (_) => const _AuthRouteGuard(
                  child: AppleHealthSyncScreen(),
                ),
                settings: settings,
              );
            case '/insights':
              return MaterialPageRoute(
                builder: (_) => const _AuthRouteGuard(
                  child: PatientInsightsScreen(),
                ),
                settings: settings,
              );
            case '/profile':
              return MaterialPageRoute(
                builder: (_) => const _AuthRouteGuard(
                  child: PatientProfileScreen(),
                ),
                settings: settings,
              );
            case '/onboarding':
              return MaterialPageRoute(
                builder: (_) => const _AuthRouteGuard(child: Placeholder()),
                settings: settings,
              );
            case '/user':
              return MaterialPageRoute(
                builder: (_) => const _AuthRouteGuard(child: Placeholder()),
                settings: settings,
              );
            default:
              return MaterialPageRoute(
                builder: (_) => const AuthWrapper(),
                settings: settings,
              );
          }
        },
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _isCheckingAuth = true;
  bool _biometricPromptHandled = false;

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final authProvider = context.read<AuthProvider>();
    // Skip API call if already authenticated (e.g., navigating after login/signup)
    if (!authProvider.isAuthenticated) {
      await authProvider.checkAuthStatus();
    }
    if (mounted) {
      setState(() => _isCheckingAuth = false);
    }
  }

  Future<void> _promptBiometricIfNeeded(AuthProvider auth) async {
    if (_biometricPromptHandled) return;
    _biometricPromptHandled = true;

    final shouldPrompt = await auth.shouldPromptForBiometric();
    if (!shouldPrompt || !mounted) return;

    final label = await auth.getBiometricLabel();

    if (!mounted) return;
    final enabled = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              label == 'Face ID' ? Icons.face : Icons.fingerprint,
              color: MystasisTheme.deepBioTeal,
            ),
            const SizedBox(width: 12),
            Text('Enable $label?'),
          ],
        ),
        content: Text(
          'Would you like to use $label to sign in next time? '
          'You can change this later in your profile settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not Now'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: MystasisTheme.deepBioTeal,
            ),
            child: Text('Enable $label'),
          ),
        ],
      ),
    );

    await auth.markBiometricPromptShown();
    if (enabled == true) {
      await auth.setBiometricEnabled(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isCheckingAuth) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (!auth.isAuthenticated) {
          _biometricPromptHandled = false;
          return const LoginScreen();
        }

        // Prompt biometric enrollment on first login
        if (!_biometricPromptHandled && !kIsWeb) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _promptBiometricIfNeeded(auth);
          });
        }

        // Clinicians get the dashboard on web and desktop
        if (auth.user!.isClinician) return const ClinicianDashboard();

        if (kIsWeb) {
          return const WebPatientNotSupportedScreen();
        }

        // Mobile: patient users
        return const MobileHomeScreen();
      },
    );
  }
}

/// Route guard that requires authentication.
/// Redirects to LoginScreen if not authenticated.
class _AuthRouteGuard extends StatelessWidget {
  final Widget child;

  const _AuthRouteGuard({required this.child});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) return const LoginScreen();
    return child;
  }
}

/// Route guard that requires clinician role.
/// Redirects to LoginScreen if not authenticated,
/// or the not-supported screen if authenticated but not a clinician.
class _ClinicianRouteGuard extends StatelessWidget {
  const _ClinicianRouteGuard();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) return const LoginScreen();
    if (!auth.user!.isClinician) return const WebPatientNotSupportedScreen();
    return const ClinicianDashboard();
  }
}

/// Static page shown when a patient accesses the web app.
/// The web app is clinician-only; patients use the mobile app.
class WebPatientNotSupportedScreen extends StatelessWidget {
  const WebPatientNotSupportedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.phone_iphone,
                size: 64,
                color: MystasisTheme.deepBioTeal.withValues(alpha: 0.6),
              ),
              const SizedBox(height: 24),
              Text(
                'Mystasis is designed for mobile',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Download the Mystasis app on your phone to view your '
                'biomarker trends, sync health data, and receive '
                'personalized wellness insights.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: MystasisTheme.neutralGrey,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              OutlinedButton(
                onPressed: () => context.read<AuthProvider>().signOut(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: MystasisTheme.deepBioTeal,
                  side: const BorderSide(color: MystasisTheme.deepBioTeal),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                ),
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
