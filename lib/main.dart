import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/screens/auth/login_screen.dart';
import 'package:mystasis/screens/auth/signup_screen.dart';
import 'package:mystasis/screens/auth/forgot_password_screen.dart';
import 'package:mystasis/screens/dashboard/clinician_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MystasisApp());
}

class MystasisApp extends StatelessWidget {
  const MystasisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: 'Mystasis',
        debugShowCheckedModeBanner: false,
        theme: MystasisTheme.light(),
        home: const AuthWrapper(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/signup': (context) => const SignupScreen(),
          '/forgot-password': (context) => const ForgotPasswordScreen(),
          '/dashboard': (context) => const ClinicianDashboard(),
          '/onboarding': (context) => const Placeholder(),
          '/user': (context) => const Placeholder(),
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
    await authProvider.checkAuthStatus();
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
          return const ClinicianDashboard();
        }
        return const LoginScreen();
      },
    );
  }
}
