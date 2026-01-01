import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';
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
  String _selectedPatientId = '1';

  final List<PatientOption> _patients = [
    PatientOption(id: '1', name: 'Lucia S.'),
    PatientOption(id: '2', name: 'John D.'),
    PatientOption(id: '3', name: 'Maria G.'),
  ];

  void _onNavItemSelected(int index) {
    setState(() => _selectedNavIndex = index);
  }

  void _onPatientSelected(String patientId) {
    setState(() => _selectedPatientId = patientId);
  }

  @override
  Widget build(BuildContext context) {
    final selectedPatient = _patients.firstWhere(
      (p) => p.id == _selectedPatientId,
    );

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
                ClinicianNavbar(
                  patients: _patients,
                  selectedPatient: selectedPatient,
                  onPatientSelected: _onPatientSelected,
                ),

                // Page content
                Expanded(child: _buildPageContent()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPageContent() {
    const screens = [
      OverviewScreen(),
      BiomarkersScreen(),
      WearablesScreen(),
      ReportsScreen(),
      SettingsScreen(),
    ];

    return screens[_selectedNavIndex];
  }
}

class PatientOption {
  final String id;
  final String name;

  const PatientOption({required this.id, required this.name});
}
