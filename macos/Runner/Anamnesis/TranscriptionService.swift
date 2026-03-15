import Foundation

// MARK: - Strategy Protocol

/// Strategy protocol for transcription backends.
/// Allows swapping between on-device Speech and cloud APIs (e.g., ElevenLabs).
protocol TranscriptionService: AnyObject {
    /// Start a live transcription session. Returns an AsyncStream of partial transcripts.
    func startTranscription(locale: Locale) async throws -> AsyncStream<TranscriptionUpdate>
    /// Stop the current transcription session. Returns the final full transcript.
    func stopTranscription() async throws -> String
    /// Whether this service is available on the current device.
    var isAvailable: Bool { get }
    /// Human-readable name for UI display.
    var displayName: String { get }
    /// Whether this service requires an API key to function.
    var apiKeyRequired: Bool { get }
    /// Configure the service with an API key. No-op for services that don't require one.
    func configure(apiKey: String)
}

/// Default implementations for services that don't require API keys.
extension TranscriptionService {
    var apiKeyRequired: Bool { false }
    func configure(apiKey: String) {}
}

// MARK: - Data Types

/// A partial or final transcript update emitted during live transcription.
struct TranscriptionUpdate: Sendable {
    let text: String
    let isFinal: Bool
    let confidence: Double?
    /// When true, `text` contains an error message rather than transcript content.
    let isError: Bool

    init(text: String, isFinal: Bool, confidence: Double?, isError: Bool = false) {
        self.text = text
        self.isFinal = isFinal
        self.confidence = confidence
        self.isError = isError
    }
}

/// Errors that can occur during transcription.
enum TranscriptionError: LocalizedError {
    case serviceUnavailable
    case microphoneAccessDenied
    case speechRecognitionUnavailable
    case transcriptionFailed(String)
    case noSpeechDetected
    case alreadyRecording

    var errorDescription: String? {
        switch self {
        case .serviceUnavailable:
            return "Transcription service is not available."
        case .microphoneAccessDenied:
            return "Microphone access was denied. Please enable it in System Settings > Privacy & Security > Microphone."
        case .speechRecognitionUnavailable:
            return "Speech recognition is not available on this device."
        case .transcriptionFailed(let message):
            return "Transcription failed: \(message)"
        case .noSpeechDetected:
            return "No speech was detected in the recording."
        case .alreadyRecording:
            return "A recording session is already in progress."
        }
    }
}
