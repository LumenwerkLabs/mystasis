import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/screens/dashboard/screens/biomarker_detail_screen.dart';

class BiomarkersScreen extends StatefulWidget {
  final String? patientId;

  const BiomarkersScreen({super.key, this.patientId});

  @override
  State<BiomarkersScreen> createState() => _BiomarkersPageState();
}

class _BiomarkersPageState extends State<BiomarkersScreen> {
  String _selectedCategory = 'All';
  final _categories = [
    'All',
    'Metabolic',
    'Cardiovascular',
    'Hormonal',
    'Inflammatory',
    'Vitamins',
  ];

  @override
  Widget build(BuildContext context) {
    return Consumer<BiomarkersProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.errorMessage != null) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline, size: 48, color: MystasisTheme.errorRed),
                const SizedBox(height: 16),
                Text(
                  provider.errorMessage!,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 16),
                if (widget.patientId != null)
                  ElevatedButton(
                    onPressed: () => provider.reloadBiomarkers(widget.patientId!),
                    child: const Text('Retry'),
                  ),
              ],
            ),
          );
        }

        // Group biomarkers by type, get latest reading per type plus history
        final grouped = provider.groupedByType;
        final biomarkerCards = <_BiomarkerCardData>[];

        for (final entry in grouped.entries) {
          final readings = entry.value
            ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
          final latest = readings.last;
          final history = readings.map((r) => r.value).toList();
          final range = BiomarkerModel.referenceRanges[latest.type];

          biomarkerCards.add(_BiomarkerCardData(
            type: latest.type,
            name: latest.displayName,
            category: latest.category,
            value: latest.value,
            unit: latest.unit,
            optimalMin: range?.$1 ?? 0,
            optimalMax: range?.$2 ?? 100,
            history: history,
            lastUpdated: _formatDate(latest.timestamp),
            statusOverride: latest.status,
          ));
        }

        final filteredCards = biomarkerCards.where(
          (b) => _selectedCategory == 'All' || b.category == _selectedCategory,
        );

        final markerCount = biomarkerCards.length;
        final categoryCount = biomarkerCards.map((b) => b.category).toSet().length;

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
                        'Biomarkers',
                        style: Theme.of(context).textTheme.headlineLarge,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$markerCount markers tracked across $categoryCount categories',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: MystasisTheme.neutralGrey,
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.add, size: 20),
                    label: const Text('Upload Results'),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Category filters
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _categories.map((cat) {
                    final isSelected = cat == _selectedCategory;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(cat),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() => _selectedCategory = cat);
                        },
                        selectedColor: MystasisTheme.deepBioTeal.withValues(
                          alpha: 0.15,
                        ),
                        checkmarkColor: MystasisTheme.deepBioTeal,
                        labelStyle: TextStyle(
                          color: isSelected
                              ? MystasisTheme.deepBioTeal
                              : MystasisTheme.deepGraphite,
                          fontWeight: isSelected
                              ? FontWeight.w500
                              : FontWeight.w400,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 24),

              if (filteredCards.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(48),
                    child: Text(
                      'No biomarkers found for this category.',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: MystasisTheme.neutralGrey,
                      ),
                    ),
                  ),
                )
              else
                // Biomarker cards grid
                LayoutBuilder(
                  builder: (context, constraints) {
                    final crossAxisCount = constraints.maxWidth > 1200
                        ? 3
                        : constraints.maxWidth > 800
                        ? 2
                        : 1;
                    return Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: filteredCards
                          .map(
                            (b) => SizedBox(
                              width: (constraints.maxWidth -
                                      (crossAxisCount - 1) * 16) /
                                  crossAxisCount,
                              child: GestureDetector(
                                onTap: () => _openDetail(context, b),
                                child: _BiomarkerCard(biomarker: b),
                              ),
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  void _openDetail(BuildContext context, _BiomarkerCardData biomarker) {
    if (widget.patientId == null) return;
    showDialog(
      context: context,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.all(24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 800, maxHeight: 700),
          child: BiomarkerDetailScreen(
            biomarkerType: biomarker.type,
            biomarkerName: biomarker.name,
            patientId: widget.patientId!,
            currentValue: biomarker.value,
            unit: biomarker.unit,
            status: biomarker.status,
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

class _BiomarkerCardData {
  final String type;
  final String name;
  final String category;
  final double value;
  final String unit;
  final double optimalMin;
  final double optimalMax;
  final List<double> history;
  final String lastUpdated;
  final String statusOverride;

  _BiomarkerCardData({
    required this.type,
    required this.name,
    required this.category,
    required this.value,
    required this.unit,
    required this.optimalMin,
    required this.optimalMax,
    required this.history,
    required this.lastUpdated,
    required this.statusOverride,
  });

  String get status => statusOverride;

  double get trend {
    if (history.length < 2) return 0;
    return ((history.last - history.first) / history.first) * 100;
  }
}

class _BiomarkerCard extends StatelessWidget {
  final _BiomarkerCardData biomarker;

  const _BiomarkerCard({required this.biomarker});

  @override
  Widget build(BuildContext context) {
    final statusColor = biomarker.status == 'optimal'
        ? MystasisTheme.softAlgae
        : biomarker.status == 'borderline'
        ? MystasisTheme.signalAmber
        : MystasisTheme.errorRed;

    return Container(
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
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  biomarker.name,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  biomarker.status,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            biomarker.category,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),

          // Value
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                biomarker.value.toStringAsFixed(
                  biomarker.value % 1 == 0 ? 0 : 1,
                ),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 6),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  biomarker.unit,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              const Spacer(),
              if (biomarker.trend != 0)
                Row(
                  children: [
                    Icon(
                      biomarker.trend > 0
                          ? Icons.trending_up
                          : Icons.trending_down,
                      size: 16,
                      color: _getTrendColor(),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${biomarker.trend.abs().toStringAsFixed(1)}%',
                      style: Theme.of(
                        context,
                      ).textTheme.labelSmall?.copyWith(color: _getTrendColor()),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Mini chart
          SizedBox(
            height: 40,
            child: CustomPaint(
              size: const Size(double.infinity, 40),
              painter: _MiniChartPainter(
                values: biomarker.history,
                color: statusColor,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Range
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Optimal: ${biomarker.optimalMin.toStringAsFixed(0)}-${biomarker.optimalMax.toStringAsFixed(0)} ${biomarker.unit}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: MystasisTheme.neutralGrey,
                ),
              ),
              Text(
                biomarker.lastUpdated,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: MystasisTheme.neutralGrey,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getTrendColor() {
    if (biomarker.status == 'optimal') return MystasisTheme.softAlgae;
    return biomarker.trend > 0
        ? MystasisTheme.signalAmber
        : MystasisTheme.softAlgae;
  }
}

class _MiniChartPainter extends CustomPainter {
  final List<double> values;
  final Color color;

  _MiniChartPainter({required this.values, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [color.withValues(alpha: 0.3), color.withValues(alpha: 0.0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final minVal = values.reduce((a, b) => a < b ? a : b);
    final maxVal = values.reduce((a, b) => a > b ? a : b);
    final range = maxVal - minVal;

    final path = Path();
    final fillPath = Path();

    for (var i = 0; i < values.length; i++) {
      final x = i * size.width / (values.length - 1);
      final y = range == 0
          ? size.height / 2
          : size.height - ((values[i] - minVal) / range) * size.height;

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);

    // Draw last point
    final lastX = size.width;
    final lastY = range == 0
        ? size.height / 2
        : size.height - ((values.last - minVal) / range) * size.height;
    canvas.drawCircle(Offset(lastX, lastY), 4, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _MiniChartPainter oldDelegate) =>
      oldDelegate.values != values || oldDelegate.color != color;
}
