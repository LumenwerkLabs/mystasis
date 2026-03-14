import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';

class WearablesScreen extends StatelessWidget {
  const WearablesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Wearables',
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Connected devices and real-time health data',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: MystasisTheme.neutralGrey,
                    ),
                  ),
                ],
              ),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 20),
                label: const Text('Connect Device'),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Connected Devices
          const _ConnectedDevicesSection(),
          const SizedBox(height: 32),

          // Data Overview
          Text(
            'Data Overview',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),

          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth > 900) {
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
      children: [_HeartRateCard(), SizedBox(height: 24), _SleepCard()],
    );
  }

  Widget _buildRightColumn() {
    return const Column(
      children: [_ActivityCard(), SizedBox(height: 24), _HRVCard()],
    );
  }
}

class _ConnectedDevicesSection extends StatelessWidget {
  const _ConnectedDevicesSection();

  @override
  Widget build(BuildContext context) {
    final devices = [
      _Device('Oura Ring Gen 3', 'oura', true, '98%', 'Synced 5 min ago'),
      _Device('Apple Health', 'apple', true, '-', 'Tap to sync'),
      _Device('Whoop 4.0', 'whoop', false, '-', 'Last synced 2 days ago'),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: devices
            .map(
              (d) => Padding(
                padding: const EdgeInsets.only(right: 16),
                child: GestureDetector(
                  onTap: d.brand == 'apple'
                      ? () => Navigator.pushNamed(context, '/health-sync')
                      : null,
                  child: _DeviceCard(device: d),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _Device {
  final String name;
  final String brand;
  final bool connected;
  final String battery;
  final String lastSync;

  _Device(this.name, this.brand, this.connected, this.battery, this.lastSync);
}

class _DeviceCard extends StatelessWidget {
  final _Device device;

  const _DeviceCard({required this.device});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: device.connected
            ? Border.all(
                color: MystasisTheme.deepBioTeal.withValues(alpha: 0.3),
                width: 1.5,
              )
            : null,
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
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: MystasisTheme.mistGrey,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _getDeviceIcon(),
                  color: MystasisTheme.deepGraphite,
                  size: 24,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: device.connected
                      ? MystasisTheme.softAlgae.withValues(alpha: 0.12)
                      : MystasisTheme.neutralGrey.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: device.connected
                            ? MystasisTheme.softAlgae
                            : MystasisTheme.neutralGrey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      device.connected ? 'Connected' : 'Offline',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: device.connected
                            ? MystasisTheme.softAlgae
                            : MystasisTheme.neutralGrey,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            device.name,
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(device.lastSync, style: Theme.of(context).textTheme.bodySmall),
          if (device.connected) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.battery_std,
                  size: 16,
                  color: MystasisTheme.neutralGrey,
                ),
                const SizedBox(width: 4),
                Text(
                  device.battery,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  IconData _getDeviceIcon() {
    switch (device.brand) {
      case 'oura':
        return Icons.radio_button_checked;
      case 'apple':
        return Icons.watch;
      case 'whoop':
        return Icons.fitness_center;
      default:
        return Icons.devices;
    }
  }
}

class _HeartRateCard extends StatelessWidget {
  const _HeartRateCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        final latest = provider.latestByType;
        final hr = latest.where((b) => b.type == 'HEART_RATE').firstOrNull;
        final restingHr = latest.where((b) => b.type == 'RESTING_HEART_RATE').firstOrNull;
        final walkingHr = latest.where((b) => b.type == 'WALKING_HEART_RATE').firstOrNull;

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
                  Icon(Icons.favorite, color: Colors.red[400], size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Heart Rate',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const Spacer(),
                  if (hr != null)
                    Text(
                      _formatRelativeTime(hr.timestamp),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    hr != null ? hr.value.toStringAsFixed(0) : '--',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 48,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      'bpm',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: MystasisTheme.neutralGrey,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _HRStat(
                    label: 'Resting',
                    value: restingHr != null ? restingHr.value.toStringAsFixed(0) : '--',
                    color: MystasisTheme.softAlgae,
                  ),
                  _HRStat(
                    label: 'Latest',
                    value: hr != null ? hr.value.toStringAsFixed(0) : '--',
                    color: MystasisTheme.cellularBlue,
                  ),
                  _HRStat(
                    label: 'Walking',
                    value: walkingHr != null ? walkingHr.value.toStringAsFixed(0) : '--',
                    color: MystasisTheme.signalAmber,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _HRStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _HRStat({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _SleepCard extends StatelessWidget {
  const _SleepCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        final latest = provider.latestByType;
        final duration = latest.where((b) => b.type == 'SLEEP_DURATION').firstOrNull;
        final deep = latest.where((b) => b.type == 'SLEEP_DEEP').firstOrNull;
        final rem = latest.where((b) => b.type == 'SLEEP_REM').firstOrNull;
        final light = latest.where((b) => b.type == 'SLEEP_LIGHT').firstOrNull;
        final awake = latest.where((b) => b.type == 'SLEEP_AWAKE').firstOrNull;

        final hasStages = deep != null || rem != null || light != null || awake != null;
        final totalMin = (deep?.value ?? 0) + (rem?.value ?? 0) + (light?.value ?? 0) + (awake?.value ?? 0);

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
                  Icon(Icons.bedtime, color: Colors.indigo[300], size: 24),
                  const SizedBox(width: 8),
                  Text('Sleep', style: Theme.of(context).textTheme.headlineSmall),
                  const Spacer(),
                  if (duration != null)
                    Text(
                      _formatRelativeTime(duration.timestamp),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    duration != null ? _formatHours(duration.value) : '--',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              if (hasStages && totalMin > 0) ...[
                const SizedBox(height: 24),
                // Sleep stages bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: SizedBox(
                    height: 24,
                    child: Row(
                      children: [
                        if (deep != null && deep.value > 0)
                          Expanded(flex: deep.value.round(), child: Container(color: Colors.indigo[700])),
                        if (rem != null && rem.value > 0)
                          Expanded(flex: rem.value.round(), child: Container(color: Colors.indigo[400])),
                        if (light != null && light.value > 0)
                          Expanded(flex: light.value.round(), child: Container(color: Colors.indigo[200])),
                        if (awake != null && awake.value > 0)
                          Expanded(
                            flex: awake.value.round(),
                            child: Container(color: MystasisTheme.neutralGrey.withValues(alpha: 0.5)),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    if (deep != null)
                      _SleepStat(label: 'Deep', value: _formatMinutes(deep.value), percentage: (deep.value / totalMin * 100).round(), color: Colors.indigo[700]!),
                    if (rem != null)
                      _SleepStat(label: 'REM', value: _formatMinutes(rem.value), percentage: (rem.value / totalMin * 100).round(), color: Colors.indigo[400]!),
                    if (light != null)
                      _SleepStat(label: 'Light', value: _formatMinutes(light.value), percentage: (light.value / totalMin * 100).round(), color: Colors.indigo[200]!),
                    if (awake != null)
                      _SleepStat(label: 'Awake', value: _formatMinutes(awake.value), percentage: (awake.value / totalMin * 100).round(), color: MystasisTheme.neutralGrey),
                  ],
                ),
              ] else if (duration == null) ...[
                const SizedBox(height: 16),
                Text(
                  'No sleep data available.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
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

class _SleepStat extends StatelessWidget {
  final String label;
  final String value;
  final int percentage;
  final Color color;

  const _SleepStat({
    required this.label,
    required this.value,
    required this.percentage,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 4),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        final latest = provider.latestByType;
        final steps = latest.where((b) => b.type == 'STEPS').firstOrNull;
        final activeCal = latest.where((b) => b.type == 'ACTIVE_CALORIES').firstOrNull;
        final exerciseTime = latest.where((b) => b.type == 'EXERCISE_TIME').firstOrNull;
        final distance = latest.where((b) => b.type == 'DISTANCE_WALKING_RUNNING').firstOrNull;
        final flights = latest.where((b) => b.type == 'FLIGHTS_CLIMBED').firstOrNull;

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
                    Icons.directions_run,
                    color: MystasisTheme.signalAmber,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Activity',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const Spacer(),
                  if (steps != null)
                    Text(
                      _formatRelativeTime(steps.timestamp),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _ActivityRing(
                    label: 'Steps',
                    value: steps != null ? _formatNumber(steps.value) : '--',
                    color: MystasisTheme.deepBioTeal,
                  ),
                  _ActivityRing(
                    label: 'Calories',
                    value: activeCal != null ? _formatNumber(activeCal.value) : '--',
                    color: MystasisTheme.signalAmber,
                  ),
                  _ActivityRing(
                    label: 'Active Min',
                    value: exerciseTime != null ? exerciseTime.value.toStringAsFixed(0) : '--',
                    color: MystasisTheme.softAlgae,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),
              if (distance != null)
                _ActivityMetric(
                  icon: Icons.straighten,
                  label: 'Distance',
                  value: '${distance.value.toStringAsFixed(1)} ${distance.unit}',
                ),
              if (distance != null) const SizedBox(height: 12),
              if (flights != null)
                _ActivityMetric(
                  icon: Icons.stairs,
                  label: 'Floors',
                  value: flights.value.toStringAsFixed(0),
                ),
              if (flights != null) const SizedBox(height: 12),
              if (activeCal != null)
                _ActivityMetric(
                  icon: Icons.local_fire_department,
                  label: 'Active calories',
                  value: '${activeCal.value.toStringAsFixed(0)} ${activeCal.unit}',
                ),
              if (steps == null && activeCal == null && exerciseTime == null)
                Text(
                  'No activity data available.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ActivityRing extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _ActivityRing({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 70,
          height: 70,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.1),
          ),
          child: Center(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _ActivityMetric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ActivityMetric({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: MystasisTheme.neutralGrey),
        const SizedBox(width: 8),
        Text(label, style: Theme.of(context).textTheme.bodyMedium),
        const Spacer(),
        Text(
          value,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

class _HRVCard extends StatelessWidget {
  const _HRVCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        final hrv = provider.latestByType
            .where((b) => b.type == 'HEART_RATE_VARIABILITY')
            .firstOrNull;

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
                    Icons.monitor_heart,
                    color: MystasisTheme.cellularBlue,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Heart Rate Variability',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const Spacer(),
                  if (hrv != null)
                    Text(
                      _formatRelativeTime(hrv.timestamp),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    hrv != null ? hrv.value.toStringAsFixed(0) : '--',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 48,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      hrv?.unit ?? 'ms',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: MystasisTheme.neutralGrey,
                      ),
                    ),
                  ),
                ],
              ),
              if (hrv == null) ...[
                const SizedBox(height: 16),
                Text(
                  'No HRV data available.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
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

String _formatRelativeTime(DateTime timestamp) {
  final diff = DateTime.now().difference(timestamp);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${timestamp.month}/${timestamp.day}/${timestamp.year}';
}

String _formatHours(double hours) {
  final h = hours.floor();
  final m = ((hours - h) * 60).round();
  if (m == 0) return '${h}h';
  return '${h}h ${m}m';
}

String _formatMinutes(double minutes) {
  if (minutes >= 60) {
    final h = (minutes / 60).floor();
    final m = (minutes % 60).round();
    return '${h}h ${m}m';
  }
  return '${minutes.round()}m';
}

String _formatNumber(double value) {
  if (value >= 1000) {
    return '${(value / 1000).toStringAsFixed(1)}k';
  }
  return value.toStringAsFixed(0);
}
