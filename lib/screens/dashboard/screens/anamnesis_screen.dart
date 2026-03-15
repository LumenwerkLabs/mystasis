import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/models/anamnesis_model.dart';
import 'package:mystasis/core/services/anamnesis_channel.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/widgets/medical_disclaimer.dart';
import 'package:mystasis/providers/anamnesis_provider.dart';
import 'package:mystasis/providers/auth_provider.dart';

class AnamnesisScreen extends StatefulWidget {
  final String? patientId;

  const AnamnesisScreen({super.key, required this.patientId});

  @override
  State<AnamnesisScreen> createState() => _AnamnesisScreenState();
}

class _AnamnesisScreenState extends State<AnamnesisScreen> {
  bool _showRawTranscript = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnamnesisProvider>().checkAvailability();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!AnamnesisChannel.isPlatformSupported) {
      return _buildUnsupportedPlatform(context);
    }

    return Consumer<AnamnesisProvider>(
      builder: (context, provider, _) {
        return Scaffold(
          backgroundColor: MystasisTheme.boneWhite,
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context),
                const SizedBox(height: 24),
                _buildContent(context, provider),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.mic, color: MystasisTheme.deepBioTeal, size: 28),
        const SizedBox(width: 12),
        Text(
          'Anamnesis Recording',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context, AnamnesisProvider provider) {
    switch (provider.state) {
      case AnamnesisSessionState.idle:
        return _buildIdleState(context, provider);
      case AnamnesisSessionState.requesting:
        return _buildRequestingState(context);
      case AnamnesisSessionState.recording:
        return _buildRecordingState(context, provider);
      case AnamnesisSessionState.stopping:
      case AnamnesisSessionState.structuring:
        return _buildProcessingState(context, provider);
      case AnamnesisSessionState.reviewing:
        return _buildReviewingState(context, provider);
      case AnamnesisSessionState.saved:
        return _buildSavedState(context, provider);
      case AnamnesisSessionState.error:
        return _buildErrorState(context, provider);
    }
  }

  // -- Idle State --

  Widget _buildIdleState(BuildContext context, AnamnesisProvider provider) {
    final availability = provider.availability;
    final isAvailable = availability?.isFullyAvailable ?? false;
    final hasPatient = widget.patientId != null;
    final isCloud = provider.isUsingCloud;

    return Column(
      children: [
        _buildInfoCard(
          context,
          icon: Icons.record_voice_over_outlined,
          title: 'Record Patient Consultation',
          description: isCloud
              ? 'Start recording to transcribe the consultation in real-time. '
                  'Audio is sent to ElevenLabs servers for transcription. '
                  'Structuring into a clinical anamnesis uses on-device AI.'
              : 'Start recording to transcribe the consultation in real-time. '
                  'The transcript will be automatically structured into a clinical '
                  'anamnesis using on-device AI. No data leaves this device.',
        ),
        const SizedBox(height: 24),
        _buildBackendSelector(context, provider),
        const SizedBox(height: 24),
        if (availability != null && !isAvailable) ...[
          _buildAvailabilityWarning(context, availability),
          const SizedBox(height: 16),
        ],
        if (!hasPatient)
          _buildWarningCard(
            context,
            'Please select a patient from the top bar before recording.',
          ),
        if (hasPatient && isAvailable)
          _buildStartButton(context, provider),
        const SizedBox(height: 32),
        if (provider.savedAnamneses.isNotEmpty)
          _buildPastAnamnesesList(context, provider),
      ],
    );
  }

  Widget _buildStartButton(BuildContext context, AnamnesisProvider provider) {
    return SizedBox(
      width: 280,
      height: 56,
      child: ElevatedButton.icon(
        onPressed: () => provider.startRecording(patientId: widget.patientId),
        icon: const Icon(Icons.mic, size: 24),
        label: const Text('Start Recording'),
        style: ElevatedButton.styleFrom(
          backgroundColor: MystasisTheme.deepBioTeal,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildAvailabilityWarning(
    BuildContext context,
    AnamnesisAvailability availability,
  ) {
    final issues = <String>[];
    if (!availability.speechAvailable) {
      issues.add('Speech recognition is not available for your language.');
    }
    if (!availability.foundationModelsAvailable) {
      issues.add(
        'Apple Intelligence is not available. Please enable it in System Settings '
        'and ensure your Mac supports Apple Intelligence.',
      );
    }
    return _buildWarningCard(context, issues.join('\n'));
  }

  // -- Backend Selector --

  Widget _buildBackendSelector(
    BuildContext context,
    AnamnesisProvider provider,
  ) {
    final currentBackend = provider.transcriptionBackend;

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
            'Transcription Engine',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontSize: 16,
                ),
          ),
          const SizedBox(height: 16),

          // On-Device option
          _BackendRadioTile(
            title: 'On-Device (Apple Speech)',
            subtitle: 'Private \u00b7 No data leaves device',
            icon: Icons.phone_iphone,
            isSelected: currentBackend == 'onDevice',
            onTap: () => provider.setTranscriptionBackend('onDevice'),
          ),
          const SizedBox(height: 8),

          // Cloud option
          _BackendRadioTile(
            title: 'Cloud (ElevenLabs)',
            subtitle: 'Higher accuracy \u00b7 99+ languages',
            icon: Icons.cloud_outlined,
            isSelected: currentBackend == 'elevenLabs',
            onTap: () => provider.setTranscriptionBackend('elevenLabs'),
          ),
        ],
      ),
    );
  }

  // -- Requesting State --

  Widget _buildRequestingState(BuildContext context) {
    return _buildInfoCard(
      context,
      icon: Icons.security,
      title: 'Requesting Permissions',
      description: 'Please allow microphone access when prompted.',
      showProgress: true,
    );
  }

  // -- Recording State --

  Widget _buildRecordingState(
    BuildContext context,
    AnamnesisProvider provider,
  ) {
    final minutes = provider.recordingDuration.inMinutes;
    final seconds = provider.recordingDuration.inSeconds % 60;
    final durationText =
        '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    final isCloud = provider.isUsingCloud;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Recording indicator
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: MystasisTheme.errorRed.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: MystasisTheme.errorRed.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  color: MystasisTheme.errorRed,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Recording',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: MystasisTheme.errorRed,
                      fontWeight: FontWeight.w500,
                    ),
              ),
              const SizedBox(width: 8),
              Icon(
                isCloud ? Icons.cloud_outlined : Icons.phone_iphone,
                size: 16,
                color: MystasisTheme.errorRed.withValues(alpha: 0.6),
              ),
              const SizedBox(width: 12),
              Text(
                durationText,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: MystasisTheme.errorRed,
                      fontFamily: 'monospace',
                    ),
              ),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: () => provider.stopRecording(),
                icon: const Icon(Icons.stop, size: 20),
                label: const Text('Stop'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: MystasisTheme.errorRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Live transcript
        Text(
          'Live Transcript',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 200),
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
          child: SelectableText(
            provider.liveTranscript.isEmpty
                ? 'Listening...'
                : provider.liveTranscript,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: provider.liveTranscript.isEmpty
                      ? MystasisTheme.neutralGrey
                      : MystasisTheme.deepGraphite,
                  height: 1.6,
                ),
          ),
        ),

        if (provider.recordingDuration.inMinutes >= 20) ...[
          const SizedBox(height: 12),
          _buildWarningCard(
            context,
            'Long recording detected. Consider stopping soon for best results.',
          ),
        ],
      ],
    );
  }

  // -- Processing State --

  Widget _buildProcessingState(
    BuildContext context,
    AnamnesisProvider provider,
  ) {
    final isStructuring =
        provider.state == AnamnesisSessionState.structuring;
    return _buildInfoCard(
      context,
      icon: Icons.auto_awesome,
      title: isStructuring
          ? 'Analyzing Consultation'
          : 'Finalizing Transcript',
      description: isStructuring
          ? 'On-device AI is structuring the transcript into a clinical anamnesis. '
              'This may take a moment.'
          : 'Finalizing the speech transcription...',
      showProgress: true,
    );
  }

  // -- Reviewing State --

  Widget _buildReviewingState(
    BuildContext context,
    AnamnesisProvider provider,
  ) {
    final anamnesis = provider.structuredAnamnesis;
    if (anamnesis == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // AI disclaimer
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: MystasisTheme.signalAmber.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: MystasisTheme.signalAmber.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.auto_awesome,
                size: 18,
                color: MystasisTheme.signalAmber,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'This structured anamnesis was generated by on-device AI from '
                  'the consultation transcript. Please review all fields for '
                  'accuracy before saving.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: MystasisTheme.deepGraphite,
                        fontStyle: FontStyle.italic,
                      ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Structured sections
        _AnamnesisSectionCard(
          title: 'Chief Complaint',
          icon: Icons.priority_high,
          content: anamnesis.chiefComplaint,
        ),
        _AnamnesisSectionCard(
          title: 'History of Present Illness',
          icon: Icons.history,
          content: anamnesis.historyOfPresentIllness,
        ),
        _AnamnesisSectionCard(
          title: 'Past Medical History',
          icon: Icons.medical_information,
          items: anamnesis.pastMedicalHistory,
        ),
        _AnamnesisSectionCard(
          title: 'Current Medications',
          icon: Icons.medication,
          items: anamnesis.currentMedications,
        ),
        _AnamnesisSectionCard(
          title: 'Allergies',
          icon: Icons.warning_amber,
          items: anamnesis.allergies,
        ),
        _AnamnesisSectionCard(
          title: 'Family History',
          icon: Icons.family_restroom,
          items: anamnesis.familyHistory,
        ),
        _AnamnesisSectionCard(
          title: 'Review of Systems',
          icon: Icons.checklist,
          items: anamnesis.reviewOfSystems,
        ),
        _AnamnesisSectionCard(
          title: 'Social History',
          icon: Icons.person,
          items: anamnesis.socialHistory,
        ),

        const SizedBox(height: 16),

        // Raw transcript toggle
        InkWell(
          onTap: () => setState(() => _showRawTranscript = !_showRawTranscript),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _showRawTranscript
                      ? Icons.expand_less
                      : Icons.expand_more,
                  color: MystasisTheme.neutralGrey,
                ),
                const SizedBox(width: 8),
                Text(
                  'Raw Transcript',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: MystasisTheme.neutralGrey,
                      ),
                ),
              ],
            ),
          ),
        ),
        if (_showRawTranscript) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: MystasisTheme.mistGrey),
            ),
            child: SelectableText(
              provider.finalTranscript,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.6,
                  ),
            ),
          ),
        ],

        const SizedBox(height: 20),
        const MedicalDisclaimer(),
        const SizedBox(height: 24),

        // Action buttons
        Row(
          children: [
            ElevatedButton.icon(
              onPressed: widget.patientId != null
                  ? () {
                      final clinicianId =
                          context.read<AuthProvider>().user?.id;
                      provider.saveAnamnesis(
                        widget.patientId!,
                        clinicianId ?? '',
                      );
                    }
                  : null,
              icon: const Icon(Icons.save, size: 20),
              label: const Text('Save Anamnesis'),
              style: ElevatedButton.styleFrom(
                backgroundColor: MystasisTheme.deepBioTeal,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 14,
                ),
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: () => provider.resetSession(),
              icon: const Icon(Icons.refresh, size: 20),
              label: const Text('New Recording'),
              style: OutlinedButton.styleFrom(
                foregroundColor: MystasisTheme.deepBioTeal,
                side: const BorderSide(color: MystasisTheme.deepBioTeal),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 14,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // -- Saved State --

  Widget _buildSavedState(BuildContext context, AnamnesisProvider provider) {
    return Column(
      children: [
        _buildInfoCard(
          context,
          icon: Icons.check_circle_outline,
          title: 'Anamnesis Saved',
          description: 'The structured anamnesis has been saved successfully.',
          iconColor: MystasisTheme.softAlgae,
        ),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: () => provider.resetSession(),
          icon: const Icon(Icons.add, size: 20),
          label: const Text('New Recording'),
          style: ElevatedButton.styleFrom(
            backgroundColor: MystasisTheme.deepBioTeal,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        const SizedBox(height: 32),
        if (provider.savedAnamneses.isNotEmpty)
          _buildPastAnamnesesList(context, provider),
      ],
    );
  }

  // -- Error State --

  Widget _buildErrorState(BuildContext context, AnamnesisProvider provider) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: MystasisTheme.errorRed.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: MystasisTheme.errorRed.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.error_outline,
                  color: MystasisTheme.errorRed, size: 24),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Something went wrong',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: MystasisTheme.errorRed,
                              ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      provider.errorMessage ?? 'An unexpected error occurred.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            ElevatedButton.icon(
              onPressed: () => provider.resetSession(),
              icon: const Icon(Icons.refresh, size: 20),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: MystasisTheme.deepBioTeal,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            if (provider.finalTranscript.isNotEmpty) ...[
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: () => provider.reStructure(),
                icon: const Icon(Icons.auto_awesome, size: 20),
                label: const Text('Retry Structuring'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: MystasisTheme.deepBioTeal,
                  side:
                      const BorderSide(color: MystasisTheme.deepBioTeal),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  // -- Shared Widgets --

  Widget _buildInfoCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
    bool showProgress = false,
    Color? iconColor,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
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
        children: [
          Icon(icon, size: 48, color: iconColor ?? MystasisTheme.deepBioTeal),
          const SizedBox(height: 16),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: MystasisTheme.neutralGrey,
                ),
            textAlign: TextAlign.center,
          ),
          if (showProgress) ...[
            const SizedBox(height: 20),
            const LinearProgressIndicator(
              color: MystasisTheme.deepBioTeal,
              backgroundColor: MystasisTheme.mistGrey,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildWarningCard(BuildContext context, String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MystasisTheme.signalAmber.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: MystasisTheme.signalAmber.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber,
              color: MystasisTheme.signalAmber, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUnsupportedPlatform(BuildContext context) {
    return Scaffold(
      backgroundColor: MystasisTheme.boneWhite,
      body: Center(
        child: _buildInfoCard(
          context,
          icon: Icons.desktop_mac_outlined,
          title: 'macOS Only Feature',
          description:
              'Anamnesis recording requires macOS with Apple Intelligence '
              'enabled. Please use the macOS desktop app.',
        ),
      ),
    );
  }

  Widget _buildPastAnamnesesList(
    BuildContext context,
    AnamnesisProvider provider,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Past Anamneses',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 12),
        ...provider.savedAnamneses.map((anamnesis) {
          return Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(Icons.description_outlined,
                    color: MystasisTheme.deepBioTeal, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        anamnesis.chiefComplaint.isNotEmpty
                            ? anamnesis.chiefComplaint
                            : 'Consultation record',
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDateTime(anamnesis.recordedAt),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                if (anamnesis.isReviewed)
                  const Icon(Icons.check_circle,
                      color: MystasisTheme.softAlgae, size: 18),
              ],
            ),
          );
        }),
      ],
    );
  }

  String _formatDateTime(DateTime dt) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year} at $hour:$minute';
  }
}

// -- Section Card Widget --

class _AnamnesisSectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final String? content;
  final List<String>? items;

  const _AnamnesisSectionCard({
    required this.title,
    required this.icon,
    this.content,
    this.items,
  });

  @override
  Widget build(BuildContext context) {
    final hasContent = (content != null && content!.isNotEmpty) ||
        (items != null && items!.isNotEmpty);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
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
          Row(
            children: [
              Icon(icon, size: 20, color: MystasisTheme.deepBioTeal),
              const SizedBox(width: 10),
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontSize: 16,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (!hasContent)
            Text(
              'No information recorded',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: MystasisTheme.neutralGrey,
                    fontStyle: FontStyle.italic,
                  ),
            )
          else if (content != null)
            SelectableText(
              content!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                  ),
            )
          else if (items != null)
            ...items!.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 6),
                        child: Icon(Icons.circle,
                            size: 6, color: MystasisTheme.deepBioTeal),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SelectableText(
                          item,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    height: 1.5,
                                  ),
                        ),
                      ),
                    ],
                  ),
                )),
        ],
      ),
    );
  }
}

// -- Backend Radio Tile Widget --

class _BackendRadioTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _BackendRadioTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected
          ? MystasisTheme.deepBioTeal.withValues(alpha: 0.06)
          : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? MystasisTheme.deepBioTeal.withValues(alpha: 0.3)
                  : MystasisTheme.mistGrey,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected
                    ? MystasisTheme.deepBioTeal
                    : MystasisTheme.neutralGrey,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: isSelected
                                ? MystasisTheme.deepGraphite
                                : MystasisTheme.neutralGrey,
                          ),
                    ),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: MystasisTheme.neutralGrey,
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                isSelected ? Icons.radio_button_on : Icons.radio_button_off,
                size: 20,
                color: isSelected
                    ? MystasisTheme.deepBioTeal
                    : MystasisTheme.neutralGrey,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
