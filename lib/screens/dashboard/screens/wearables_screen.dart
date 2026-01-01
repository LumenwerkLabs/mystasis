import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';

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
      _Device('Apple Watch Ultra 2', 'apple', true, '72%', 'Synced 12 min ago'),
      _Device('Whoop 4.0', 'whoop', false, '-', 'Last synced 2 days ago'),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: devices
            .map(
              (d) => Padding(
                padding: const EdgeInsets.only(right: 16),
                child: _DeviceCard(device: d),
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
              Text('Today', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '68',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: 48,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'bpm current',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const _HRZonesChart(),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _HRStat(
                label: 'Resting',
                value: '52',
                color: MystasisTheme.softAlgae,
              ),
              _HRStat(
                label: 'Average',
                value: '68',
                color: MystasisTheme.cellularBlue,
              ),
              _HRStat(
                label: 'Max',
                value: '142',
                color: MystasisTheme.signalAmber,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HRZonesChart extends StatelessWidget {
  const _HRZonesChart();

  @override
  Widget build(BuildContext context) {
    // Mock HR data for 24 hours
    final hours = List.generate(24, (i) => i);
    final hrData = [
      52,
      51,
      50,
      49,
      52,
      58,
      72,
      85,
      78,
      72,
      68,
      95,
      88,
      75,
      70,
      68,
      65,
      82,
      78,
      72,
      68,
      62,
      58,
      54,
    ];

    return SizedBox(
      height: 80,
      child: CustomPaint(
        size: const Size(double.infinity, 80),
        painter: _HRChartPainter(hours: hours, values: hrData),
      ),
    );
  }
}

class _HRChartPainter extends CustomPainter {
  final List<int> hours;
  final List<int> values;

  _HRChartPainter({required this.hours, required this.values});

  @override
  void paint(Canvas canvas, Size size) {
    final barWidth = size.width / values.length - 2;

    for (var i = 0; i < values.length; i++) {
      final hr = values[i];
      final color = hr < 60
          ? MystasisTheme.softAlgae
          : hr < 100
          ? MystasisTheme.cellularBlue
          : MystasisTheme.signalAmber;

      final barHeight = (hr / 150) * size.height;
      final x = i * (size.width / values.length);

      final paint = Paint()
        ..color = color.withValues(alpha: 0.7)
        ..style = PaintingStyle.fill;

      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, size.height - barHeight, barWidth, barHeight),
          const Radius.circular(2),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
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
              Text('Last night', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '7h 42m',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: MystasisTheme.softAlgae.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Score: 82',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: MystasisTheme.softAlgae,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Sleep stages
          const _SleepStagesBar(),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _SleepStat(
                label: 'Deep',
                value: '1h 24m',
                percentage: 18,
                color: Colors.indigo[700]!,
              ),
              _SleepStat(
                label: 'REM',
                value: '1h 48m',
                percentage: 23,
                color: Colors.indigo[400]!,
              ),
              _SleepStat(
                label: 'Light',
                value: '4h 12m',
                percentage: 55,
                color: Colors.indigo[200]!,
              ),
              _SleepStat(
                label: 'Awake',
                value: '18m',
                percentage: 4,
                color: MystasisTheme.neutralGrey,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SleepStagesBar extends StatelessWidget {
  const _SleepStagesBar();

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        height: 24,
        child: Row(
          children: [
            Expanded(flex: 18, child: Container(color: Colors.indigo[700])),
            Expanded(flex: 23, child: Container(color: Colors.indigo[400])),
            Expanded(flex: 55, child: Container(color: Colors.indigo[200])),
            Expanded(
              flex: 4,
              child: Container(
                color: MystasisTheme.neutralGrey.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
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
              Text('Today', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ActivityRing(
                label: 'Steps',
                value: '8,432',
                goal: '10,000',
                progress: 0.84,
                color: MystasisTheme.deepBioTeal,
              ),
              _ActivityRing(
                label: 'Calories',
                value: '2,180',
                goal: '2,500',
                progress: 0.87,
                color: MystasisTheme.signalAmber,
              ),
              _ActivityRing(
                label: 'Active Min',
                value: '45',
                goal: '60',
                progress: 0.75,
                color: MystasisTheme.softAlgae,
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          _ActivityMetric(
            icon: Icons.straighten,
            label: 'Distance',
            value: '6.2 km',
          ),
          const SizedBox(height: 12),
          _ActivityMetric(icon: Icons.stairs, label: 'Floors', value: '12'),
          const SizedBox(height: 12),
          _ActivityMetric(
            icon: Icons.local_fire_department,
            label: 'Active calories',
            value: '420 kcal',
          ),
        ],
      ),
    );
  }
}

class _ActivityRing extends StatelessWidget {
  final String label;
  final String value;
  final String goal;
  final double progress;
  final Color color;

  const _ActivityRing({
    required this.label,
    required this.value,
    required this.goal,
    required this.progress,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: 70,
          height: 70,
          child: Stack(
            children: [
              CircularProgressIndicator(
                value: 1,
                strokeWidth: 6,
                backgroundColor: color.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation(
                  color.withValues(alpha: 0.15),
                ),
              ),
              CircularProgressIndicator(
                value: progress,
                strokeWidth: 6,
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation(color),
              ),
              Center(
                child: Text(
                  '${(progress * 100).toInt()}%',
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
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
    final weekData = [52, 48, 55, 61, 58, 63, 58];
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
              Text('This week', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '58',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: 48,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'ms average',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  const Icon(
                    Icons.trending_up,
                    size: 18,
                    color: MystasisTheme.softAlgae,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '+12% vs last week',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: MystasisTheme.softAlgae,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 120,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(7, (i) {
                final value = weekData[i];
                final maxValue = 80;
                final height = (value / maxValue) * 100;
                final isToday = i == 6;

                return Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      '$value',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: isToday
                            ? MystasisTheme.deepBioTeal
                            : MystasisTheme.neutralGrey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      width: 24,
                      height: height,
                      decoration: BoxDecoration(
                        color: isToday
                            ? MystasisTheme.deepBioTeal
                            : MystasisTheme.cellularBlue.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      days[i],
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
