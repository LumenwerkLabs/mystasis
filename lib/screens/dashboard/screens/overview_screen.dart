import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/models/llm_summary_model.dart';
import 'package:mystasis/core/widgets/medical_disclaimer.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';
import 'package:mystasis/screens/dashboard/widgets/alerts_card.dart';

class OverviewScreen extends StatelessWidget {
  final String? patientId;

  const OverviewScreen({super.key, this.patientId});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(
            'Patient Overview',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 8),
          Consumer<BiomarkersProvider>(
            builder: (context, bioProvider, _) {
              final lastUpdated = bioProvider.biomarkers.isNotEmpty
                  ? bioProvider.biomarkers
                      .map((b) => b.timestamp)
                      .reduce((a, b) => a.isAfter(b) ? a : b)
                  : null;
              return Text(
                lastUpdated != null
                    ? 'Last updated: ${_formatDateTime(lastUpdated)}'
                    : 'No data available',
                style: Theme.of(context)
                    .textTheme.bodyMedium?.copyWith(color: MystasisTheme.neutralGrey),
              );
            },
          ),
          const SizedBox(height: 32),

          // Quick Stats Row
          const _QuickStatsRow(),
          const SizedBox(height: 24),

          // Main content grid
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth > 900) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 2, child: _buildLeftColumn()),
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
        _HomeostasisScoreCard(),
        SizedBox(height: 24),
        _RecentBiomarkersCard(),
      ],
    );
  }

  Widget _buildRightColumn() {
    return Column(
      children: [
        const ActiveAlertsCard(),
        const SizedBox(height: 24),
        _AIInsightsCard(patientId: patientId),
        const SizedBox(height: 24),
        const _ConnectedDevicesCard(),
        const SizedBox(height: 24),
        const _UpcomingActionsCard(),
        const SizedBox(height: 24),
        const _RecentActivityCard(),
      ],
    );
  }
}

class _QuickStatsRow extends StatelessWidget {
  const _QuickStatsRow();

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        final latest = provider.latestByType;
        final trackedCount = latest.length;

        // Find specific latest values
        final hrv = latest.where((b) => b.type == 'HEART_RATE_VARIABILITY').firstOrNull;
        final restingHr = latest.where((b) => b.type == 'RESTING_HEART_RATE').firstOrNull;
        final sleepDuration = latest.where((b) => b.type == 'SLEEP_DURATION').firstOrNull;

        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _StatCard(
              icon: Icons.science_outlined,
              label: 'Biomarkers Tracked',
              value: '$trackedCount',
              unit: 'types',
            ),
            _StatCard(
              icon: Icons.watch_outlined,
              label: 'Avg HRV',
              value: hrv != null ? hrv.value.toStringAsFixed(0) : '--',
              unit: hrv?.unit ?? 'ms',
            ),
            _StatCard(
              icon: Icons.favorite_outline,
              label: 'Resting HR',
              value: restingHr != null ? restingHr.value.toStringAsFixed(0) : '--',
              unit: restingHr?.unit ?? 'bpm',
            ),
            _StatCard(
              icon: Icons.bedtime_outlined,
              label: 'Sleep Duration',
              value: sleepDuration != null ? sleepDuration.value.toStringAsFixed(1) : '--',
              unit: sleepDuration?.unit ?? 'hours',
            ),
          ],
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String unit;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.unit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      padding: const EdgeInsets.all(20),
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
              Icon(icon, color: MystasisTheme.deepBioTeal, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 4),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(unit, style: Theme.of(context).textTheme.bodySmall),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HomeostasisScoreCard extends StatelessWidget {
  const _HomeostasisScoreCard();

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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Homeostasis Score',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: MystasisTheme.signalAmber.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Coming Soon',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: MystasisTheme.signalAmber,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              // Score circle
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      MystasisTheme.deepBioTeal,
                      MystasisTheme.softAlgae,
                    ],
                  ),
                ),
                child: Center(
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '78',
                          style: Theme.of(context).textTheme.headlineLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: MystasisTheme.deepBioTeal,
                              ),
                        ),
                        Text(
                          'Good',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: MystasisTheme.softAlgae),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 32),
              // Breakdown
              Expanded(
                child: Column(
                  children: [
                    _ScoreBreakdownItem(
                      label: 'Metabolic',
                      score: 82,
                      color: MystasisTheme.deepBioTeal,
                    ),
                    const SizedBox(height: 12),
                    _ScoreBreakdownItem(
                      label: 'Cardiovascular',
                      score: 75,
                      color: MystasisTheme.softAlgae,
                    ),
                    const SizedBox(height: 12),
                    _ScoreBreakdownItem(
                      label: 'Inflammatory',
                      score: 71,
                      color: MystasisTheme.cellularBlue,
                    ),
                    const SizedBox(height: 12),
                    _ScoreBreakdownItem(
                      label: 'Hormonal',
                      score: 84,
                      color: MystasisTheme.signalAmber,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ScoreBreakdownItem extends StatelessWidget {
  final String label;
  final int score;
  final Color color;

  const _ScoreBreakdownItem({
    required this.label,
    required this.score,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: score / 100,
              backgroundColor: MystasisTheme.mistGrey,
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 30,
          child: Text(
            '$score',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}

class _RecentBiomarkersCard extends StatelessWidget {
  const _RecentBiomarkersCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        // Use real data if available, fallback to empty state
        final latestBiomarkers = provider.latestByType;
        final displayBiomarkers = latestBiomarkers.take(5).toList();

        if (provider.isLoading) {
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
            child: const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            ),
          );
        }

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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recent Biomarkers',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  TextButton(onPressed: () {}, child: const Text('View All')),
                ],
              ),
              const SizedBox(height: 16),
              if (displayBiomarkers.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'No biomarker data available.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: MystasisTheme.neutralGrey,
                    ),
                  ),
                )
              else
                ...displayBiomarkers.map((b) => _BiomarkerRow(
                      data: _BiomarkerData(
                        b.displayName,
                        b.value.toStringAsFixed(b.value % 1 == 0 ? 0 : 1),
                        b.unit,
                        b.status,
                        b.rangeDisplay,
                      ),
                    )),
            ],
          ),
        );
      },
    );
  }
}

class _BiomarkerData {
  final String name;
  final String value;
  final String unit;
  final String status;
  final String range;

  _BiomarkerData(this.name, this.value, this.unit, this.status, this.range);
}

class _BiomarkerRow extends StatelessWidget {
  final _BiomarkerData data;

  const _BiomarkerRow({required this.data});

  @override
  Widget build(BuildContext context) {
    final statusColor = data.status == 'optimal'
        ? MystasisTheme.softAlgae
        : data.status == 'borderline'
        ? MystasisTheme.signalAmber
        : MystasisTheme.errorRed;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              data.name,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Expanded(
            child: Row(
              children: [
                Text(
                  data.value,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 4),
                Text(data.unit, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              data.status,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: statusColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 60,
            child: Text(
              data.range,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: MystasisTheme.neutralGrey),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

class _AIInsightsCard extends StatelessWidget {
  final String? patientId;

  const _AIInsightsCard({this.patientId});

  @override
  Widget build(BuildContext context) {
    return Consumer<InsightsProvider>(
      builder: (context, provider, _) {
        final latest = provider.latestSummary;

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
                  Icon(
                    Icons.auto_awesome,
                    size: 20,
                    color: MystasisTheme.cellularBlue,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI Insights',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (provider.isGenerating)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (latest != null) ...[
                // Type badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: MystasisTheme.cellularBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    latest.type.displayName,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: MystasisTheme.cellularBlue,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // Preview (first ~150 chars)
                Text(
                  latest.content.length > 150
                      ? '${latest.content.substring(0, 150)}...'
                      : latest.content,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 12),
                const MedicalDisclaimer(),
              ] else ...[
                // Empty state
                Text(
                  'No AI insights generated yet.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                ),
                const SizedBox(height: 12),
                if (patientId != null &&
                    context.read<AuthProvider>().user?.isClinician == true)
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.read<InsightsProvider>().generateSummary(
                              patientId!,
                              SummaryType.weeklySummary,
                            );
                      },
                      icon: const Icon(Icons.auto_awesome, size: 16),
                      label: const Text('Generate Insights'),
                    ),
                  ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _ConnectedDevicesCard extends StatelessWidget {
  const _ConnectedDevicesCard();

  static const _sourceDisplay = <String, (String, IconData)>{
    'apple_health': ('Apple Health', Icons.apple),
    'google_fit': ('Google Fit', Icons.fitness_center),
    'myfitnesspal': ('MyFitnessPal', Icons.restaurant),
    'cronometer': ('Cronometer', Icons.pie_chart),
    'manual': ('Manual Entry', Icons.edit_note),
    'lab_upload': ('Lab Upload', Icons.science_outlined),
    'seed_data': ('Seed Data', Icons.storage),
  };

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        // Extract distinct non-null sources from loaded biomarkers
        final sources = provider.biomarkers
            .map((b) => b.source)
            .whereType<String>()
            .toSet()
            .toList()
          ..sort();

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
                  const Icon(Icons.devices, size: 20,
                      color: MystasisTheme.deepBioTeal),
                  const SizedBox(width: 8),
                  Text('Data Sources',
                      style: Theme.of(context).textTheme.headlineSmall),
                ],
              ),
              const SizedBox(height: 16),
              if (provider.isLoading)
                const Center(child: CircularProgressIndicator())
              else if (sources.isEmpty)
                Text(
                  'No data sources detected.',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: MystasisTheme.neutralGrey),
                )
              else
                ...sources.map((source) {
                  final display = _sourceDisplay[source.toLowerCase()];
                  final name = display?.$1 ?? _formatSourceName(source);
                  final icon = display?.$2 ?? Icons.link;

                  // Count records from this source
                  final count = provider.biomarkers
                      .where((b) => b.source == source)
                      .length;

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: MystasisTheme.deepBioTeal
                                .withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(icon, size: 18,
                              color: MystasisTheme.deepBioTeal),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                          fontWeight: FontWeight.w500)),
                              Text(
                                '$count record${count == 1 ? '' : 's'}',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                        color: MystasisTheme.neutralGrey),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: MystasisTheme.softAlgae
                                .withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            'Active',
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                    color: MystasisTheme.softAlgae,
                                    fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }

  static String _formatSourceName(String source) {
    return source
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) =>
            w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }
}

class _UpcomingActionsCard extends StatelessWidget {
  const _UpcomingActionsCard();

  @override
  Widget build(BuildContext context) {
    final actions = [
      _ActionItem(
        Icons.science_outlined,
        'Lab Work Due',
        'Comprehensive metabolic panel',
        'Jan 5',
      ),
      _ActionItem(
        Icons.medication_outlined,
        'Supplement Review',
        'Quarterly protocol check',
        'Jan 8',
      ),
      _ActionItem(
        Icons.calendar_today,
        'Follow-up Visit',
        'Review latest results',
        'Jan 15',
      ),
    ];

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
          Text(
            'Upcoming Actions',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          ...actions.map((a) => _ActionRow(item: a)),
        ],
      ),
    );
  }
}

class _ActionItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final String date;

  _ActionItem(this.icon, this.title, this.subtitle, this.date);
}

class _ActionRow extends StatelessWidget {
  final _ActionItem item;

  const _ActionRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: MystasisTheme.deepBioTeal.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item.icon, color: MystasisTheme.deepBioTeal, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                ),
                Text(
                  item.subtitle,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Text(
            item.date,
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: MystasisTheme.deepBioTeal),
          ),
        ],
      ),
    );
  }
}

class _RecentActivityCard extends StatelessWidget {
  const _RecentActivityCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        final recent = List<BiomarkerModel>.from(provider.biomarkers)
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
        final display = recent.take(4).toList();

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
              Text(
                'Recent Activity',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              if (display.isEmpty)
                Text(
                  'No recent activity.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                )
              else
                ...display.map((b) => _ActivityRow(
                      activity: _Activity(
                        '${b.displayName}: ${b.value.toStringAsFixed(b.value % 1 == 0 ? 0 : 1)} ${b.unit}',
                        _formatRelativeTime(b.timestamp),
                      ),
                    )),
            ],
          ),
        );
      },
    );
  }
}

class _Activity {
  final String description;
  final String time;

  _Activity(this.description, this.time);
}

class _ActivityRow extends StatelessWidget {
  final _Activity activity;

  const _ActivityRow({required this.activity});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: MystasisTheme.cellularBlue,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              activity.description,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Text(activity.time, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

String _formatDateTime(DateTime dt) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
  final amPm = dt.hour >= 12 ? 'PM' : 'AM';
  final min = dt.minute.toString().padLeft(2, '0');
  return '${months[dt.month - 1]} ${dt.day}, ${dt.year} at $hour:$min $amPm';
}

String _formatRelativeTime(DateTime timestamp) {
  final diff = DateTime.now().difference(timestamp);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${timestamp.month}/${timestamp.day}/${timestamp.year}';
}
