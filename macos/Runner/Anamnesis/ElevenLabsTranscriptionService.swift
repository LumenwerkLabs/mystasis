import Foundation

/// Placeholder for future ElevenLabs cloud-based transcription.
/// Will use WebSocket streaming to ElevenLabs Speech-to-Text API.
///
/// When implementing:
/// 1. Add API key management (store in Keychain via FlutterSecureStorage)
/// 2. Open WebSocket to ElevenLabs STT endpoint
/// 3. Stream audio chunks via WebSocket
/// 4. Receive partial transcripts from the API
/// 5. Return results via AsyncStream<TranscriptionUpdate>
class ElevenLabsTranscriptionService: TranscriptionService {

    var isAvailable: Bool { false }

    var displayName: String { "Cloud (ElevenLabs)" }

    func startTranscription(locale: Locale) async throws -> AsyncStream<TranscriptionUpdate> {
        throw TranscriptionError.serviceUnavailable
    }

    func stopTranscription() async throws -> String {
        throw TranscriptionError.serviceUnavailable
    }
}
