import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';

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
    return const Column(
      children: [
        _PatientProfileCard(),
        SizedBox(height: 24),
        _NotificationsCard(),
        SizedBox(height: 24),
        _DataSharingCard(),
      ],
    );
  }

  Widget _buildRightColumn() {
    return const Column(
      children: [
        _GoalsCard(),
        SizedBox(height: 24),
        _IntegrationsCard(),
        SizedBox(height: 24),
        _ExportDataCard(),
      ],
    );
  }
}

class _PatientProfileCard extends StatelessWidget {
  const _PatientProfileCard();

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      title: 'Patient Profile',
      icon: Icons.person_outline,
      children: [
        _ProfileField(label: 'Name', value: 'Lucia Schlegel'),
        _ProfileField(label: 'Date of Birth', value: 'March 15, 1988'),
        _ProfileField(label: 'Sex', value: 'Female'),
        _ProfileField(label: 'Blood Type', value: 'O+'),
        _ProfileField(label: 'Height', value: '168 cm'),
        _ProfileField(label: 'Weight', value: '62 kg'),
        const SizedBox(height: 16),
        OutlinedButton(onPressed: () {}, child: const Text('Edit Profile')),
      ],
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
  final ValueChanged<bool> onChanged;

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

class _DataSharingCard extends StatefulWidget {
  const _DataSharingCard();

  @override
  State<_DataSharingCard> createState() => _DataSharingCardState();
}

class _DataSharingCardState extends State<_DataSharingCard> {
  bool _shareWithClinician = true;
  bool _anonymousResearch = false;

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      title: 'Data Sharing',
      icon: Icons.share_outlined,
      children: [
        _ToggleSetting(
          label: 'Share with Clinician',
          description: 'Allow your care team to view data',
          value: _shareWithClinician,
          onChanged: (v) => setState(() => _shareWithClinician = v),
        ),
        _ToggleSetting(
          label: 'Anonymous Research',
          description: 'Contribute to longevity research',
          value: _anonymousResearch,
          onChanged: (v) => setState(() => _anonymousResearch = v),
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
  }
}

class _GoalsCard extends StatelessWidget {
  const _GoalsCard();

  @override
  Widget build(BuildContext context) {
    final goals = [
      _Goal('Optimize metabolic health', 'In Progress', 0.7),
      _Goal('Improve cardiovascular markers', 'In Progress', 0.6),
      _Goal('Enhance sleep quality', 'Achieved', 1.0),
      _Goal('Reduce inflammation', 'In Progress', 0.8),
    ];

    return _SettingsCard(
      title: 'Health Goals',
      icon: Icons.flag_outlined,
      children: [
        ...goals.map((g) => _GoalItem(goal: g)),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Add Goal'),
        ),
      ],
    );
  }
}

class _Goal {
  final String name;
  final String status;
  final double progress;

  _Goal(this.name, this.status, this.progress);
}

class _GoalItem extends StatelessWidget {
  final _Goal goal;

  const _GoalItem({required this.goal});

  @override
  Widget build(BuildContext context) {
    final isAchieved = goal.status == 'Achieved';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  goal.name,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: isAchieved
                      ? MystasisTheme.softAlgae.withValues(alpha: 0.12)
                      : MystasisTheme.signalAmber.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  goal.status,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: isAchieved
                        ? MystasisTheme.softAlgae
                        : MystasisTheme.signalAmber,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: goal.progress,
              backgroundColor: MystasisTheme.mistGrey,
              valueColor: AlwaysStoppedAnimation(
                isAchieved
                    ? MystasisTheme.softAlgae
                    : MystasisTheme.deepBioTeal,
              ),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}

class _IntegrationsCard extends StatelessWidget {
  const _IntegrationsCard();

  @override
  Widget build(BuildContext context) {
    final integrations = [
      _Integration('Apple Health', true, Icons.apple),
      _Integration('Google Fit', false, Icons.fitness_center),
      _Integration('MyFitnessPal', true, Icons.restaurant),
      _Integration('Cronometer', false, Icons.pie_chart),
    ];

    return _SettingsCard(
      title: 'Integrations',
      icon: Icons.extension_outlined,
      children: integrations
          .map((i) => _IntegrationItem(integration: i))
          .toList(),
    );
  }
}

class _Integration {
  final String name;
  final bool connected;
  final IconData icon;

  _Integration(this.name, this.connected, this.icon);
}

class _IntegrationItem extends StatelessWidget {
  final _Integration integration;

  const _IntegrationItem({required this.integration});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: MystasisTheme.mistGrey,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              integration.icon,
              size: 20,
              color: MystasisTheme.deepGraphite,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              integration.name,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          if (integration.connected)
            TextButton(onPressed: () {}, child: const Text('Disconnect'))
          else
            OutlinedButton(onPressed: () {}, child: const Text('Connect')),
        ],
      ),
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
