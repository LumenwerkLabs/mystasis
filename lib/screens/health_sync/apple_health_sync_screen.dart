import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/services/apple_health_service.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/health_sync_provider.dart';

/// Patient-facing screen for connecting and syncing Apple Health data.
class AppleHealthSyncScreen extends StatefulWidget {
  const AppleHealthSyncScreen({super.key});

  @override
  State<AppleHealthSyncScreen> createState() => _AppleHealthSyncScreenState();
}

class _AppleHealthSyncScreenState extends State<AppleHealthSyncScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HealthSyncProvider>().initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Apple Health'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Consumer<HealthSyncProvider>(
        builder: (context, provider, _) {
          if (!provider.isAvailable) {
            return _buildUnavailable(context);
          }
          if (provider.isSyncing) {
            return _buildSyncing(context, provider);
          }
          if (provider.status == SyncStatus.done) {
            return _buildDone(context, provider);
          }
          if (provider.status == SyncStatus.error) {
            return _buildError(context, provider);
          }
          if (!provider.hasPermissions) {
            return _buildConnect(context, provider);
          }
          return _buildReady(context, provider);
        },
      ),
    );
  }

  Widget _buildUnavailable(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.phone_iphone, size: 64, color: MystasisTheme.neutralGrey),
            const SizedBox(height: 16),
            Text(
              'Apple Health is only available on iOS',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnect(BuildContext context, HealthSyncProvider provider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: MystasisTheme.deepBioTeal.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.favorite_border,
              size: 56,
              color: MystasisTheme.deepBioTeal,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Connect Apple Health',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'Sync your health data to track biomarker trends and get personalized wellness insights.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: MystasisTheme.neutralGrey,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          _DataTypesCard(),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: provider.status == SyncStatus.requestingPermissions
                  ? null
                  : () => provider.requestPermissions(),
              icon: const Icon(Icons.link),
              label: const Text('Connect'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: MystasisTheme.deepBioTeal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReady(BuildContext context, HealthSyncProvider provider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 16),
          // Status card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: MystasisTheme.softAlgae.withValues(alpha: 0.3),
              ),
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
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: MystasisTheme.softAlgae.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.check_circle,
                    color: MystasisTheme.softAlgae,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Apple Health Connected',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        provider.lastSyncTimestamp != null
                            ? 'Last synced: ${_formatTimestamp(provider.lastSyncTimestamp!)}'
                            : 'Never synced',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: MystasisTheme.neutralGrey,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _DataTypesCard(),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => provider.syncHealthData(),
              icon: const Icon(Icons.sync),
              label: const Text('Sync Now'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: MystasisTheme.deepBioTeal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSyncing(BuildContext context, HealthSyncProvider provider) {
    final isFetching = provider.status == SyncStatus.fetching;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 64,
              height: 64,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(height: 24),
            Text(
              isFetching ? 'Reading health data...' : 'Uploading records...',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              isFetching
                  ? 'Accessing Apple Health data on your device'
                  : 'Sending your health data to Mystasis',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDone(BuildContext context, HealthSyncProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: MystasisTheme.softAlgae.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_outline,
                size: 56,
                color: MystasisTheme.softAlgae,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              provider.lastSyncCount > 0
                  ? 'Synced ${provider.lastSyncCount} records'
                  : 'No new data to sync',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              provider.lastSyncCount > 0
                  ? 'Your health data is up to date'
                  : 'All your health data was already synced',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                  ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  provider.reset();
                  Navigator.of(context).pop();
                },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: MystasisTheme.deepBioTeal,
                ),
                child: const Text('Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(BuildContext context, HealthSyncProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 56, color: Colors.red[400]),
            const SizedBox(height: 24),
            Text(
              provider.errorMessage ?? 'Something went wrong',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  provider.reset();
                  provider.syncHealthData();
                },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: MystasisTheme.deepBioTeal,
                ),
                child: const Text('Try Again'),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () {
                provider.reset();
                Navigator.of(context).pop();
              },
              child: const Text('Go Back'),
            ),
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

class _DataTypesCard extends StatelessWidget {
  const _DataTypesCard();

  @override
  Widget build(BuildContext context) {
    final types = AppleHealthService.typeLabels.entries.toList();

    return Container(
      width: double.infinity,
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
          Text(
            'Data we sync',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: types.map((entry) {
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: MystasisTheme.mistGrey,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _iconForType(entry.key),
                      size: 14,
                      color: MystasisTheme.deepBioTeal,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      entry.value,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      // Cardiovascular
      case 'HEART_RATE':
      case 'RESTING_HEART_RATE':
      case 'WALKING_HEART_RATE':
        return Icons.favorite;
      case 'HEART_RATE_VARIABILITY':
        return Icons.monitor_heart;
      case 'BLOOD_PRESSURE_SYSTOLIC':
      case 'BLOOD_PRESSURE_DIASTOLIC':
        return Icons.speed;
      // Vitals
      case 'BLOOD_OXYGEN':
        return Icons.air;
      case 'RESPIRATORY_RATE':
        return Icons.waves;
      case 'BODY_TEMPERATURE':
        return Icons.thermostat;
      case 'PERIPHERAL_PERFUSION_INDEX':
        return Icons.bloodtype;
      // Metabolic
      case 'GLUCOSE':
        return Icons.water_drop;
      case 'BASAL_CALORIES':
      case 'ACTIVE_CALORIES':
        return Icons.local_fire_department;
      // Fitness
      case 'STEPS':
        return Icons.directions_walk;
      case 'EXERCISE_TIME':
        return Icons.fitness_center;
      case 'DISTANCE_WALKING_RUNNING':
        return Icons.directions_run;
      case 'DISTANCE_SWIMMING':
        return Icons.pool;
      case 'DISTANCE_CYCLING':
        return Icons.directions_bike;
      case 'FLIGHTS_CLIMBED':
        return Icons.stairs;
      // Sleep
      case 'SLEEP_DURATION':
      case 'SLEEP_DEEP':
      case 'SLEEP_REM':
      case 'SLEEP_LIGHT':
      case 'SLEEP_AWAKE':
        return Icons.bedtime;
      // Body Composition
      case 'WEIGHT':
        return Icons.monitor_weight;
      case 'BMI':
      case 'BODY_FAT_PERCENTAGE':
        return Icons.person;
      case 'HEIGHT':
        return Icons.height;
      case 'WAIST_CIRCUMFERENCE':
        return Icons.straighten;
      // Hydration
      case 'WATER_INTAKE':
        return Icons.local_drink;
      // Pulmonary
      case 'FORCED_EXPIRATORY_VOLUME':
        return Icons.air;
      // Cardiac Diagnostics
      case 'ELECTRODERMAL_ACTIVITY':
        return Icons.electric_bolt;
      case 'ATRIAL_FIBRILLATION_BURDEN':
        return Icons.monitor_heart;
      // Diabetes management
      case 'INSULIN_DELIVERY':
        return Icons.vaccines;
      // Wellness
      case 'MINDFULNESS':
        return Icons.self_improvement;
      // Sleep
      case 'SLEEP_IN_BED':
        return Icons.bedtime;
      // Nutrition
      case 'DIETARY_ENERGY_CONSUMED':
      case 'DIETARY_CARBS_CONSUMED':
      case 'DIETARY_PROTEIN_CONSUMED':
      case 'DIETARY_FATS_CONSUMED':
      case 'DIETARY_FIBER':
      case 'DIETARY_SUGAR':
      case 'DIETARY_CAFFEINE':
      case 'DIETARY_FAT_SATURATED':
      case 'DIETARY_FAT_MONOUNSATURATED':
      case 'DIETARY_FAT_POLYUNSATURATED':
      case 'DIETARY_CHOLESTEROL':
      case 'DIETARY_VITAMIN_A':
      case 'DIETARY_VITAMIN_C':
      case 'DIETARY_VITAMIN_D':
      case 'DIETARY_VITAMIN_E':
      case 'DIETARY_VITAMIN_K':
      case 'DIETARY_THIAMIN':
      case 'DIETARY_RIBOFLAVIN':
      case 'DIETARY_NIACIN':
      case 'DIETARY_PANTOTHENIC_ACID':
      case 'DIETARY_VITAMIN_B6':
      case 'DIETARY_BIOTIN':
      case 'DIETARY_VITAMIN_B12':
      case 'DIETARY_FOLATE':
      case 'DIETARY_CALCIUM':
      case 'DIETARY_IRON':
      case 'DIETARY_MAGNESIUM':
      case 'DIETARY_PHOSPHORUS':
      case 'DIETARY_POTASSIUM':
      case 'DIETARY_SODIUM':
      case 'DIETARY_ZINC':
      case 'DIETARY_CHROMIUM':
      case 'DIETARY_COPPER':
      case 'DIETARY_IODINE':
      case 'DIETARY_MANGANESE':
      case 'DIETARY_MOLYBDENUM':
      case 'DIETARY_SELENIUM':
        return Icons.restaurant;
      default:
        return Icons.health_and_safety;
    }
  }
}
