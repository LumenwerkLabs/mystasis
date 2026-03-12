import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/llm_summary_model.dart';
import 'package:mystasis/core/widgets/medical_disclaimer.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';

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
          Text(
            'Last updated: Dec 28, 2025 at 9:45 AM',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: MystasisTheme.neutralGrey),
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
        _AIInsightsCard(patientId: patientId),
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
    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: [
        _StatCard(
          icon: Icons.favorite_outline,
          label: 'Biological Age',
          value: '34',
          unit: 'years',
          trend: -3,
          trendLabel: 'vs chronological',
        ),
        _StatCard(
          icon: Icons.science_outlined,
          label: 'Biomarkers Tracked',
          value: '47',
          unit: 'markers',
          trend: 5,
          trendLabel: 'new this month',
        ),
        _StatCard(
          icon: Icons.watch_outlined,
          label: 'Avg HRV',
          value: '58',
          unit: 'ms',
          trend: 12,
          trendLabel: '% improvement',
        ),
        _StatCard(
          icon: Icons.bedtime_outlined,
          label: 'Sleep Score',
          value: '82',
          unit: '/100',
          trend: 4,
          trendLabel: 'points this week',
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String unit;
  final int trend;
  final String trendLabel;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.unit,
    required this.trend,
    required this.trendLabel,
  });

  @override
  Widget build(BuildContext context) {
    final isPositive = trend >= 0;

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
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                isPositive ? Icons.trending_up : Icons.trending_down,
                size: 16,
                color: isPositive
                    ? MystasisTheme.softAlgae
                    : MystasisTheme.errorRed,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  '${trend.abs()} $trendLabel',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: isPositive
                        ? MystasisTheme.softAlgae
                        : MystasisTheme.errorRed,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
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
              TextButton(onPressed: () {}, child: const Text('View Details')),
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
                if (patientId != null)
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
    final activities = [
      _Activity('Lab results uploaded', '2 hours ago'),
      _Activity('Sleep data synced', '5 hours ago'),
      _Activity('Weight logged: 68.2 kg', 'Yesterday'),
      _Activity('Supplement log updated', '2 days ago'),
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
            'Recent Activity',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          ...activities.map((a) => _ActivityRow(activity: a)),
        ],
      ),
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
