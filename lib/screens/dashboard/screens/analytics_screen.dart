import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/analytics_models.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/providers/analytics_provider.dart';
import 'package:mystasis/providers/auth_provider.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final clinicId = context.read<AuthProvider>().user?.clinicId;
      if (clinicId != null) {
        context.read<AnalyticsProvider>().loadAnalytics(clinicId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final clinicId = context.watch<AuthProvider>().user?.clinicId;

    if (clinicId == null) {
      return Center(
        child: Text(
          'No clinic assigned.',
          style: Theme.of(context)
              .textTheme
              .bodyLarge
              ?.copyWith(color: MystasisTheme.neutralGrey),
        ),
      );
    }

    return Consumer<AnalyticsProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(48),
              child: CircularProgressIndicator(),
            ),
          );
        }

        if (provider.errorMessage != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(48),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
                  const SizedBox(height: 16),
                  Text(provider.errorMessage!,
                      style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => provider.reloadAnalytics(clinicId),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Text('Analytics',
                      style: Theme.of(context).textTheme.headlineLarge),
                  const Spacer(),
                  IconButton(
                    onPressed: () => provider.reloadAnalytics(clinicId),
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Refresh',
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Population-level insights for your clinic',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: MystasisTheme.neutralGrey),
              ),
              const SizedBox(height: 24),

              // Stat cards row
              if (provider.summary != null)
                _CohortStatsRow(summary: provider.summary!),
              const SizedBox(height: 24),

              // Main content
              LayoutBuilder(
                builder: (context, constraints) {
                  if (constraints.maxWidth > 900) {
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              if (provider.riskDistribution != null)
                                _RiskDistributionCard(
                                    data: provider.riskDistribution!),
                              const SizedBox(height: 24),
                              if (provider.alertStatistics != null)
                                _AlertStatisticsCard(
                                    data: provider.alertStatistics!),
                            ],
                          ),
                        ),
                        const SizedBox(width: 24),
                        Expanded(
                          child: _TrendCard(clinicId: clinicId),
                        ),
                      ],
                    );
                  }
                  return Column(
                    children: [
                      if (provider.riskDistribution != null)
                        _RiskDistributionCard(
                            data: provider.riskDistribution!),
                      const SizedBox(height: 24),
                      if (provider.alertStatistics != null)
                        _AlertStatisticsCard(
                            data: provider.alertStatistics!),
                      const SizedBox(height: 24),
                      _TrendCard(clinicId: clinicId),
                    ],
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

// --- Cohort Stats Row ---

class _CohortStatsRow extends StatelessWidget {
  final CohortSummary summary;

  const _CohortStatsRow({required this.summary});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: [
        _StatCard(
          icon: Icons.people_outline,
          label: 'Total Patients',
          value: '${summary.totalPatients}',
        ),
        _StatCard(
          icon: Icons.monitor_heart_outlined,
          label: 'Active Patients',
          value: '${summary.activePatients}',
        ),
        _StatCard(
          icon: Icons.notifications_active_outlined,
          label: 'With Alerts',
          value: '${summary.patientsWithAlerts}',
          valueColor: summary.patientsWithAlerts > 0
              ? MystasisTheme.errorRed
              : null,
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
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
                child: Text(label,
                    style: Theme.of(context).textTheme.bodySmall,
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: valueColor,
                ),
          ),
        ],
      ),
    );
  }
}

// --- Risk Distribution Card ---

class _RiskDistributionCard extends StatelessWidget {
  final RiskDistribution data;

  const _RiskDistributionCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final maxVal =
        [data.low, data.medium, data.high, data.critical].reduce((a, b) => a > b ? a : b);

    return _CardContainer(
      title: 'Risk Distribution',
      icon: Icons.shield_outlined,
      child: Column(
        children: [
          _RiskBar(label: 'Low', count: data.low, maxCount: maxVal,
              color: MystasisTheme.softAlgae),
          const SizedBox(height: 12),
          _RiskBar(label: 'Medium', count: data.medium, maxCount: maxVal,
              color: MystasisTheme.signalAmber),
          const SizedBox(height: 12),
          _RiskBar(label: 'High', count: data.high, maxCount: maxVal,
              color: MystasisTheme.errorRed),
          const SizedBox(height: 12),
          _RiskBar(label: 'Critical', count: data.critical, maxCount: maxVal,
              color: const Color(0xFF8B0000)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                '${data.total} patients total',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: MystasisTheme.neutralGrey),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RiskBar extends StatelessWidget {
  final String label;
  final int count;
  final int maxCount;
  final Color color;

  const _RiskBar({
    required this.label,
    required this.count,
    required this.maxCount,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final fraction = maxCount > 0 ? count / maxCount : 0.0;

    return Row(
      children: [
        SizedBox(
          width: 60,
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: fraction,
              backgroundColor: MystasisTheme.mistGrey,
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 20,
            ),
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 30,
          child: Text(
            '$count',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(fontWeight: FontWeight.w600),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}

// --- Alert Statistics Card ---

class _AlertStatisticsCard extends StatelessWidget {
  final AlertStatistics data;

  const _AlertStatisticsCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return _CardContainer(
      title: 'Alert Statistics',
      icon: Icons.notifications_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Total + resolution time
          Row(
            children: [
              Text(
                '${data.totalAlerts} total alerts',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: MystasisTheme.deepBioTeal.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Avg resolution: ${data.averageResolutionTimeHours}h',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: MystasisTheme.deepBioTeal,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // By Status
          Text('By Status',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: MystasisTheme.neutralGrey)),
          const SizedBox(height: 8),
          _StatusRow('Active', data.byStatus.active, MystasisTheme.errorRed),
          _StatusRow('Acknowledged', data.byStatus.acknowledged,
              MystasisTheme.signalAmber),
          _StatusRow(
              'Resolved', data.byStatus.resolved, MystasisTheme.softAlgae),
          _StatusRow(
              'Dismissed', data.byStatus.dismissed, MystasisTheme.neutralGrey),
          const SizedBox(height: 16),

          // By Severity
          Text('By Severity',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: MystasisTheme.neutralGrey)),
          const SizedBox(height: 8),
          _StatusRow('Low', data.bySeverity.low, MystasisTheme.neutralGrey),
          _StatusRow(
              'Medium', data.bySeverity.medium, MystasisTheme.signalAmber),
          _StatusRow('High', data.bySeverity.high, MystasisTheme.errorRed),
          _StatusRow(
              'Critical', data.bySeverity.critical, const Color(0xFF8B0000)),
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _StatusRow(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          Text(
            '$count',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// --- Population Trends Card ---

class _TrendCard extends StatelessWidget {
  final String clinicId;

  const _TrendCard({required this.clinicId});

  static const _biomarkerTypes = [
    'HEART_RATE',
    'HEART_RATE_VARIABILITY',
    'RESTING_HEART_RATE',
    'GLUCOSE',
    'HBA1C',
    'CHOLESTEROL_LDL',
    'CHOLESTEROL_HDL',
    'TRIGLYCERIDES',
    'VITAMIN_D',
    'B12',
    'FERRITIN',
    'TSH',
    'TESTOSTERONE',
    'CORTISOL',
    'CRP',
    'WEIGHT',
    'BMI',
    'STEPS',
    'SLEEP_DURATION',
    'VO2_MAX',
  ];

  @override
  Widget build(BuildContext context) {
    return Consumer<AnalyticsProvider>(
      builder: (context, provider, _) {
        final trend = provider.trendSummary;

        return _CardContainer(
          title: 'Population Trends',
          icon: Icons.trending_up,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Biomarker selector
              DropdownButtonFormField<String>(
                initialValue: provider.selectedBiomarkerType,
                decoration: const InputDecoration(
                  labelText: 'Biomarker Type',
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                items: _biomarkerTypes.map((type) {
                  final name = BiomarkerModel.displayNameFor(type) ?? type;
                  return DropdownMenuItem(value: type, child: Text(name));
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    provider.setSelectedBiomarkerType(value, clinicId);
                  }
                },
              ),
              const SizedBox(height: 20),

              if (provider.isTrendLoading)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (trend == null)
                Text(
                  'No trend data available.',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: MystasisTheme.neutralGrey),
                )
              else ...[
                // Summary row
                Row(
                  children: [
                    _TrendStat(
                        label: 'Average',
                        value:
                            '${trend.populationAverage.toStringAsFixed(1)} ${trend.unit}'),
                    const SizedBox(width: 16),
                    _TrendStat(
                        label: 'Min',
                        value: trend.populationMin.toStringAsFixed(1)),
                    const SizedBox(width: 16),
                    _TrendStat(
                        label: 'Max',
                        value: trend.populationMax.toStringAsFixed(1)),
                    const SizedBox(width: 16),
                    _TrendBadge(trend: trend.trend),
                  ],
                ),
                const SizedBox(height: 16),

                // Data points
                if (trend.dataPoints.isNotEmpty) ...[
                  Text('Daily Data',
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium
                          ?.copyWith(color: MystasisTheme.neutralGrey)),
                  const SizedBox(height: 8),
                  ...trend.dataPoints.take(10).map(
                        (dp) => _DataPointRow(dataPoint: dp, unit: trend.unit),
                      ),
                  if (trend.dataPoints.length > 10)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        '+ ${trend.dataPoints.length - 10} more days',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: MystasisTheme.neutralGrey),
                      ),
                    ),
                ],
              ],
            ],
          ),
        );
      },
    );
  }
}

class _TrendStat extends StatelessWidget {
  final String label;
  final String value;

  const _TrendStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(color: MystasisTheme.neutralGrey)),
        Text(value,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _TrendBadge extends StatelessWidget {
  final String trend;

  const _TrendBadge({required this.trend});

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (trend) {
      'increasing' => (MystasisTheme.softAlgae, Icons.trending_up),
      'decreasing' => (MystasisTheme.errorRed, Icons.trending_down),
      _ => (MystasisTheme.neutralGrey, Icons.trending_flat),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            trend,
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(color: color, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _DataPointRow extends StatelessWidget {
  final TrendDataPoint dataPoint;
  final String unit;

  const _DataPointRow({required this.dataPoint, required this.unit});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(dataPoint.date,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: MystasisTheme.neutralGrey)),
          ),
          Expanded(
            child: Text(
              '${dataPoint.averageValue.toStringAsFixed(1)} $unit',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w500),
            ),
          ),
          Text(
            'n=${dataPoint.sampleSize}',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: MystasisTheme.neutralGrey),
          ),
        ],
      ),
    );
  }
}

// --- Shared Card Container ---

class _CardContainer extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _CardContainer({
    required this.title,
    required this.icon,
    required this.child,
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
              Text(title,
                  style: Theme.of(context).textTheme.headlineSmall),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
