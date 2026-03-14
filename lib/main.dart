import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/patients_provider.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';
import 'package:mystasis/providers/health_sync_provider.dart';
import 'package:mystasis/screens/auth/login_screen.dart';
import 'package:mystasis/screens/auth/signup_screen.dart';
import 'package:mystasis/screens/auth/forgot_password_screen.dart';
import 'package:mystasis/screens/dashboard/clinician_dashboard.dart';
import 'package:mystasis/screens/health_sync/apple_health_sync_screen.dart';
import 'package:mystasis/screens/mobile_home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MystasisApp());
}

class MystasisApp extends StatelessWidget {
  const MystasisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => PatientsProvider()),
        ChangeNotifierProvider(create: (_) => BiomarkersProvider()),
        ChangeNotifierProvider(create: (_) => InsightsProvider()),
        ChangeNotifierProvider(create: (_) => HealthSyncProvider()),
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
        if (auth.isAuthenticated) {
          // Clinician on web → clinician dashboard, all others → mobile home
          if (kIsWeb && auth.user!.isClinician) {
            return const ClinicianDashboard();
          }
          return const MobileHomeScreen();
        }
        return const LoginScreen();
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
/// or MobileHomeScreen if authenticated but not a clinician.
class _ClinicianRouteGuard extends StatelessWidget {
  const _ClinicianRouteGuard();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) return const LoginScreen();
    if (!auth.user!.isClinician) return const MobileHomeScreen();
    return const ClinicianDashboard();
  }
}
