import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

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
                    'Patient health reports and analysis history',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: MystasisTheme.neutralGrey,
                    ),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 20),
                label: const Text('Generate Report'),
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
              Tab(text: 'All Reports'),
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
            children: [_AllReportsTab(), _LabAnalysisTab(), _ProgressTab()],
          ),
        ),
      ],
    );
  }
}

class _AllReportsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final reports = [
      _Report(
        title: 'Quarterly Health Review Q4 2025',
        type: 'Comprehensive',
        date: 'Dec 28, 2025',
        status: 'complete',
        screens: 12,
      ),
      _Report(
        title: 'Cardiovascular Risk Assessment',
        type: 'Specialized',
        date: 'Dec 15, 2025',
        status: 'complete',
        screens: 6,
      ),
      _Report(
        title: 'Hormonal Panel Analysis',
        type: 'Lab Analysis',
        date: 'Dec 10, 2025',
        status: 'complete',
        screens: 8,
      ),
      _Report(
        title: 'Monthly Progress Report - November',
        type: 'Progress',
        date: 'Nov 30, 2025',
        status: 'complete',
        screens: 4,
      ),
      _Report(
        title: 'Metabolic Health Assessment',
        type: 'Specialized',
        date: 'Nov 20, 2025',
        status: 'complete',
        screens: 7,
      ),
      _Report(
        title: 'Quarterly Health Review Q3 2025',
        type: 'Comprehensive',
        date: 'Sep 28, 2025',
        status: 'complete',
        screens: 11,
      ),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      itemCount: reports.length,
      itemBuilder: (context, index) => _ReportCard(report: reports[index]),
    );
  }
}

class _Report {
  final String title;
  final String type;
  final String date;
  final String status;
  final int screens;

  _Report({
    required this.title,
    required this.type,
    required this.date,
    required this.status,
    required this.screens,
  });
}

class _ReportCard extends StatelessWidget {
  final _Report report;

  const _ReportCard({required this.report});

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
              color: _getTypeColor().withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_getTypeIcon(), color: _getTypeColor(), size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  report.title,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _getTypeColor().withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        report.type,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: _getTypeColor(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      report.date,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${report.screens} screens',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.visibility_outlined),
                color: MystasisTheme.neutralGrey,
                onPressed: () {},
                tooltip: 'View',
              ),
              IconButton(
                icon: const Icon(Icons.download_outlined),
                color: MystasisTheme.neutralGrey,
                onPressed: () {},
                tooltip: 'Download',
              ),
              IconButton(
                icon: const Icon(Icons.share_outlined),
                color: MystasisTheme.neutralGrey,
                onPressed: () {},
                tooltip: 'Share',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getTypeColor() {
    switch (report.type) {
      case 'Comprehensive':
        return MystasisTheme.deepBioTeal;
      case 'Specialized':
        return MystasisTheme.softAlgae;
      case 'Lab Analysis':
        return MystasisTheme.cellularBlue;
      case 'Progress':
        return MystasisTheme.signalAmber;
      default:
        return MystasisTheme.neutralGrey;
    }
  }

  IconData _getTypeIcon() {
    switch (report.type) {
      case 'Comprehensive':
        return Icons.assessment;
      case 'Specialized':
        return Icons.science;
      case 'Lab Analysis':
        return Icons.biotech;
      case 'Progress':
        return Icons.trending_up;
      default:
        return Icons.description;
    }
  }
}

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
                  color: _getTypeColor(),
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
                          color: _getTypeColor().withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _getTypeLabel(),
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(color: _getTypeColor()),
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

  Color _getTypeColor() {
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
