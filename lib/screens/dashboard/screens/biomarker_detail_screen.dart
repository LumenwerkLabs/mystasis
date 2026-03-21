import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';

/// Full trend chart view for a single biomarker type.
/// Shown as a dialog from the biomarkers screen.
class BiomarkerDetailScreen extends StatefulWidget {
  final String biomarkerType;
  final String biomarkerName;
  final String patientId;
  final double currentValue;
  final String unit;
  final String status;

  const BiomarkerDetailScreen({
    super.key,
    required this.biomarkerType,
    required this.biomarkerName,
    required this.patientId,
    required this.currentValue,
    required this.unit,
    required this.status,
  });

  @override
  State<BiomarkerDetailScreen> createState() => _BiomarkerDetailScreenState();
}

class _BiomarkerDetailScreenState extends State<BiomarkerDetailScreen> {
  int _selectedRangeDays = 90;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTrend();
    });
  }

  void _loadTrend() {
    final now = DateTime.now();
    context.read<BiomarkersProvider>().loadTrend(
          widget.patientId,
          widget.biomarkerType,
          startDate: now.subtract(Duration(days: _selectedRangeDays)),
          endDate: now,
        );
  }

  void _selectRange(int days) {
    setState(() => _selectedRangeDays = days);
    _loadTrend();
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = widget.status == 'optimal'
        ? MystasisTheme.softAlgae
        : widget.status == 'borderline'
            ? MystasisTheme.signalAmber
            : MystasisTheme.errorRed;

    final range = BiomarkerModel.referenceRanges[widget.biomarkerType];

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Consumer<BiomarkersProvider>(
        builder: (context, provider, _) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.biomarkerName,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              '${widget.currentValue.toStringAsFixed(widget.currentValue % 1 == 0 ? 0 : 1)} ${widget.unit}',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(widget.status,
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelSmall
                                      ?.copyWith(
                                          color: statusColor,
                                          fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Date range chips
              Row(
                children: [
                  _RangeChip('7d', 7, _selectedRangeDays, _selectRange),
                  const SizedBox(width: 8),
                  _RangeChip('30d', 30, _selectedRangeDays, _selectRange),
                  const SizedBox(width: 8),
                  _RangeChip('90d', 90, _selectedRangeDays, _selectRange),
                  const SizedBox(width: 8),
                  _RangeChip('1y', 365, _selectedRangeDays, _selectRange),
                  if (range != null) ...[
                    const Spacer(),
                    Text(
                      'Optimal: ${range.$1.toStringAsFixed(0)}-${range.$2.toStringAsFixed(0)} ${widget.unit}',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: MystasisTheme.neutralGrey),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 24),

              // Chart
              if (provider.isTrendLoading)
                const SizedBox(
                  height: 250,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (provider.trendError != null)
                SizedBox(
                  height: 250,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(provider.trendError!),
                        const SizedBox(height: 8),
                        TextButton(
                            onPressed: _loadTrend,
                            child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              else if (provider.trendData.isEmpty)
                const SizedBox(
                  height: 250,
                  child: Center(
                      child: Text('No data available for this period.')),
                )
              else ...[
                // Line chart
                SizedBox(
                  height: 250,
                  child: _TrendLineChart(
                    data: provider.trendData,
                    unit: widget.unit,
                    referenceRange: range,
                  ),
                ),
                const SizedBox(height: 16),

                // Stats row
                _StatsRow(data: provider.trendData, unit: widget.unit),
                const SizedBox(height: 16),

                // History list
                Flexible(
                  child: _HistoryList(
                      data: provider.trendData, unit: widget.unit),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _RangeChip extends StatelessWidget {
  final String label;
  final int days;
  final int selectedDays;
  final ValueChanged<int> onSelect;

  const _RangeChip(this.label, this.days, this.selectedDays, this.onSelect);

  @override
  Widget build(BuildContext context) {
    final isSelected = days == selectedDays;
    return GestureDetector(
      onTap: () => onSelect(days),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? MystasisTheme.deepBioTeal.withValues(alpha: 0.15)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? MystasisTheme.deepBioTeal
                : MystasisTheme.mistGrey,
          ),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: isSelected
                    ? MystasisTheme.deepBioTeal
                    : MystasisTheme.neutralGrey,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
        ),
      ),
    );
  }
}

class _TrendLineChart extends StatelessWidget {
  final List<BiomarkerModel> data;
  final String unit;
  final (double, double)? referenceRange;

  const _TrendLineChart({
    required this.data,
    required this.unit,
    this.referenceRange,
  });

  @override
  Widget build(BuildContext context) {
    final sorted = List<BiomarkerModel>.from(data)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    final spots = sorted
        .map((b) => FlSpot(
              b.timestamp.millisecondsSinceEpoch.toDouble(),
              b.value,
            ))
        .toList();

    final values = sorted.map((b) => b.value).toList();
    final minY = values.reduce((a, b) => a < b ? a : b);
    final maxY = values.reduce((a, b) => a > b ? a : b);
    final padding = (maxY - minY) * 0.15;

    final rangeAnnotations = <HorizontalRangeAnnotation>[];
    if (referenceRange != null) {
      rangeAnnotations.add(HorizontalRangeAnnotation(
        y1: referenceRange!.$1,
        y2: referenceRange!.$2,
        color: MystasisTheme.softAlgae.withValues(alpha: 0.08),
      ));
    }

    return LineChart(
      LineChartData(
        minY: (minY - padding).clamp(0, double.infinity),
        maxY: maxY + padding,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (value) => FlLine(
            color: MystasisTheme.mistGrey,
            strokeWidth: 1,
          ),
        ),
        titlesData: FlTitlesData(
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) {
                final date =
                    DateTime.fromMillisecondsSinceEpoch(value.toInt());
                const months = [
                  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
                ];
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    '${months[date.month - 1]} ${date.day}',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(
                            color: MystasisTheme.neutralGrey, fontSize: 10),
                  ),
                );
              },
              interval: _getInterval(sorted),
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 48,
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toStringAsFixed(value % 1 == 0 ? 0 : 1),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: MystasisTheme.neutralGrey, fontSize: 10),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        rangeAnnotations: RangeAnnotations(
          horizontalRangeAnnotations: rangeAnnotations,
        ),
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (touchedSpots) {
              return touchedSpots.map((spot) {
                final date =
                    DateTime.fromMillisecondsSinceEpoch(spot.x.toInt());
                return LineTooltipItem(
                  '${spot.y.toStringAsFixed(1)} $unit\n${date.month}/${date.day}/${date.year}',
                  Theme.of(context).textTheme.bodySmall!.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                );
              }).toList();
            },
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            preventCurveOverShooting: true,
            color: MystasisTheme.deepBioTeal,
            barWidth: 3,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) =>
                  FlDotCirclePainter(
                radius: 4,
                color: MystasisTheme.deepBioTeal,
                strokeWidth: 2,
                strokeColor: Colors.white,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              color: MystasisTheme.deepBioTeal.withValues(alpha: 0.08),
            ),
          ),
        ],
      ),
    );
  }

  double _getInterval(List<BiomarkerModel> sorted) {
    if (sorted.length < 2) return 1;
    final totalMs = sorted.last.timestamp.millisecondsSinceEpoch -
        sorted.first.timestamp.millisecondsSinceEpoch;
    // Aim for ~5 labels
    return (totalMs / 5).clamp(86400000, double.infinity); // min 1 day
  }
}

class _StatsRow extends StatelessWidget {
  final List<BiomarkerModel> data;
  final String unit;

  const _StatsRow({required this.data, required this.unit});

  @override
  Widget build(BuildContext context) {
    final values = data.map((b) => b.value).toList();
    final min = values.reduce((a, b) => a < b ? a : b);
    final max = values.reduce((a, b) => a > b ? a : b);
    final avg = values.reduce((a, b) => a + b) / values.length;

    final sorted = List<BiomarkerModel>.from(data)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    final change = sorted.length >= 2
        ? ((sorted.last.value - sorted.first.value) / sorted.first.value) * 100
        : 0.0;

    return Row(
      children: [
        _StatItem('Min', '${min.toStringAsFixed(1)} $unit'),
        _StatItem('Max', '${max.toStringAsFixed(1)} $unit'),
        _StatItem('Avg', '${avg.toStringAsFixed(1)} $unit'),
        _StatItem(
          'Change',
          '${change >= 0 ? '+' : ''}${change.toStringAsFixed(1)}%',
          color: change.abs() < 5
              ? MystasisTheme.neutralGrey
              : change > 0
                  ? MystasisTheme.signalAmber
                  : MystasisTheme.softAlgae,
        ),
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _StatItem(this.label, this.value, {this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: MystasisTheme.neutralGrey)),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
          ),
        ],
      ),
    );
  }
}

class _HistoryList extends StatelessWidget {
  final List<BiomarkerModel> data;
  final String unit;

  const _HistoryList({required this.data, required this.unit});

  @override
  Widget build(BuildContext context) {
    final sorted = List<BiomarkerModel>.from(data)
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

    return ListView.separated(
      shrinkWrap: true,
      itemCount: sorted.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final b = sorted[index];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _formatDate(b.timestamp),
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: MystasisTheme.neutralGrey),
                ),
              ),
              Text(
                '${b.value.toStringAsFixed(b.value % 1 == 0 ? 0 : 1)} $unit',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w500),
              ),
              if (b.source != null) ...[
                const SizedBox(width: 12),
                Text(
                  b.source!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: MystasisTheme.neutralGrey, fontSize: 10),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime dt) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    return '${months[dt.month - 1]} ${dt.day} at $hour:${dt.minute.toString().padLeft(2, '0')} $amPm';
  }
}
