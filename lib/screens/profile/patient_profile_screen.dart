import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/auth_provider.dart';

/// Patient profile screen for viewing/editing profile, changing password,
/// and deleting account.
class PatientProfileScreen extends StatefulWidget {
  const PatientProfileScreen({super.key});

  @override
  State<PatientProfileScreen> createState() => _PatientProfileScreenState();
}

class _PatientProfileScreenState extends State<PatientProfileScreen> {
  bool _isEditingName = false;
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  String? _passwordError;
  bool _passwordChanged = false;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _currentPasswordController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _startEditingName() {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;
    _firstNameController.text = user.firstName ?? '';
    _lastNameController.text = user.lastName ?? '';
    setState(() => _isEditingName = true);
  }

  Future<void> _saveName() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.updateProfile(
      firstName: _firstNameController.text.trim().isNotEmpty
          ? _firstNameController.text.trim()
          : null,
      lastName: _lastNameController.text.trim().isNotEmpty
          ? _lastNameController.text.trim()
          : null,
    );
    if (success && mounted) {
      setState(() => _isEditingName = false);
    }
  }

  Future<void> _changePassword() async {
    final currentPassword = _currentPasswordController.text;
    final password = _passwordController.text;
    final confirm = _confirmController.text;

    if (currentPassword.isEmpty) {
      setState(
          () => _passwordError = 'Please enter your current password.');
      return;
    }
    if (password.length < 8) {
      setState(
          () => _passwordError = 'Password must be at least 8 characters.');
      return;
    }
    if (!RegExp(r'(?=.*[a-zA-Z])(?=.*[0-9])').hasMatch(password)) {
      setState(() => _passwordError =
          'Must contain at least one letter and one number.');
      return;
    }
    if (password != confirm) {
      setState(() => _passwordError = 'Passwords do not match.');
      return;
    }

    setState(() {
      _passwordError = null;
      _passwordChanged = false;
    });
    final success =
        await context.read<AuthProvider>().changePassword(currentPassword, password);
    if (success && mounted) {
      _currentPasswordController.clear();
      _passwordController.clear();
      _confirmController.clear();
      setState(() => _passwordChanged = true);
    }
  }

  Future<void> _deleteAccount() async {
    final deletePasswordController = TextEditingController();
    final result = await showDialog<String?>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This will permanently delete your account and all your health data '
              '(biomarkers, alerts, reports). This action cannot be undone.',
            ),
            const SizedBox(height: 16),
            TextField(
              controller: deletePasswordController,
              decoration: const InputDecoration(
                labelText: 'Enter your password to confirm',
              ),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, null),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, deletePasswordController.text),
            style: TextButton.styleFrom(
                foregroundColor: MystasisTheme.errorRed),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    deletePasswordController.dispose();
    if (result != null && result.isNotEmpty && mounted) {
      await context.read<AuthProvider>().deleteAccount(result);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: MystasisTheme.deepGraphite,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          final user = auth.user;
          if (user == null) return const SizedBox.shrink();

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              children: [
                // Avatar + name header
                CircleAvatar(
                  radius: 40,
                  backgroundColor:
                      MystasisTheme.deepBioTeal.withValues(alpha: 0.1),
                  child: Text(
                    (user.firstName ?? user.email)
                        .substring(0, 1)
                        .toUpperCase(),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                      color: MystasisTheme.deepBioTeal,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user.displayName ?? user.email,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                Text(
                  user.email,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: MystasisTheme.neutralGrey),
                ),
                const SizedBox(height: 32),

                // Personal Info
                _buildCard(
                  context,
                  title: 'Personal Info',
                  icon: Icons.person_outline,
                  child: _isEditingName
                      ? Column(
                          children: [
                            TextField(
                              controller: _firstNameController,
                              decoration: const InputDecoration(
                                  labelText: 'First Name'),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _lastNameController,
                              decoration: const InputDecoration(
                                  labelText: 'Last Name'),
                            ),
                            if (auth.errorMessage != null) ...[
                              const SizedBox(height: 8),
                              Text(auth.errorMessage!,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                          color: MystasisTheme.errorRed)),
                            ],
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: auth.isLoading
                                        ? null
                                        : () => setState(
                                            () => _isEditingName = false),
                                    child: const Text('Cancel'),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: FilledButton(
                                    onPressed:
                                        auth.isLoading ? null : _saveName,
                                    style: FilledButton.styleFrom(
                                        backgroundColor:
                                            MystasisTheme.deepBioTeal),
                                    child: auth.isLoading
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child:
                                                CircularProgressIndicator(
                                                    strokeWidth: 2,
                                                    color: Colors.white))
                                        : const Text('Save'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        )
                      : Column(
                          children: [
                            _InfoRow('First Name',
                                user.firstName ?? 'Not set'),
                            _InfoRow(
                                'Last Name', user.lastName ?? 'Not set'),
                            _InfoRow('Email', user.email),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: _startEditingName,
                                child: const Text('Edit'),
                              ),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: 16),

                // Change Password
                _buildCard(
                  context,
                  title: 'Change Password',
                  icon: Icons.lock_outline,
                  child: Column(
                    children: [
                      TextField(
                        controller: _currentPasswordController,
                        decoration:
                            const InputDecoration(labelText: 'Current Password'),
                        obscureText: true,
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _passwordController,
                        decoration:
                            const InputDecoration(labelText: 'New Password'),
                        obscureText: true,
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _confirmController,
                        decoration: const InputDecoration(
                            labelText: 'Confirm New Password'),
                        obscureText: true,
                      ),
                      if (_passwordError != null) ...[
                        const SizedBox(height: 8),
                        Text(_passwordError!,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: MystasisTheme.errorRed)),
                      ],
                      if (_passwordChanged) ...[
                        const SizedBox(height: 8),
                        Text('Password changed successfully.',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: MystasisTheme.softAlgae)),
                      ],
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _changePassword,
                          child: const Text('Update Password'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Biometric Sign-In
                if (auth.biometricAvailable)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _buildCard(
                      context,
                      title: 'Biometric Sign-In',
                      icon: Icons.fingerprint,
                      child: _BiometricToggle(),
                    ),
                  ),

                // Delete Account
                _buildCard(
                  context,
                  title: 'Account',
                  icon: Icons.warning_amber_outlined,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Permanently delete your account and all health data.',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: MystasisTheme.neutralGrey),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _deleteAccount,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: MystasisTheme.errorRed,
                            side: const BorderSide(
                                color: MystasisTheme.errorRed),
                          ),
                          child: const Text('Delete Account'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: MystasisTheme.deepBioTeal, size: 20),
              const SizedBox(width: 8),
              Text(title,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _BiometricToggle extends StatefulWidget {
  @override
  State<_BiometricToggle> createState() => _BiometricToggleState();
}

class _BiometricToggleState extends State<_BiometricToggle> {
  String _label = 'Biometrics';

  @override
  void initState() {
    super.initState();
    _loadLabel();
  }

  Future<void> _loadLabel() async {
    final label = await context.read<AuthProvider>().getBiometricLabel();
    if (mounted) setState(() => _label = label);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        return Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sign in with $_label',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w500),
                  ),
                  Text(
                    'Use $_label to sign in without entering your password',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: MystasisTheme.neutralGrey,
                        ),
                  ),
                ],
              ),
            ),
            Switch(
              value: auth.biometricEnabled,
              onChanged: (value) async {
                await auth.setBiometricEnabled(value);
              },
              activeTrackColor: MystasisTheme.deepBioTeal,
              activeThumbColor: Colors.white,
            ),
          ],
        );
      },
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: MystasisTheme.neutralGrey)),
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
