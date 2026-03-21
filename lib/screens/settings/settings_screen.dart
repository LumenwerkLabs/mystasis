import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/clinics_provider.dart';
import 'package:mystasis/providers/patients_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Settings', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 8),
          Text(
            'Manage patient preferences and account settings',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: MystasisTheme.neutralGrey),
          ),
          const SizedBox(height: 32),

          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth > 800) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _buildLeftColumn()),
                    const SizedBox(width: 24),
                    Expanded(child: _buildRightColumn()),
                  ],
                );
              }
              return Column(
                children: [
                  _buildLeftColumn(),
                  const SizedBox(height: 24),
                  _buildRightColumn(),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLeftColumn() {
    return Column(
      children: [
        const _ProfileCard(),
        const SizedBox(height: 24),
        const _SecurityCard(),
        const SizedBox(height: 24),
        Consumer<AuthProvider>(
          builder: (context, auth, _) {
            if (!auth.biometricAvailable) return const SizedBox.shrink();
            return const Padding(
              padding: EdgeInsets.only(bottom: 24),
              child: _BiometricCard(),
            );
          },
        ),
        const _ClinicCard(),
        const SizedBox(height: 24),
        const _PatientEnrollmentCard(),
      ],
    );
  }

  Widget _buildRightColumn() {
    return const Column(
      children: [
        _NotificationsCard(),
        SizedBox(height: 24),
        _DataSharingCard(),
        SizedBox(height: 24),
        _ExportDataCard(),
      ],
    );
  }
}

class _ProfileCard extends StatefulWidget {
  const _ProfileCard();

  @override
  State<_ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends State<_ProfileCard> {
  bool _isEditing = false;
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }

  void _startEditing() {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;
    _firstNameController.text = user.firstName ?? '';
    _lastNameController.text = user.lastName ?? '';
    setState(() => _isEditing = true);
  }

  Future<void> _saveChanges() async {
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
      setState(() => _isEditing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final user = auth.user;
        if (user == null) return const SizedBox.shrink();

        if (_isEditing) {
          return _SettingsCard(
            title: 'Edit Profile',
            icon: Icons.person_outline,
            children: [
              TextField(
                controller: _firstNameController,
                decoration: const InputDecoration(labelText: 'First Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _lastNameController,
                decoration: const InputDecoration(labelText: 'Last Name'),
              ),
              if (auth.errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(auth.errorMessage!,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: MystasisTheme.errorRed)),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: auth.isLoading
                        ? null
                        : () => setState(() => _isEditing = false),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: auth.isLoading ? null : _saveChanges,
                    style: FilledButton.styleFrom(
                        backgroundColor: MystasisTheme.deepBioTeal),
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Save'),
                  ),
                ],
              ),
            ],
          );
        }

        return _SettingsCard(
          title: 'Profile',
          icon: Icons.person_outline,
          children: [
            _ProfileField(
                label: 'First Name', value: user.firstName ?? 'Not set'),
            _ProfileField(
                label: 'Last Name', value: user.lastName ?? 'Not set'),
            _ProfileField(label: 'Email', value: user.email),
            _ProfileField(
                label: 'Role',
                value: user.isClinician ? 'Clinician' : 'Patient'),
            const SizedBox(height: 16),
            OutlinedButton(
                onPressed: _startEditing,
                child: const Text('Edit Profile')),
          ],
        );
      },
    );
  }
}

class _SecurityCard extends StatefulWidget {
  const _SecurityCard();

  @override
  State<_SecurityCard> createState() => _SecurityCardState();
}

class _SecurityCardState extends State<_SecurityCard> {
  final _currentPasswordController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  String? _passwordError;
  bool _passwordChanged = false;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
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
          'Password must contain at least one letter and one number.');
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
              'This will permanently delete your account and all associated data '
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
    return _SettingsCard(
      title: 'Security',
      icon: Icons.lock_outline,
      children: [
        // Change Password
        Text('Change Password',
            style: Theme.of(context)
                .textTheme
                .labelMedium
                ?.copyWith(color: MystasisTheme.neutralGrey)),
        const SizedBox(height: 8),
        TextField(
          controller: _currentPasswordController,
          decoration: const InputDecoration(labelText: 'Current Password'),
          obscureText: true,
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          decoration: const InputDecoration(labelText: 'New Password'),
          obscureText: true,
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _confirmController,
          decoration: const InputDecoration(labelText: 'Confirm New Password'),
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
        OutlinedButton(
            onPressed: _changePassword,
            child: const Text('Update Password')),

        const SizedBox(height: 24),
        const Divider(),
        const SizedBox(height: 16),

        // Delete Account
        Text('Danger Zone',
            style: Theme.of(context)
                .textTheme
                .labelMedium
                ?.copyWith(color: MystasisTheme.errorRed)),
        const SizedBox(height: 8),
        Text(
          'Permanently delete your account and all associated data.',
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(color: MystasisTheme.neutralGrey),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _deleteAccount,
          style: OutlinedButton.styleFrom(
            foregroundColor: MystasisTheme.errorRed,
            side: const BorderSide(color: MystasisTheme.errorRed),
          ),
          child: const Text('Delete Account'),
        ),
      ],
    );
  }
}

class _BiometricCard extends StatefulWidget {
  const _BiometricCard();

  @override
  State<_BiometricCard> createState() => _BiometricCardState();
}

class _BiometricCardState extends State<_BiometricCard> {
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
        return _SettingsCard(
          title: 'Biometric Sign-In',
          icon: Icons.fingerprint,
          children: [
            _ToggleSetting(
              label: 'Sign in with $_label',
              description:
                  'Use $_label to sign in without entering your password',
              value: auth.biometricEnabled,
              onChanged: (v) async {
                await auth.setBiometricEnabled(v);
              },
            ),
          ],
        );
      },
    );
  }
}

class _ClinicCard extends StatefulWidget {
  const _ClinicCard();

  @override
  State<_ClinicCard> createState() => _ClinicCardState();
}

class _ClinicCardState extends State<_ClinicCard> {
  bool _isEditing = false;
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _startEditing() {
    final clinic = context.read<ClinicsProvider>().clinic;
    if (clinic == null) return;
    _nameController.text = clinic.name;
    _addressController.text = clinic.address ?? '';
    _phoneController.text = clinic.phone ?? '';
    setState(() => _isEditing = true);
  }

  Future<void> _saveChanges() async {
    final phone = _phoneController.text.trim();
    if (phone.isNotEmpty &&
        (!RegExp(r'^[\+\d\s\-\(\)]{7,20}$').hasMatch(phone) ||
            !RegExp(r'\d').hasMatch(phone))) {
      return; // Don't save with invalid phone
    }

    final provider = context.read<ClinicsProvider>();
    await provider.updateClinic(
      name: _nameController.text.trim().isNotEmpty
          ? _nameController.text.trim()
          : null,
      address: _addressController.text.trim().isNotEmpty
          ? _addressController.text.trim()
          : null,
      phone: phone.isNotEmpty ? phone : null,
    );
    if (mounted && provider.errorMessage == null) {
      setState(() => _isEditing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ClinicsProvider>(
      builder: (context, provider, _) {
        final clinic = provider.clinic;

        if (provider.isLoading) {
          return _SettingsCard(
            title: 'Clinic',
            icon: Icons.local_hospital_outlined,
            children: const [Center(child: CircularProgressIndicator())],
          );
        }

        if (clinic == null) {
          return _SettingsCard(
            title: 'Clinic',
            icon: Icons.local_hospital_outlined,
            children: [
              Text(
                'No clinic data available.',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: MystasisTheme.neutralGrey),
              ),
            ],
          );
        }

        if (_isEditing) {
          return _SettingsCard(
            title: 'Edit Clinic',
            icon: Icons.local_hospital_outlined,
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Clinic Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(labelText: 'Address'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Phone'),
                keyboardType: TextInputType.phone,
                autovalidateMode: AutovalidateMode.onUserInteraction,
                validator: (value) {
                  if (value != null && value.trim().isNotEmpty) {
                    if (!RegExp(r'^[\+\d\s\-\(\)]{7,20}$').hasMatch(value.trim()) ||
                        !RegExp(r'\d').hasMatch(value.trim())) {
                      return 'Please enter a valid phone number';
                    }
                  }
                  return null;
                },
              ),
              if (provider.errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  provider.errorMessage!,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: MystasisTheme.errorRed),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: provider.isSaving
                        ? null
                        : () => setState(() => _isEditing = false),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: provider.isSaving ? null : _saveChanges,
                    style: FilledButton.styleFrom(
                      backgroundColor: MystasisTheme.deepBioTeal,
                    ),
                    child: provider.isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Save'),
                  ),
                ],
              ),
            ],
          );
        }

        return _SettingsCard(
          title: 'Clinic',
          icon: Icons.local_hospital_outlined,
          children: [
            _ProfileField(label: 'Name', value: clinic.name),
            _ProfileField(
                label: 'Address', value: clinic.address ?? 'Not set'),
            _ProfileField(label: 'Phone', value: clinic.phone ?? 'Not set'),
            const SizedBox(height: 16),
            OutlinedButton(
                onPressed: _startEditing, child: const Text('Edit Clinic')),
          ],
        );
      },
    );
  }
}

class _PatientEnrollmentCard extends StatelessWidget {
  const _PatientEnrollmentCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<PatientsProvider>(
      builder: (context, provider, _) {
        return _SettingsCard(
          title: 'Enrolled Patients',
          icon: Icons.people_outline,
          children: [
            if (provider.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (provider.patients.isEmpty)
              Text(
                'No patients enrolled in this clinic.',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: MystasisTheme.neutralGrey),
              )
            else ...[
              Text(
                '${provider.patients.length} patient${provider.patients.length == 1 ? '' : 's'} enrolled',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
              ),
              const SizedBox(height: 12),
              ...provider.patients.map((p) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor:
                              MystasisTheme.deepBioTeal.withValues(alpha: 0.1),
                          child: Text(
                            (p.firstName ?? p.email)
                                .substring(0, 1)
                                .toUpperCase(),
                            style: const TextStyle(
                              color: MystasisTheme.deepBioTeal,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.displayName ?? p.email,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              Text(
                                p.email,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                        color: MystasisTheme.neutralGrey),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )),
            ],
          ],
        );
      },
    );
  }
}

class _ProfileField extends StatelessWidget {
  final String label;
  final String value;

  const _ProfileField({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: MystasisTheme.neutralGrey),
          ),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class _NotificationsCard extends StatefulWidget {
  const _NotificationsCard();

  @override
  State<_NotificationsCard> createState() => _NotificationsCardState();
}

class _NotificationsCardState extends State<_NotificationsCard> {
  bool _labResults = true;
  bool _appointments = true;
  bool _healthAlerts = true;
  bool _weeklyDigest = false;

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      title: 'Notifications',
      icon: Icons.notifications_outlined,
      children: [
        _ToggleSetting(
          label: 'Lab Results',
          description: 'Notify when new results are available',
          value: _labResults,
          onChanged: (v) => setState(() => _labResults = v),
        ),
        _ToggleSetting(
          label: 'Appointments',
          description: 'Reminders for upcoming appointments',
          value: _appointments,
          onChanged: (v) => setState(() => _appointments = v),
        ),
        _ToggleSetting(
          label: 'Health Alerts',
          description: 'Critical biomarker notifications',
          value: _healthAlerts,
          onChanged: (v) => setState(() => _healthAlerts = v),
        ),
        _ToggleSetting(
          label: 'Weekly Digest',
          description: 'Summary of weekly health data',
          value: _weeklyDigest,
          onChanged: (v) => setState(() => _weeklyDigest = v),
        ),
      ],
    );
  }
}

class _ToggleSetting extends StatelessWidget {
  final String label;
  final String description;
  final bool value;
  final ValueChanged<bool>? onChanged;

  const _ToggleSetting({
    required this.label,
    required this.description,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                ),
                Text(description, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: MystasisTheme.deepBioTeal,
            activeThumbColor: Colors.white,
          ),
        ],
      ),
    );
  }
}

class _DataSharingCard extends StatelessWidget {
  const _DataSharingCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final user = auth.user;
        if (user == null) return const SizedBox.shrink();

        return _SettingsCard(
          title: 'Data Sharing',
          icon: Icons.share_outlined,
          children: [
            if (auth.errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: MystasisTheme.errorRed.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  auth.errorMessage!,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: MystasisTheme.errorRed),
                ),
              ),
            ],
            _ToggleSetting(
              label: 'Share with Clinician',
              description: 'Allow your care team to view data',
              value: user.shareWithClinician,
              onChanged: auth.isLoading
                  ? null
                  : (v) => auth.updateConsent(shareWithClinician: v),
            ),
            _ToggleSetting(
              label: 'Anonymous Research',
              description: 'Contribute to longevity research',
              value: user.anonymousResearch,
              onChanged: auth.isLoading
                  ? null
                  : (v) => auth.updateConsent(anonymousResearch: v),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: MystasisTheme.cellularBlue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline,
                    size: 18,
                    color: MystasisTheme.cellularBlue,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your data is encrypted and never sold to third parties.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: MystasisTheme.cellularBlue,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ExportDataCard extends StatelessWidget {
  const _ExportDataCard();

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      title: 'Export Data',
      icon: Icons.download_outlined,
      children: [
        Text(
          'Download a copy of all patient health data in various formats.',
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: MystasisTheme.neutralGrey),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.description, size: 18),
              label: const Text('Export as PDF'),
            ),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.table_chart, size: 18),
              label: const Text('Export as CSV'),
            ),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.code, size: 18),
              label: const Text('Export as JSON'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: MystasisTheme.mistGrey,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.history,
                size: 18,
                color: MystasisTheme.neutralGrey,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Last export: Dec 15, 2025',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _SettingsCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: MystasisTheme.deepBioTeal, size: 22),
              const SizedBox(width: 8),
              Text(title, style: Theme.of(context).textTheme.headlineSmall),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}
