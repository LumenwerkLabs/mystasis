import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/screens/dashboard/clinician_dashboard.dart';

class ClinicianNavbar extends StatelessWidget {
  final List<PatientOption> patients;
  final PatientOption selectedPatient;
  final ValueChanged<String> onPatientSelected;

  const ClinicianNavbar({
    super.key,
    required this.patients,
    required this.selectedPatient,
    required this.onPatientSelected,
  });

  static const double height = 64;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            Color(0xFFB8D4D4), // soft teal
            Color(0xFFC5DDD9), // transitional
            Color(0xFFD4E5E0), // pale sage
          ],
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          // Patient selector
          _PatientSelector(
            patients: patients,
            selectedPatient: selectedPatient,
            onPatientSelected: onPatientSelected,
          ),

          const Spacer(),

          // Right side actions
          _buildActions(context),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    return Row(
      children: [
        // Search
        IconButton(
          icon: Icon(
            Icons.search,
            color: MystasisTheme.deepGraphite.withValues(alpha: 0.7),
          ),
          onPressed: () {},
          tooltip: 'Search',
        ),
        const SizedBox(width: 8),
        // Notifications
        IconButton(
          icon: Icon(
            Icons.notifications_outlined,
            color: MystasisTheme.deepGraphite.withValues(alpha: 0.7),
          ),
          onPressed: () {},
          tooltip: 'Notifications',
        ),
        const SizedBox(width: 8),
        // Profile avatar
        const CircleAvatar(
          radius: 18,
          backgroundColor: MystasisTheme.deepBioTeal,
          child: Text(
            'DR',
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

class _PatientSelector extends StatefulWidget {
  final List<PatientOption> patients;
  final PatientOption selectedPatient;
  final ValueChanged<String> onPatientSelected;

  const _PatientSelector({
    required this.patients,
    required this.selectedPatient,
    required this.onPatientSelected,
  });

  @override
  State<_PatientSelector> createState() => _PatientSelectorState();
}

class _PatientSelectorState extends State<_PatientSelector> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: PopupMenuButton<String>(
        onSelected: widget.onPatientSelected,
        offset: const Offset(0, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        color: Colors.white,
        itemBuilder: (context) => widget.patients.map((patient) {
          final isSelected = patient.id == widget.selectedPatient.id;
          return PopupMenuItem<String>(
            value: patient.id,
            child: Row(
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: MystasisTheme.mistGrey,
                  child: Text(
                    patient.name[0],
                    style: const TextStyle(
                      color: MystasisTheme.deepGraphite,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  patient.name,
                  style: TextStyle(
                    color: MystasisTheme.deepGraphite,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
                if (isSelected) ...[
                  const Spacer(),
                  const Icon(
                    Icons.check,
                    size: 18,
                    color: MystasisTheme.deepBioTeal,
                  ),
                ],
              ],
            ),
          );
        }).toList(),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: _isHovered ? Colors.white : Colors.white.withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Patient: ',
                style: TextStyle(
                  color: MystasisTheme.deepGraphite.withValues(alpha: 0.6),
                  fontSize: 14,
                ),
              ),
              Text(
                widget.selectedPatient.name,
                style: const TextStyle(
                  color: MystasisTheme.deepGraphite,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.keyboard_arrow_down,
                size: 20,
                color: MystasisTheme.deepGraphite.withValues(alpha: 0.6),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
