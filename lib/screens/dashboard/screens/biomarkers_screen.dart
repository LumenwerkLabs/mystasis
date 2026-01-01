import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';

class BiomarkersScreen extends StatefulWidget {
  const BiomarkersScreen({super.key});

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
                    '47 markers tracked across 6 categories',
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
                children: _getMockBiomarkers()
                    .where(
                      (b) =>
                          _selectedCategory == 'All' ||
                          b.category == _selectedCategory,
                    )
                    .map(
                      (b) => SizedBox(
                        width:
                            (constraints.maxWidth - (crossAxisCount - 1) * 16) /
                            crossAxisCount,
                        child: _BiomarkerCard(biomarker: b),
                      ),
                    )
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  List<_Biomarker> _getMockBiomarkers() {
    return [
      // Metabolic
      _Biomarker(
        name: 'Fasting Glucose',
        category: 'Metabolic',
        value: 92,
        unit: 'mg/dL',
        optimalMin: 70,
        optimalMax: 100,
        history: [95, 98, 94, 92],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'HbA1c',
        category: 'Metabolic',
        value: 5.2,
        unit: '%',
        optimalMin: 4.0,
        optimalMax: 5.6,
        history: [5.4, 5.3, 5.3, 5.2],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'Fasting Insulin',
        category: 'Metabolic',
        value: 6.8,
        unit: 'μIU/mL',
        optimalMin: 2.0,
        optimalMax: 8.0,
        history: [8.2, 7.5, 7.1, 6.8],
        lastUpdated: 'Dec 28, 2025',
      ),
      // Cardiovascular
      _Biomarker(
        name: 'LDL Cholesterol',
        category: 'Cardiovascular',
        value: 118,
        unit: 'mg/dL',
        optimalMin: 0,
        optimalMax: 100,
        history: [125, 122, 120, 118],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'HDL Cholesterol',
        category: 'Cardiovascular',
        value: 62,
        unit: 'mg/dL',
        optimalMin: 60,
        optimalMax: 100,
        history: [55, 58, 60, 62],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'Triglycerides',
        category: 'Cardiovascular',
        value: 85,
        unit: 'mg/dL',
        optimalMin: 0,
        optimalMax: 100,
        history: [110, 98, 92, 85],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'ApoB',
        category: 'Cardiovascular',
        value: 92,
        unit: 'mg/dL',
        optimalMin: 0,
        optimalMax: 90,
        history: [98, 95, 94, 92],
        lastUpdated: 'Dec 28, 2025',
      ),
      // Inflammatory
      _Biomarker(
        name: 'hsCRP',
        category: 'Inflammatory',
        value: 0.8,
        unit: 'mg/L',
        optimalMin: 0,
        optimalMax: 1.0,
        history: [1.2, 1.0, 0.9, 0.8],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'Homocysteine',
        category: 'Inflammatory',
        value: 8.5,
        unit: 'μmol/L',
        optimalMin: 5,
        optimalMax: 10,
        history: [11.2, 10.1, 9.2, 8.5],
        lastUpdated: 'Dec 28, 2025',
      ),
      // Hormonal
      _Biomarker(
        name: 'Testosterone (Total)',
        category: 'Hormonal',
        value: 620,
        unit: 'ng/dL',
        optimalMin: 500,
        optimalMax: 900,
        history: [580, 595, 610, 620],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'DHEA-S',
        category: 'Hormonal',
        value: 285,
        unit: 'μg/dL',
        optimalMin: 200,
        optimalMax: 400,
        history: [260, 270, 278, 285],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'TSH',
        category: 'Hormonal',
        value: 1.8,
        unit: 'mIU/L',
        optimalMin: 0.5,
        optimalMax: 2.5,
        history: [2.1, 2.0, 1.9, 1.8],
        lastUpdated: 'Dec 28, 2025',
      ),
      // Vitamins
      _Biomarker(
        name: 'Vitamin D (25-OH)',
        category: 'Vitamins',
        value: 52,
        unit: 'ng/mL',
        optimalMin: 40,
        optimalMax: 80,
        history: [35, 42, 48, 52],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'Vitamin B12',
        category: 'Vitamins',
        value: 680,
        unit: 'pg/mL',
        optimalMin: 500,
        optimalMax: 1000,
        history: [520, 580, 640, 680],
        lastUpdated: 'Dec 28, 2025',
      ),
      _Biomarker(
        name: 'Ferritin',
        category: 'Vitamins',
        value: 125,
        unit: 'ng/mL',
        optimalMin: 50,
        optimalMax: 200,
        history: [95, 108, 118, 125],
        lastUpdated: 'Dec 28, 2025',
      ),
    ];
  }
}

class _Biomarker {
  final String name;
  final String category;
  final double value;
  final String unit;
  final double optimalMin;
  final double optimalMax;
  final List<double> history;
  final String lastUpdated;

  _Biomarker({
    required this.name,
    required this.category,
    required this.value,
    required this.unit,
    required this.optimalMin,
    required this.optimalMax,
    required this.history,
    required this.lastUpdated,
  });

  String get status {
    if (value >= optimalMin && value <= optimalMax) return 'optimal';
    final range = optimalMax - optimalMin;
    if (value < optimalMin - range * 0.2 || value > optimalMax + range * 0.2)
      return 'critical';
    return 'borderline';
  }

  double get trend {
    if (history.length < 2) return 0;
    return ((history.last - history.first) / history.first) * 100;
  }
}

class _BiomarkerCard extends StatelessWidget {
  final _Biomarker biomarker;

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
    // For most biomarkers, trending toward optimal is good
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
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
