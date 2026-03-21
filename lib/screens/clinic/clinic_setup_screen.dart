import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/services/storage_service.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/clinics_provider.dart';

/// Onboarding screen shown when a clinician has no clinic.
/// Creates a clinic and refreshes the auth token with the new clinicId.
class ClinicSetupScreen extends StatefulWidget {
  final StorageService storageService;

  const ClinicSetupScreen({super.key, required this.storageService});

  @override
  State<ClinicSetupScreen> createState() => _ClinicSetupScreenState();
}

class _ClinicSetupScreenState extends State<ClinicSetupScreen> {
  final _formKey = GlobalKey<FormState>();
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

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;

    final clinicsProvider = context.read<ClinicsProvider>();
    final authProvider = context.read<AuthProvider>();

    try {
      final response = await clinicsProvider.createClinic(
        name: _nameController.text.trim(),
        address: _addressController.text.trim().isNotEmpty
            ? _addressController.text.trim()
            : null,
        phone: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
      );

      // Save the new token (contains clinicId)
      await widget.storageService.saveToken(response.accessToken);

      // Re-check auth status to refresh user with new clinicId
      if (mounted) {
        await authProvider.checkAuthStatus();
      }
    } catch (_) {
      // Error is already handled in ClinicsProvider
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MystasisTheme.boneWhite,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(48),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Consumer<ClinicsProvider>(
              builder: (context, provider, _) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Icon
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: MystasisTheme.deepBioTeal.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.local_hospital_outlined,
                        size: 48,
                        color: MystasisTheme.deepBioTeal,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Title
                    Text(
                      'Set up your clinic',
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Create a clinic to start managing patients and their health data.',
                      style: Theme.of(context)
                          .textTheme
                          .bodyLarge
                          ?.copyWith(color: MystasisTheme.neutralGrey),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 40),

                    // Form
                    Container(
                      padding: const EdgeInsets.all(32),
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
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Clinic name
                            Text(
                              'Clinic Name',
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                hintText: 'e.g. Longevity Health Center',
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Clinic name is required';
                                }
                                if (value.trim().length < 2) {
                                  return 'Name must be at least 2 characters';
                                }
                                if (value.trim().length > 200) {
                                  return 'Name must be less than 200 characters';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 24),

                            // Address
                            Text(
                              'Address (optional)',
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _addressController,
                              decoration: const InputDecoration(
                                hintText: 'e.g. 123 Main St, Suite 100',
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Phone
                            Text(
                              'Phone (optional)',
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _phoneController,
                              decoration: const InputDecoration(
                                hintText: 'e.g. +1 (555) 123-4567',
                              ),
                              keyboardType: TextInputType.phone,
                              validator: (value) {
                                if (value != null && value.trim().isNotEmpty) {
                                  if (!RegExp(r'^[\+\d\s\-\(\)]{7,20}$')
                                      .hasMatch(value.trim()) ||
                                    !RegExp(r'\d').hasMatch(value.trim())) {
                                    return 'Please enter a valid phone number';
                                  }
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 32),

                            // Error message
                            if (provider.errorMessage != null) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: MystasisTheme.errorRed
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline,
                                        size: 18,
                                        color: MystasisTheme.errorRed),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        provider.errorMessage!,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                                color: MystasisTheme.errorRed),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Submit button
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed:
                                    provider.isSaving ? null : _handleCreate,
                                style: FilledButton.styleFrom(
                                  backgroundColor: MystasisTheme.deepBioTeal,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 16),
                                ),
                                child: provider.isSaving
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text('Create Clinic'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
