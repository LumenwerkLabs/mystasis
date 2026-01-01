import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/firebase_options.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/screens/auth/login_screen.dart';
import 'package:mystasis/screens/auth/signup_screen.dart';
import 'package:mystasis/screens/auth/forgot_password_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
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
          '/auth': (context) => const LoginScreen(),
          '/signup': (context) => const SignupScreen(),
          '/forgot-password': (context) => const ForgotPasswordScreen(),
          '/dashboard': (context) => const DashboardPlaceholder(),
          '/onboarding': (context) => const Placeholder(),
          '/biomarkers': (context) => const Placeholder(),
          '/settings': (context) => const Placeholder(),
          '/user': (context) => const Placeholder(),
        },
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isAuthenticated) {
          return const DashboardPlaceholder();
        }
        return const LoginScreen();
      },
    );
  }
}

class DashboardPlaceholder extends StatelessWidget {
  const DashboardPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => auth.signOut(),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.check_circle_outline,
              size: 64,
              color: MystasisTheme.deepBioTeal,
            ),
            const SizedBox(height: 24),
            Text(
              'Welcome, ${auth.user?.displayName ?? 'User'}!',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              auth.user?.email ?? '',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
            ),
            const SizedBox(height: 32),
            Text(
              'Dashboard coming soon...',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
