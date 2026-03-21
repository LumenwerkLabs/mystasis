import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/services/storage_service.dart';
import 'package:mystasis/providers/patients_provider.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';
import 'package:mystasis/screens/dashboard/widgets/clinician_sidebar.dart';
import 'package:mystasis/screens/dashboard/widgets/clinician_navbar.dart';
import 'package:mystasis/screens/dashboard/screens/overview_screen.dart';
import 'package:mystasis/screens/dashboard/screens/biomarkers_screen.dart';
import 'package:mystasis/screens/dashboard/screens/reports_screen.dart';
import 'package:mystasis/screens/dashboard/screens/anamnesis_screen.dart';
import 'package:mystasis/screens/dashboard/screens/alerts_screen.dart';
import 'package:mystasis/screens/dashboard/screens/analytics_screen.dart';
import 'package:mystasis/screens/settings/settings_screen.dart';
import 'package:mystasis/screens/clinic/clinic_setup_screen.dart';
import 'package:mystasis/providers/alerts_provider.dart';
import 'package:mystasis/providers/clinics_provider.dart';
import 'package:mystasis/providers/anamnesis_provider.dart';

class ClinicianDashboard extends StatelessWidget {
  const ClinicianDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final clinicId = auth.user?.clinicId;
        if (clinicId == null) {
          return ClinicSetupScreen(
            storageService: context.read<StorageService>(),
          );
        }
        // Use clinicId as key so a fresh State is created after clinic setup
        return _DashboardBody(key: ValueKey(clinicId), clinicId: clinicId);
      },
    );
  }
}

class _DashboardBody extends StatefulWidget {
  final String clinicId;

  const _DashboardBody({super.key, required this.clinicId});

  @override
  State<_DashboardBody> createState() => _DashboardBodyState();
}

class _DashboardBodyState extends State<_DashboardBody> {
  int _selectedNavIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      context.read<ClinicsProvider>().loadClinic();
      final patientsProvider = context.read<PatientsProvider>();
      await patientsProvider.loadPatients();
      final selected = patientsProvider.selectedPatient;
      if (selected != null && mounted) {
        context.read<BiomarkersProvider>().loadBiomarkers(selected.id);
        context.read<AlertsProvider>().loadAlerts(selected.id);
      }
    });
  }

  void _onNavItemSelected(int index) {
    setState(() => _selectedNavIndex = index);
  }

  void _onPatientSelected(String patientId) {
    final patientsProvider = context.read<PatientsProvider>();
    patientsProvider.selectPatientById(patientId);
    context.read<BiomarkersProvider>().reloadBiomarkers(patientId);
    context.read<InsightsProvider>().clearSummaries();
    context.read<AlertsProvider>().clearForPatient();
    context.read<AnamnesisProvider>().clearForPatient();
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
              ClinicianSidebar(
                selectedIndex: _selectedNavIndex,
                onItemSelected: _onNavItemSelected,
              ),
              Expanded(
                child: Column(
                  children: [
                    if (ClinicianSidebar.clinicWideIndices
                        .contains(_selectedNavIndex))
                      // Clinic-wide screens don't need patient selector
                      const SizedBox(height: 64)
                    else if (patients.isNotEmpty && selectedPatient != null)
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
      const AnalyticsScreen(),
      ReportsScreen(patientId: patientId),
      AnamnesisScreen(patientId: patientId),
      AlertsScreen(patientId: patientId),
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
