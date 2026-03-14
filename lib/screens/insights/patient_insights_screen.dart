import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/widgets/medical_disclaimer.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';

class PatientInsightsScreen extends StatelessWidget {
  const PatientInsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Insights'),
      ),
      body: Consumer<InsightsProvider>(
        builder: (context, provider, _) {
          if (provider.isLoadingNudge) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Generating your wellness insight...'),
                ],
              ),
            );
          }

          if (provider.nudgeError != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline,
                        size: 48, color: Colors.red[400]),
                    const SizedBox(height: 16),
                    Text(
                      provider.nudgeError!,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => _refreshNudge(context),
                      style: FilledButton.styleFrom(
                        backgroundColor: MystasisTheme.deepBioTeal,
                      ),
                      child: const Text('Try Again'),
                    ),
                  ],
                ),
              ),
            );
          }

          final nudge = provider.currentNudge;
          if (nudge == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.auto_awesome,
                        size: 48, color: MystasisTheme.deepBioTeal),
                    const SizedBox(height: 16),
                    Text(
                      'No insights yet',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tap below to get a personalized wellness tip.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: MystasisTheme.neutralGrey,
                          ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () => _refreshNudge(context),
                      icon: const Icon(Icons.auto_awesome),
                      label: const Text('Get a Wellness Tip'),
                      style: FilledButton.styleFrom(
                        backgroundColor: MystasisTheme.deepBioTeal,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Nudge content card
                _SectionCard(
                  icon: Icons.auto_awesome,
                  title: 'Wellness Tip',
                  child: Text(
                    nudge.content,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.6,
                        ),
                  ),
                ),

                // Structured data sections
                if (nudge.structuredData != null &&
                    !nudge.structuredData!.isEmpty) ...[
                  if (nudge.structuredData!.recommendations != null &&
                      nudge.structuredData!.recommendations!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _SectionCard(
                      icon: Icons.lightbulb_outline,
                      title: 'Recommendations',
                      child: Column(
                        children: nudge.structuredData!.recommendations!
                            .map((rec) => _BulletItem(text: rec))
                            .toList(),
                      ),
                    ),
                  ],
                  if (nudge.structuredData!.questionsForDoctor != null &&
                      nudge.structuredData!.questionsForDoctor!
                          .isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _SectionCard(
                      icon: Icons.help_outline,
                      title: 'Questions for Your Doctor',
                      child: Column(
                        children: nudge.structuredData!.questionsForDoctor!
                            .map((q) => _BulletItem(text: q))
                            .toList(),
                      ),
                    ),
                  ],
                  if (nudge.structuredData!.flags != null &&
                      nudge.structuredData!.flags!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _SectionCard(
                      icon: Icons.flag_outlined,
                      title: 'Things to Watch',
                      child: Column(
                        children: nudge.structuredData!.flags!
                            .map((flag) => _BulletItem(text: flag))
                            .toList(),
                      ),
                    ),
                  ],
                ],

                const SizedBox(height: 24),
                const MedicalDisclaimer(),
                const SizedBox(height: 24),

                // Refresh button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _refreshNudge(context),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Get New Insight'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: MystasisTheme.deepBioTeal,
                      side: const BorderSide(color: MystasisTheme.deepBioTeal),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }

  void _refreshNudge(BuildContext context) {
    final auth = context.read<AuthProvider>();
    if (auth.isAuthenticated && auth.user != null) {
      context.read<InsightsProvider>().generateNudge(auth.user!.id);
    }
  }
}

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget child;

  const _SectionCard({
    required this.icon,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: MystasisTheme.deepBioTeal, size: 22),
              const SizedBox(width: 10),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _BulletItem extends StatelessWidget {
  final String text;

  const _BulletItem({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: MystasisTheme.deepBioTeal,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
