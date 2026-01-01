import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/auth_provider.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _emailSent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleResetPassword() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.resetPassword(_emailController.text.trim());

    if (success && mounted) {
      setState(() => _emailSent = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: _emailSent ? _buildSuccessContent() : _buildFormContent(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccessContent() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: MystasisTheme.deepBioTeal.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.mark_email_read_outlined,
            size: 48,
            color: MystasisTheme.deepBioTeal,
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'Check your email',
          style: Theme.of(context).textTheme.headlineMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          'We sent a password reset link to\n${_emailController.text.trim()}',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: MystasisTheme.neutralGrey,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: () => Navigator.of(context).pushReplacementNamed('/auth'),
          child: const Text('Back to Sign In'),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            setState(() => _emailSent = false);
            context.read<AuthProvider>().clearError();
          },
          child: const Text('Try a different email'),
        ),
      ],
    );
  }

  Widget _buildFormContent() {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: MystasisTheme.mistGrey,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.lock_reset_outlined,
              size: 48,
              color: MystasisTheme.deepBioTeal,
            ),
          ),
          const SizedBox(height: 32),
          Text(
            'Reset password',
            style: Theme.of(context).textTheme.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            "Enter your email and we'll send you\na link to reset your password.",
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: MystasisTheme.neutralGrey,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // Error Message
          Consumer<AuthProvider>(
            builder: (context, auth, _) {
              if (auth.errorMessage != null) {
                return Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: MystasisTheme.errorRed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: MystasisTheme.errorRed,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          auth.errorMessage!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: MystasisTheme.errorRed,
                              ),
                        ),
                      ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),

          // Email Field
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _handleResetPassword(),
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter your email';
              }
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                return 'Please enter a valid email';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),

          // Reset Button
          Consumer<AuthProvider>(
            builder: (context, auth, _) {
              return ElevatedButton(
                onPressed: auth.isLoading ? null : _handleResetPassword,
                child: auth.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Send Reset Link'),
              );
            },
          ),
        ],
      ),
    );
  }
}
