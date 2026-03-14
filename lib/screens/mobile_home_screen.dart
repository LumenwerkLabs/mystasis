import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/health_sync_provider.dart';

/// Minimal mobile home screen for patients.
///
/// Shows Apple Health sync status and a sync button — the mobile app is
/// a companion to the main web dashboard, focused solely on data ingestion.
class MobileHomeScreen extends StatefulWidget {
  const MobileHomeScreen({super.key});

  @override
  State<MobileHomeScreen> createState() => _MobileHomeScreenState();
}

class _MobileHomeScreenState extends State<MobileHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HealthSyncProvider>().initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final userName = auth.user?.firstName ?? 'there';

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
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
                        'Hi, $userName',
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Mystasis companion',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: MystasisTheme.neutralGrey,
                            ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => _showLogoutDialog(context),
                    icon: const Icon(Icons.logout),
                    tooltip: 'Sign out',
                    color: MystasisTheme.neutralGrey,
                  ),
                ],
              ),
              const SizedBox(height: 40),

              // Apple Health sync card
              Consumer<HealthSyncProvider>(
                builder: (context, provider, _) {
                  return _SyncCard(provider: provider);
                },
              ),

              const SizedBox(height: 24),

              // Info text
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: MystasisTheme.deepBioTeal.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      size: 20,
                      color: MystasisTheme.deepBioTeal,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'View your biomarker trends and insights on the Mystasis web dashboard.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: MystasisTheme.deepBioTeal,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthProvider>().signOut();
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

class _SyncCard extends StatelessWidget {
  final HealthSyncProvider provider;

  const _SyncCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    if (!provider.isAvailable) {
      return _buildCard(
        context,
        icon: Icons.phone_iphone,
        iconColor: MystasisTheme.neutralGrey,
        title: 'Apple Health unavailable',
        subtitle: 'Apple Health is only available on iOS devices.',
      );
    }

    if (provider.isSyncing) {
      return _buildCard(
        context,
        title: provider.status == SyncStatus.fetching
            ? 'Reading health data...'
            : 'Uploading records...',
        subtitle: provider.status == SyncStatus.fetching
            ? 'Accessing Apple Health on your device'
            : 'Sending data to Mystasis',
        trailing: const SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      );
    }

    if (provider.status == SyncStatus.done) {
      return _buildCard(
        context,
        icon: Icons.check_circle,
        iconColor: MystasisTheme.softAlgae,
        title: provider.lastSyncCount > 0
            ? 'Synced ${provider.lastSyncCount} records'
            : 'Already up to date',
        subtitle: 'Tap to sync again',
        onTap: () => provider.syncHealthData(),
      );
    }

    if (provider.status == SyncStatus.error) {
      return _buildCard(
        context,
        icon: Icons.error_outline,
        iconColor: Colors.red[400]!,
        title: 'Sync failed',
        subtitle: provider.errorMessage ?? 'Something went wrong',
        action: FilledButton(
          onPressed: () {
            provider.reset();
            provider.syncHealthData();
          },
          style: FilledButton.styleFrom(
            backgroundColor: MystasisTheme.deepBioTeal,
          ),
          child: const Text('Retry'),
        ),
      );
    }

    if (!provider.hasPermissions) {
      return _buildCard(
        context,
        icon: Icons.favorite_border,
        iconColor: MystasisTheme.deepBioTeal,
        title: 'Connect Apple Health',
        subtitle:
            'Sync your health data to track biomarker trends and get personalized insights.',
        action: SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: provider.status == SyncStatus.requestingPermissions
                ? null
                : () => provider.requestPermissions(),
            icon: const Icon(Icons.link),
            label: const Text('Connect'),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              backgroundColor: MystasisTheme.deepBioTeal,
            ),
          ),
        ),
      );
    }

    // Ready to sync
    final lastSync = provider.lastSyncTimestamp;
    return _buildCard(
      context,
      icon: Icons.favorite,
      iconColor: MystasisTheme.softAlgae,
      title: 'Apple Health connected',
      subtitle: lastSync != null
          ? 'Last synced: ${_formatTimestamp(lastSync)}'
          : 'Never synced',
      action: SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: () => provider.syncHealthData(),
          icon: const Icon(Icons.sync),
          label: const Text('Sync Now'),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            backgroundColor: MystasisTheme.deepBioTeal,
          ),
        ),
      ),
    );
  }

  Widget _buildCard(
    BuildContext context, {
    IconData? icon,
    Color? iconColor,
    required String title,
    required String subtitle,
    Widget? action,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: iconColor?.withValues(alpha: 0.1) ??
                          MystasisTheme.mistGrey,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: iconColor, size: 28),
                  ),
                  const SizedBox(width: 16),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: MystasisTheme.neutralGrey,
                            ),
                      ),
                    ],
                  ),
                ),
                if (trailing != null) trailing,
              ],
            ),
            if (action != null) ...[
              const SizedBox(height: 20),
              action,
            ],
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final diff = now.difference(timestamp);

    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${timestamp.month}/${timestamp.day}/${timestamp.year}';
  }
}
