import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';

/// Data class for real-time transcript updates from the native layer.
class TranscriptUpdate {
  final String text;
  final bool isFinal;
  final double? confidence;

  const TranscriptUpdate({
    required this.text,
    required this.isFinal,
    this.confidence,
  });

  factory TranscriptUpdate.fromMap(Map<dynamic, dynamic> map) {
    final rawConfidence = map['confidence'] as double?;
    return TranscriptUpdate(
      text: map['text'] as String? ?? '',
      isFinal: map['isFinal'] as bool? ?? false,
      confidence: (rawConfidence != null && rawConfidence >= 0)
          ? rawConfidence
          : null,
    );
  }
}

/// Availability status of native anamnesis services.
class AnamnesisAvailability {
  final bool speechAvailable;
  final bool foundationModelsAvailable;

  const AnamnesisAvailability({
    required this.speechAvailable,
    required this.foundationModelsAvailable,
  });

  bool get isFullyAvailable => speechAvailable && foundationModelsAvailable;
}

/// Platform channel client for native macOS anamnesis features.
/// Only available on macOS with Apple Intelligence enabled.
class AnamnesisChannel {
  static const _methodChannel = MethodChannel('com.mystasis/anamnesis');
  static const _eventChannel =
      EventChannel('com.mystasis/anamnesis/transcriptStream');

  /// Cached broadcast stream to avoid creating multiple subscriptions.
  Stream<TranscriptUpdate>? _cachedTranscriptStream;

  /// Whether the anamnesis feature is available on this platform.
  static bool get isPlatformSupported {
    if (kIsWeb) return false;
    return Platform.isMacOS;
  }

  /// Check availability of native services (speech + foundation models).
  Future<AnamnesisAvailability> checkAvailability() async {
    if (!isPlatformSupported) {
      return const AnamnesisAvailability(
        speechAvailable: false,
        foundationModelsAvailable: false,
      );
    }
    try {
      final result = await _methodChannel
          .invokeMapMethod<String, dynamic>('checkAvailability');
      return AnamnesisAvailability(
        speechAvailable: result?['speechAvailable'] as bool? ?? false,
        foundationModelsAvailable:
            result?['foundationModelsAvailable'] as bool? ?? false,
      );
    } on PlatformException {
      return const AnamnesisAvailability(
        speechAvailable: false,
        foundationModelsAvailable: false,
      );
    } on MissingPluginException {
      return const AnamnesisAvailability(
        speechAvailable: false,
        foundationModelsAvailable: false,
      );
    }
  }

  /// Request microphone permission. Returns true if granted.
  Future<bool> requestMicrophonePermission() async {
    if (!isPlatformSupported) return false;
    try {
      final granted =
          await _methodChannel.invokeMethod<bool>('requestMicrophonePermission');
      return granted ?? false;
    } on PlatformException {
      return false;
    }
  }

  /// Start live transcription. Listen to [transcriptStream] for updates.
  Future<void> startTranscription({String locale = 'en-US'}) async {
    await _methodChannel
        .invokeMethod('startTranscription', {'locale': locale});
  }

  /// Stop transcription and return the final full transcript.
  Future<String> stopTranscription() async {
    final result =
        await _methodChannel.invokeMethod<String>('stopTranscription');
    return result ?? '';
  }

  /// Stream of real-time transcript updates during an active session.
  /// Lazily cached to avoid creating duplicate broadcast subscriptions.
  Stream<TranscriptUpdate> get transcriptStream {
    _cachedTranscriptStream ??=
        _eventChannel.receiveBroadcastStream().map((event) {
      return TranscriptUpdate.fromMap(event as Map<dynamic, dynamic>);
    });
    return _cachedTranscriptStream!;
  }

  /// Invalidate the cached stream (call after transcription ends).
  void resetTranscriptStream() {
    _cachedTranscriptStream = null;
  }

  /// Send raw transcript to native Foundation Models for structuring.
  Future<Map<String, dynamic>> structureAnamnesis(String transcript) async {
    final result = await _methodChannel.invokeMapMethod<String, dynamic>(
      'structureAnamnesis',
      {'transcript': transcript},
    );
    return result ?? {};
  }

  /// Switch the transcription backend (e.g., "onDevice" or "elevenLabs").
  Future<void> setTranscriptionBackend(String backend) async {
    await _methodChannel
        .invokeMethod('setTranscriptionBackend', {'backend': backend});
  }
}
