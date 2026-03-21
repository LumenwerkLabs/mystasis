import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/alert_model.dart';
import 'package:mystasis/providers/alerts_provider.dart';

class AlertsScreen extends StatefulWidget {
  final String? patientId;

  const AlertsScreen({super.key, this.patientId});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.patientId != null) {
        context.read<AlertsProvider>().loadAlerts(widget.patientId!);
      }
    });
  }

  @override
  void didUpdateWidget(AlertsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.patientId != oldWidget.patientId && widget.patientId != null) {
      context.read<AlertsProvider>().loadAlerts(widget.patientId!);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.patientId == null) {
      return Center(
        child: Text(
          'Select a patient to view alerts.',
          style: Theme.of(context)
              .textTheme
              .bodyLarge
              ?.copyWith(color: MystasisTheme.neutralGrey),
        ),
      );
    }

    return Consumer<AlertsProvider>(
      builder: (context, provider, _) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              _buildHeader(context, provider),
              const SizedBox(height: 24),

              // Filters
              _buildFilters(context, provider),
              const SizedBox(height: 24),

              // Content
              if (provider.isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(48),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (provider.errorMessage != null)
                _buildErrorState(context, provider)
              else if (provider.filteredAlerts.isEmpty)
                _buildEmptyState(context, provider)
              else
                _buildAlertsList(context, provider),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, AlertsProvider provider) {
    return Row(
      children: [
        Text(
          'Alerts',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(width: 12),
        if (!provider.isLoading && provider.activeCount > 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: MystasisTheme.errorRed.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${provider.activeCount} active',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: MystasisTheme.errorRed,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        const Spacer(),
        if (!provider.isLoading)
          IconButton(
            onPressed: () => provider.reloadAlerts(widget.patientId!),
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh alerts',
          ),
      ],
    );
  }

  Widget _buildFilters(BuildContext context, AlertsProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Status filters
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _FilterChip(
              label: 'All',
              isSelected: provider.statusFilter == null,
              onSelected: () => provider.setStatusFilter(null),
            ),
            ...AlertStatus.values.map((status) => _FilterChip(
                  label: status.displayName,
                  isSelected: provider.statusFilter == status,
                  onSelected: () => provider.setStatusFilter(status),
                )),
          ],
        ),
        const SizedBox(height: 8),
        // Severity filters
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _FilterChip(
              label: 'All severities',
              isSelected: provider.severityFilter == null,
              onSelected: () => provider.setSeverityFilter(null),
              useSeverityStyle: true,
            ),
            ...AlertSeverity.values.map((severity) => _FilterChip(
                  label: severity.displayName,
                  isSelected: provider.severityFilter == severity,
                  onSelected: () => provider.setSeverityFilter(severity),
                  color: severity.color,
                  useSeverityStyle: true,
                )),
          ],
        ),
      ],
    );
  }

  Widget _buildErrorState(BuildContext context, AlertsProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              provider.errorMessage!,
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => provider.reloadAlerts(widget.patientId!),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AlertsProvider provider) {
    final hasFilters =
        provider.statusFilter != null || provider.severityFilter != null;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            Icon(
              Icons.notifications_none,
              size: 48,
              color: MystasisTheme.neutralGrey.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              hasFilters
                  ? 'No alerts match the current filters.'
                  : 'No alerts for this patient.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
              textAlign: TextAlign.center,
            ),
            if (hasFilters) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  provider.setStatusFilter(null);
                  provider.setSeverityFilter(null);
                },
                child: const Text('Clear filters'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsList(BuildContext context, AlertsProvider provider) {
    final alerts = provider.filteredAlerts;

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: alerts.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _AlertCard(
        alert: alerts[index],
        onAcknowledge: () => provider.acknowledgeAlert(alerts[index].id),
        onDismiss: () => provider.dismissAlert(alerts[index].id),
        onResolve: () => provider.resolveAlert(alerts[index].id),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onSelected;
  final Color? color;
  final bool useSeverityStyle;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
    this.color,
    this.useSeverityStyle = false,
  });

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? MystasisTheme.deepBioTeal;

    return GestureDetector(
      onTap: onSelected,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color:
              isSelected ? chipColor.withValues(alpha: 0.15) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? chipColor : MystasisTheme.mistGrey,
          ),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: isSelected ? chipColor : MystasisTheme.neutralGrey,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
        ),
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback onAcknowledge;
  final VoidCallback onDismiss;
  final VoidCallback onResolve;

  const _AlertCard({
    required this.alert,
    required this.onAcknowledge,
    required this.onDismiss,
    required this.onResolve,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: alert.status == AlertStatus.active
              ? alert.severity.color.withValues(alpha: 0.3)
              : MystasisTheme.mistGrey,
        ),
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
          // Top row: severity badge + status badge + timestamp
          Row(
            children: [
              _SeverityBadge(severity: alert.severity),
              const SizedBox(width: 8),
              _StatusBadge(status: alert.status),
              const Spacer(),
              Text(
                _formatTimestamp(alert.createdAt),
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: MystasisTheme.neutralGrey),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title
          Text(
            alert.title,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),

          // Message
          Text(
            alert.message,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: MystasisTheme.neutralGrey),
          ),
          const SizedBox(height: 12),

          // Biomarker type + value/threshold info
          Row(
            children: [
              Icon(Icons.science_outlined,
                  size: 16, color: MystasisTheme.deepBioTeal),
              const SizedBox(width: 4),
              Text(
                alert.biomarkerDisplayName,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: MystasisTheme.deepBioTeal,
                      fontWeight: FontWeight.w500,
                    ),
              ),
              if (alert.value != null) ...[
                const SizedBox(width: 16),
                Text(
                  'Value: ${alert.value!.toStringAsFixed(alert.value! % 1 == 0 ? 0 : 1)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              if (alert.threshold != null) ...[
                const SizedBox(width: 12),
                Text(
                  'Threshold: ${alert.threshold!.toStringAsFixed(alert.threshold! % 1 == 0 ? 0 : 1)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ],
          ),

          // Action buttons
          if (alert.isActionable) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (alert.status == AlertStatus.active) ...[
                  TextButton(
                    onPressed: onAcknowledge,
                    child: const Text('Acknowledge'),
                  ),
                  const SizedBox(width: 8),
                ],
                if (alert.status == AlertStatus.acknowledged) ...[
                  TextButton(
                    onPressed: onResolve,
                    style: TextButton.styleFrom(
                      foregroundColor: MystasisTheme.softAlgae,
                    ),
                    child: const Text('Resolve'),
                  ),
                  const SizedBox(width: 8),
                ],
                TextButton(
                  onPressed: onDismiss,
                  style: TextButton.styleFrom(
                    foregroundColor: MystasisTheme.neutralGrey,
                  ),
                  child: const Text('Dismiss'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _formatTimestamp(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day}';
  }
}

class _SeverityBadge extends StatelessWidget {
  final AlertSeverity severity;

  const _SeverityBadge({required this.severity});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: severity.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        severity.displayName,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: severity.color,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final AlertStatus status;

  const _StatusBadge({required this.status});

  Color get _color {
    switch (status) {
      case AlertStatus.active:
        return MystasisTheme.errorRed;
      case AlertStatus.acknowledged:
        return MystasisTheme.signalAmber;
      case AlertStatus.resolved:
        return MystasisTheme.softAlgae;
      case AlertStatus.dismissed:
        return MystasisTheme.neutralGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.displayName,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: _color,
              fontWeight: FontWeight.w500,
            ),
      ),
    );
  }
}
