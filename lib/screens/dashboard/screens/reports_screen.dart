import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/llm_summary_model.dart';
import 'package:mystasis/core/widgets/medical_disclaimer.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';

class ReportsScreen extends StatefulWidget {
  final String? patientId;

  const ReportsScreen({super.key, this.patientId});

  @override
  State<ReportsScreen> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showGenerateDialog() {
    if (widget.patientId == null) return;

    // Clinician-relevant summary types only
    const types = [
      SummaryType.weeklySummary,
      SummaryType.trendAnalysis,
      SummaryType.riskAssessment,
      SummaryType.clinicianReport,
    ];

    showDialog(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: const Text('Generate AI Report'),
        children: types.map((type) {
          return SimpleDialogOption(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<InsightsProvider>().generateSummary(
                    widget.patientId!,
                    type,
                  );
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(
                    _getTypeIcon(type),
                    color: _getTypeColor(type),
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Text(type.displayName),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Reports',
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'AI-generated health reports and analysis',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: MystasisTheme.neutralGrey,
                    ),
                  ),
                ],
              ),
              Consumer<AuthProvider>(
                builder: (context, auth, _) {
                  if (auth.user?.isClinician != true) {
                    return const SizedBox.shrink();
                  }
                  return ElevatedButton.icon(
                    onPressed: widget.patientId != null
                        ? _showGenerateDialog
                        : null,
                    icon: const Icon(Icons.auto_awesome, size: 20),
                    label: const Text('Generate Report'),
                  );
                },
              ),
            ],
          ),
        ),

        // Tabs
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          decoration: BoxDecoration(
            color: MystasisTheme.mistGrey.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TabBar(
            controller: _tabController,
            indicator: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            indicatorPadding: const EdgeInsets.all(4),
            dividerColor: Colors.transparent,
            labelColor: MystasisTheme.deepGraphite,
            unselectedLabelColor: MystasisTheme.neutralGrey,
            tabs: const [
              Tab(text: 'AI Insights'),
              Tab(text: 'Lab Analysis'),
              Tab(text: 'Progress'),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _AIInsightsTab(patientId: widget.patientId),
              _LabAnalysisTab(),
              _ProgressTab(),
            ],
          ),
        ),
      ],
    );
  }
}

// ── AI Insights Tab (real data) ──────────────────────────────────────

class _AIInsightsTab extends StatelessWidget {
  final String? patientId;

  const _AIInsightsTab({this.patientId});

  @override
  Widget build(BuildContext context) {
    return Consumer<InsightsProvider>(
      builder: (context, provider, _) {
        // Generating state
        if (provider.isGenerating) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text(
                  'Generating AI insights...',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'This may take a few moments.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                ),
              ],
            ),
          );
        }

        // Error state
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
                if (patientId != null)
                  ElevatedButton(
                    onPressed: () => provider.generateSummary(
                      patientId!,
                      SummaryType.weeklySummary,
                    ),
                    child: const Text('Retry'),
                  ),
              ],
            ),
          );
        }

        // Empty state
        if (provider.summaries.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.auto_awesome_outlined,
                  size: 64,
                  color: MystasisTheme.neutralGrey.withValues(alpha: 0.5),
                ),
                const SizedBox(height: 16),
                Text(
                  'No AI insights generated yet',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Click "Generate Report" to create an AI-powered\nhealth analysis for this patient.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
                ),
              ],
            ),
          );
        }

        // Summaries list
        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          itemCount: provider.summaries.length,
          itemBuilder: (context, index) =>
              _InsightCard(summary: provider.summaries[index]),
        );
      },
    );
  }
}

class _InsightCard extends StatefulWidget {
  final LlmSummaryModel summary;

  const _InsightCard({required this.summary});

  @override
  State<_InsightCard> createState() => _InsightCardState();
}

class _InsightCardState extends State<_InsightCard> {
  bool _isExpanded = true;

  @override
  Widget build(BuildContext context) {
    final summary = widget.summary;
    final typeColor = _getTypeColor(summary.type);
    final structured = summary.structuredData;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
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
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: typeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _getTypeIcon(summary.type),
                  color: typeColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      summary.type.displayName,
                      style: Theme.of(context)
                          .textTheme
                          .bodyLarge
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
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
                            'AI Generated',
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: MystasisTheme.cellularBlue),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatDateTime(summary.generatedAt),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  _isExpanded ? Icons.expand_less : Icons.expand_more,
                ),
                onPressed: () => setState(() => _isExpanded = !_isExpanded),
              ),
            ],
          ),

          if (_isExpanded) ...[
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 16),

            // Content
            Text(
              summary.content,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                height: 1.6,
              ),
            ),

            // Structured data sections
            if (structured != null && !structured.isEmpty) ...[
              const SizedBox(height: 16),

              // Flags
              if (structured.flags != null && structured.flags!.isNotEmpty) ...[
                _SectionHeader(
                  icon: Icons.flag_outlined,
                  title: 'Flags',
                  color: MystasisTheme.signalAmber,
                ),
                const SizedBox(height: 8),
                ...structured.flags!.map((f) => _BulletItem(
                      text: f,
                      color: MystasisTheme.signalAmber,
                    )),
                const SizedBox(height: 12),
              ],

              // Recommendations
              if (structured.recommendations != null &&
                  structured.recommendations!.isNotEmpty) ...[
                _SectionHeader(
                  icon: Icons.lightbulb_outline,
                  title: 'Recommendations',
                  color: MystasisTheme.softAlgae,
                ),
                const SizedBox(height: 8),
                ...structured.recommendations!.map((r) => _BulletItem(
                      text: r,
                      color: MystasisTheme.softAlgae,
                    )),
                const SizedBox(height: 12),
              ],

              // Questions for Doctor
              if (structured.questionsForDoctor != null &&
                  structured.questionsForDoctor!.isNotEmpty) ...[
                _SectionHeader(
                  icon: Icons.help_outline,
                  title: 'Consider Discussing',
                  color: MystasisTheme.deepBioTeal,
                ),
                const SizedBox(height: 8),
                ...structured.questionsForDoctor!.map((q) => _BulletItem(
                      text: q,
                      color: MystasisTheme.deepBioTeal,
                    )),
                const SizedBox(height: 12),
              ],
            ],

            const SizedBox(height: 12),
            const MedicalDisclaimer(),
          ],
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final hour = dt.hour > 12 ? dt.hour - 12 : dt.hour;
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    final min = dt.minute.toString().padLeft(2, '0');
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year} at $hour:$min $amPm';
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;

  const _SectionHeader({
    required this.icon,
    required this.title,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(
          title,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _BulletItem extends StatelessWidget {
  final String text;
  final Color color;

  const _BulletItem({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 22, bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 7),
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Helper functions for type styling ────────────────────────────────

Color _getTypeColor(SummaryType type) {
  switch (type) {
    case SummaryType.weeklySummary:
      return MystasisTheme.deepBioTeal;
    case SummaryType.trendAnalysis:
      return MystasisTheme.softAlgae;
    case SummaryType.riskAssessment:
      return MystasisTheme.signalAmber;
    case SummaryType.clinicianReport:
      return MystasisTheme.cellularBlue;
    case SummaryType.dailyRecap:
      return MystasisTheme.deepBioTeal;
    case SummaryType.wellnessNudge:
      return MystasisTheme.softAlgae;
  }
}

IconData _getTypeIcon(SummaryType type) {
  switch (type) {
    case SummaryType.weeklySummary:
      return Icons.assessment;
    case SummaryType.trendAnalysis:
      return Icons.trending_up;
    case SummaryType.riskAssessment:
      return Icons.warning_amber_outlined;
    case SummaryType.clinicianReport:
      return Icons.description_outlined;
    case SummaryType.dailyRecap:
      return Icons.today;
    case SummaryType.wellnessNudge:
      return Icons.self_improvement;
  }
}

// ── Lab Analysis Tab (mock, unchanged) ───────────────────────────────

class _LabAnalysisTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final labResults = [
      _LabResult(
        name: 'Comprehensive Metabolic Panel',
        date: 'Dec 28, 2025',
        lab: 'Quest Diagnostics',
        markers: 14,
        flagged: 1,
      ),
      _LabResult(
        name: 'Complete Blood Count',
        date: 'Dec 28, 2025',
        lab: 'Quest Diagnostics',
        markers: 18,
        flagged: 0,
      ),
      _LabResult(
        name: 'Lipid Panel (Advanced)',
        date: 'Dec 28, 2025',
        lab: 'Quest Diagnostics',
        markers: 12,
        flagged: 2,
      ),
      _LabResult(
        name: 'Hormone Panel',
        date: 'Dec 10, 2025',
        lab: 'LabCorp',
        markers: 8,
        flagged: 0,
      ),
      _LabResult(
        name: 'Thyroid Panel',
        date: 'Dec 10, 2025',
        lab: 'LabCorp',
        markers: 6,
        flagged: 0,
      ),
      _LabResult(
        name: 'Vitamin & Mineral Panel',
        date: 'Nov 15, 2025',
        lab: 'Quest Diagnostics',
        markers: 10,
        flagged: 1,
      ),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      itemCount: labResults.length,
      itemBuilder: (context, index) =>
          _LabResultCard(result: labResults[index]),
    );
  }
}

class _LabResult {
  final String name;
  final String date;
  final String lab;
  final int markers;
  final int flagged;

  _LabResult({
    required this.name,
    required this.date,
    required this.lab,
    required this.markers,
    required this.flagged,
  });
}

class _LabResultCard extends StatelessWidget {
  final _LabResult result;

  const _LabResultCard({required this.result});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: MystasisTheme.cellularBlue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.biotech,
              color: MystasisTheme.cellularBlue,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.name,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: MystasisTheme.neutralGrey,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      result.date,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(width: 12),
                    Icon(
                      Icons.local_hospital_outlined,
                      size: 14,
                      color: MystasisTheme.neutralGrey,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      result.lab,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${result.markers} markers',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (result.flagged > 0)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: MystasisTheme.signalAmber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${result.flagged} flagged',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: MystasisTheme.signalAmber,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            color: MystasisTheme.neutralGrey,
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

// ── Progress Tab (mock, unchanged) ───────────────────────────────────

class _ProgressTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              _ProgressSummaryCard(
                title: 'Overall Progress',
                value: '+15%',
                subtitle: 'Health score improvement',
                icon: Icons.trending_up,
                color: MystasisTheme.softAlgae,
              ),
              _ProgressSummaryCard(
                title: 'Biomarkers Improved',
                value: '32/47',
                subtitle: 'Since baseline',
                icon: Icons.science,
                color: MystasisTheme.deepBioTeal,
              ),
              _ProgressSummaryCard(
                title: 'Goals Met',
                value: '8/10',
                subtitle: 'This quarter',
                icon: Icons.flag,
                color: MystasisTheme.signalAmber,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Timeline
          Text(
            'Progress Timeline',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          ..._getTimelineItems().map((item) => _TimelineItem(item: item)),
        ],
      ),
    );
  }

  List<_TimelineEntry> _getTimelineItems() {
    return [
      _TimelineEntry(
        date: 'Dec 2025',
        title: 'Q4 Review Complete',
        description:
            'Homeostasis score improved to 78. LDL still slightly elevated.',
        type: 'milestone',
      ),
      _TimelineEntry(
        date: 'Nov 2025',
        title: 'Sleep Protocol Adjustment',
        description:
            'Added magnesium supplementation. Sleep score improved by 12%.',
        type: 'intervention',
      ),
      _TimelineEntry(
        date: 'Oct 2025',
        title: 'Cardiovascular Markers Improved',
        description:
            'HDL increased from 55 to 62 mg/dL. Triglycerides down 15%.',
        type: 'improvement',
      ),
      _TimelineEntry(
        date: 'Sep 2025',
        title: 'Q3 Review Complete',
        description:
            'Baseline established. Areas of focus: metabolic and cardiovascular health.',
        type: 'milestone',
      ),
      _TimelineEntry(
        date: 'Aug 2025',
        title: 'Initial Assessment',
        description:
            'Comprehensive baseline labs and wearable data integration complete.',
        type: 'baseline',
      ),
    ];
  }
}

class _ProgressSummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _ProgressSummaryCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
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
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _TimelineEntry {
  final String date;
  final String title;
  final String description;
  final String type;

  _TimelineEntry({
    required this.date,
    required this.title,
    required this.description,
    required this.type,
  });
}

class _TimelineItem extends StatelessWidget {
  final _TimelineEntry item;

  const _TimelineItem({required this.item});

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              item.date,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500),
            ),
          ),
          Column(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: _getTimelineColor(),
                  shape: BoxShape.circle,
                ),
              ),
              Expanded(
                child: Container(width: 2, color: MystasisTheme.mistGrey),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 24),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: _getTimelineColor().withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _getTypeLabel(),
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(color: _getTimelineColor()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.description,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: MystasisTheme.neutralGrey,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getTimelineColor() {
    switch (item.type) {
      case 'milestone':
        return MystasisTheme.deepBioTeal;
      case 'intervention':
        return MystasisTheme.signalAmber;
      case 'improvement':
        return MystasisTheme.softAlgae;
      case 'baseline':
        return MystasisTheme.cellularBlue;
      default:
        return MystasisTheme.neutralGrey;
    }
  }

  String _getTypeLabel() {
    switch (item.type) {
      case 'milestone':
        return 'Milestone';
      case 'intervention':
        return 'Intervention';
      case 'improvement':
        return 'Improvement';
      case 'baseline':
        return 'Baseline';
      default:
        return 'Update';
    }
  }
}
