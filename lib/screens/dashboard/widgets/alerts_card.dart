import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/alert_model.dart';
import 'package:mystasis/providers/alerts_provider.dart';

/// Compact alerts card for the clinician overview screen.
class ActiveAlertsCard extends StatelessWidget {
  final VoidCallback? onViewAll;

  const ActiveAlertsCard({super.key, this.onViewAll});

  @override
  Widget build(BuildContext context) {
    return Consumer<AlertsProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return Container(
            padding: const EdgeInsets.all(24),
            decoration: _cardDecoration(),
            child: const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            ),
          );
        }

        final active = provider.activeAlerts;

        return Container(
          padding: const EdgeInsets.all(24),
          decoration: _cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.notifications_active,
                    size: 20,
                    color: active.isNotEmpty
                        ? MystasisTheme.errorRed
                        : MystasisTheme.neutralGrey,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Active Alerts',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  if (active.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: MystasisTheme.errorRed.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${active.length}',
                        style:
                            Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: MystasisTheme.errorRed,
                                  fontWeight: FontWeight.w600,
                                ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (onViewAll != null)
                    TextButton(
                        onPressed: onViewAll,
                        child: const Text('View All')),
                ],
              ),
              const SizedBox(height: 16),
              if (active.isEmpty)
                Text(
                  'No active alerts.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: MystasisTheme.neutralGrey,
                      ),
                )
              else
                ...active.take(3).map((alert) => _AlertRow(alert: alert)),
            ],
          ),
        );
      },
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }
}

class _AlertRow extends StatelessWidget {
  final AlertModel alert;

  const _AlertRow({required this.alert});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: alert.severity.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              alert.title,
              style: Theme.of(context).textTheme.bodyMedium,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: alert.severity.color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              alert.severity.displayName,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: alert.severity.color,
                    fontWeight: FontWeight.w500,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
