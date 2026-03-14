import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/patients_provider.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';
import 'package:mystasis/screens/dashboard/widgets/clinician_sidebar.dart';
import 'package:mystasis/screens/dashboard/widgets/clinician_navbar.dart';
import 'package:mystasis/screens/dashboard/screens/overview_screen.dart';
import 'package:mystasis/screens/dashboard/screens/biomarkers_screen.dart';
import 'package:mystasis/screens/dashboard/screens/wearables_screen.dart';
import 'package:mystasis/screens/dashboard/screens/reports_screen.dart';
import 'package:mystasis/screens/settings/settings_screen.dart';

class ClinicianDashboard extends StatefulWidget {
  const ClinicianDashboard({super.key});

  @override
  State<ClinicianDashboard> createState() => _ClinicianDashboardState();
}

class _ClinicianDashboardState extends State<ClinicianDashboard> {
  int _selectedNavIndex = 0;

  @override
  void initState() {
    super.initState();
    // Load patients on dashboard init, then load biomarkers for auto-selected patient
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final auth = context.read<AuthProvider>();
      if (auth.user == null || !auth.user!.isClinician) return;

      final patientsProvider = context.read<PatientsProvider>();
      await patientsProvider.loadPatients();
      final selected = patientsProvider.selectedPatient;
      if (selected != null && mounted) {
        context.read<BiomarkersProvider>().loadBiomarkers(selected.id);
      }
    });
  }

  void _onNavItemSelected(int index) {
    setState(() => _selectedNavIndex = index);
  }

  void _onPatientSelected(String patientId) {
    final patientsProvider = context.read<PatientsProvider>();
    patientsProvider.selectPatientById(patientId);
    // Reload biomarkers and clear insights for newly selected patient
    context.read<BiomarkersProvider>().reloadBiomarkers(patientId);
    context.read<InsightsProvider>().clearSummaries();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<PatientsProvider>(
      builder: (context, patientsProvider, _) {
        final patients = patientsProvider.patients
            .map((u) => PatientOption(
                  id: u.id,
                  name: u.displayName ?? u.email,
                ))
            .toList();

        final selectedUser = patientsProvider.selectedPatient;
        final selectedPatient = selectedUser != null
            ? PatientOption(
                id: selectedUser.id,
                name: selectedUser.displayName ?? selectedUser.email,
              )
            : null;

        return Scaffold(
          backgroundColor: MystasisTheme.boneWhite,
          body: Row(
            children: [
              // Permanent sidebar
              ClinicianSidebar(
                selectedIndex: _selectedNavIndex,
                onItemSelected: _onNavItemSelected,
              ),

              // Main content area
              Expanded(
                child: Column(
                  children: [
                    // Top navbar
                    if (patients.isNotEmpty && selectedPatient != null)
                      ClinicianNavbar(
                        patients: patients,
                        selectedPatient: selectedPatient,
                        onPatientSelected: _onPatientSelected,
                      )
                    else if (patientsProvider.isLoading)
                      const SizedBox(
                        height: 64,
                        child: Center(child: LinearProgressIndicator()),
                      )
                    else
                      const SizedBox(height: 64),

                    // Page content
                    Expanded(child: _buildPageContent(selectedUser?.id)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPageContent(String? patientId) {
    final screens = [
      OverviewScreen(patientId: patientId),
      BiomarkersScreen(patientId: patientId),
      const WearablesScreen(),
      ReportsScreen(patientId: patientId),
      const SettingsScreen(),
    ];

    return screens[_selectedNavIndex];
  }
}

class PatientOption {
  final String id;
  final String name;

  const PatientOption({required this.id, required this.name});
}
