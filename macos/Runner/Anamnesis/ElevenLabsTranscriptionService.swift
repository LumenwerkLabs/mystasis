import Foundation
import AVFoundation
import os

/// ElevenLabs cloud-based real-time transcription via WebSocket.
/// Uses the `scribe_v2` model with VAD-based commit strategy.
///
/// Audio flow: AVAudioEngine mic → PCM 16kHz 16-bit → base64 → WebSocket → ElevenLabs
/// Results flow: WebSocket ← partial_transcript / committed_transcript → AsyncStream<TranscriptionUpdate>
@available(macOS 13.0, *)
class ElevenLabsTranscriptionService: TranscriptionService {

    // MARK: - Constants

    private static let webSocketURL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
    private static let targetSampleRate: Double = 16000
    private static let logger = Logger(subsystem: "com.mystasis", category: "ElevenLabsSTT")

    // MARK: - Properties

    private var token: String?
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var audioEngine: AVAudioEngine?
    private var stateLock = OSAllocatedUnfairLock(initialState: TranscriptState())

    private struct TranscriptState {
        var committedTexts: [String] = []
        var currentPartial: String = ""
        var isRecording: Bool = false
    }

    /// Assemble full transcript from committed segments + current partial.
    private static func assembleTranscript(from state: TranscriptState) -> String {
        let committed = state.committedTexts.joined(separator: " ")
        if state.currentPartial.isEmpty {
            return committed
        }
        return committed.isEmpty ? state.currentPartial : committed + " " + state.currentPartial
    }

    private var accumulatedTranscript: String {
        stateLock.withLock { Self.assembleTranscript(from: $0) }
    }

    // MARK: - TranscriptionService

    var isAvailable: Bool {
        guard let token, !token.isEmpty else { return false }
        return true
    }

    var displayName: String { "Cloud (ElevenLabs)" }

    var apiKeyRequired: Bool { true }

    func configure(apiKey: String) {
        self.token = apiKey
    }

    func startTranscription(locale: Locale) async throws -> AsyncStream<TranscriptionUpdate> {
        guard let token, !token.isEmpty else {
            throw TranscriptionError.serviceUnavailable
        }

        let alreadyRecording = stateLock.withLock { $0.isRecording }
        guard !alreadyRecording else {
            throw TranscriptionError.alreadyRecording
        }

        // Step 1: Open WebSocket connection with temp token as query parameter
        guard var urlComponents = URLComponents(string: Self.webSocketURL) else {
            throw TranscriptionError.serviceUnavailable
        }
        urlComponents.queryItems = [URLQueryItem(name: "token", value: token)]
        guard let url = urlComponents.url else {
            throw TranscriptionError.serviceUnavailable
        }
        let request = URLRequest(url: url)

        // Use an ephemeral session to avoid caching credentials/URLs on disk
        let session = URLSession(configuration: .ephemeral)
        self.urlSession = session
        let webSocketTask = session.webSocketTask(with: request)
        self.webSocketTask = webSocketTask
        webSocketTask.resume()

        // Step 2: Wait for session_started and send session config
        let sessionMessage = try await webSocketTask.receive()
        guard case .string(let text) = sessionMessage,
              let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let msgType = json["message_type"] as? String,
              msgType == "session_started" else {
            Self.logger.error("ElevenLabs WebSocket did not return session_started")
            throw TranscriptionError.transcriptionFailed("Failed to establish transcription session.")
        }
        Self.logger.info("ElevenLabs WebSocket session started")

        // Send session configuration
        let languageCode = locale.language.languageCode?.identifier ?? "en"
        let config: [String: Any] = [
            "type": "session_config",
            "transcription_config": [
                "model": "scribe_v2",
                "language_code": languageCode,
                "encoding": "pcm_s16le",
                "sample_rate": Int(Self.targetSampleRate),
            ],
            "vad_config": [
                "vad_mode": "vad",
                "vad_silence_threshold_secs": 2.0,
            ],
        ]
        let configData = try JSONSerialization.data(withJSONObject: config)
        guard let configString = String(data: configData, encoding: .utf8) else {
            throw TranscriptionError.transcriptionFailed("Failed to encode session configuration.")
        }
        try await webSocketTask.send(.string(configString))

        // Step 3: Set up AVAudioEngine for mic capture
        let audioEngine = AVAudioEngine()
        self.audioEngine = audioEngine

        let inputNode = audioEngine.inputNode
        let micFormat = inputNode.outputFormat(forBus: 0)

        // Create converter to 16kHz 16-bit mono PCM
        let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: Self.targetSampleRate,
            channels: 1,
            interleaved: true
        )!
        let converter = AVAudioConverter(from: micFormat, to: targetFormat)

        // Reset state
        stateLock.withLock { state in
            state.committedTexts = []
            state.currentPartial = ""
            state.isRecording = true
        }

        // Step 4: Install audio tap to capture and send audio
        inputNode.installTap(onBus: 0, bufferSize: 4096, format: micFormat) { [weak self] buffer, _ in
            guard let self else { return }
            let recording = self.stateLock.withLock { $0.isRecording }
            guard recording else { return }

            guard let converter else { return }

            // Convert to target format
            let frameCount = AVAudioFrameCount(
                Double(buffer.frameLength) * Self.targetSampleRate / micFormat.sampleRate
            )
            guard frameCount > 0,
                  let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount) else {
                return
            }

            var error: NSError?
            let status = converter.convert(to: convertedBuffer, error: &error) { _, outStatus in
                outStatus.pointee = .haveData
                return buffer
            }
            guard status != .error, error == nil else { return }

            // Extract raw PCM bytes and base64-encode
            guard let int16Data = convertedBuffer.int16ChannelData else { return }
            let byteCount = Int(convertedBuffer.frameLength) * MemoryLayout<Int16>.size
            let data = Data(bytes: int16Data[0], count: byteCount)
            let base64Audio = data.base64EncodedString()

            // Send audio chunk via WebSocket
            let message: [String: Any] = [
                "message_type": "input_audio_chunk",
                "audio_base_64": base64Audio,
            ]
            if let jsonData = try? JSONSerialization.data(withJSONObject: message),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                self.webSocketTask?.send(.string(jsonString)) { sendError in
                    if let sendError {
                        Self.logger.error("Failed to send audio chunk: \(sendError.localizedDescription)")
                    }
                }
            }
        }

        try audioEngine.start()

        // Step 5: Create output stream that reads WebSocket messages
        let outputStream = AsyncStream<TranscriptionUpdate> { continuation in
            Task { [weak self] in
                guard let self else {
                    continuation.finish()
                    return
                }

                while let webSocket = self.webSocketTask {
                    do {
                        let message = try await webSocket.receive()
                        guard case .string(let text) = message,
                              let data = text.data(using: .utf8),
                              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                              let msgType = json["message_type"] as? String else {
                            continue
                        }

                        switch msgType {
                        case "partial_transcript":
                            let partialText = json["text"] as? String ?? ""
                            let fullTranscript = self.stateLock.withLock { state -> String in
                                state.currentPartial = partialText
                                return Self.assembleTranscript(from: state)
                            }
                            continuation.yield(TranscriptionUpdate(
                                text: fullTranscript,
                                isFinal: false,
                                confidence: nil
                            ))

                        case "committed_transcript":
                            let committedText = json["text"] as? String ?? ""
                            let fullTranscript = self.stateLock.withLock { state -> String in
                                if !committedText.isEmpty {
                                    state.committedTexts.append(committedText)
                                }
                                state.currentPartial = ""
                                return Self.assembleTranscript(from: state)
                            }
                            continuation.yield(TranscriptionUpdate(
                                text: fullTranscript,
                                isFinal: false,
                                confidence: nil
                            ))

                        case "error":
                            let errorMsg = json["message"] as? String ?? "Unknown error"
                            let errorType = json["error_type"] as? String ?? "unknown"
                            Self.logger.error("ElevenLabs error [\(errorType)]: \(errorMsg)")

                            // Map specific error types to user-friendly messages
                            let userMessage: String
                            switch errorType {
                            case "auth_error":
                                userMessage = "Transcription session expired. Please try again."
                            case "quota_exceeded":
                                userMessage = "Cloud transcription quota exceeded. Switch to on-device or contact your administrator."
                            case "rate_limited":
                                userMessage = "Too many requests. Please wait a moment and try again."
                            case "session_time_limit_exceeded":
                                userMessage = "Recording exceeded the maximum session length."
                            default:
                                userMessage = "Cloud transcription error. Please try again."
                            }

                            // Yield the error message as a final update so Flutter can surface it
                            continuation.yield(TranscriptionUpdate(
                                text: userMessage,
                                isFinal: true,
                                confidence: nil,
                                isError: true
                            ))
                            continuation.finish()
                            self.stateLock.withLock { $0.isRecording = false }
                            return

                        case "session_ended":
                            Self.logger.info("ElevenLabs session ended")
                            // Yield final transcript
                            let finalText = self.accumulatedTranscript
                            if !finalText.isEmpty {
                                continuation.yield(TranscriptionUpdate(
                                    text: finalText,
                                    isFinal: true,
                                    confidence: nil
                                ))
                            }
                            continuation.finish()
                            return

                        default:
                            break
                        }
                    } catch {
                        // WebSocket closed or network error
                        let isStillRecording = self.stateLock.withLock { $0.isRecording }
                        if isStillRecording {
                            Self.logger.error("WebSocket receive error: \(error.localizedDescription)")
                        }
                        continuation.finish()
                        return
                    }
                }
                continuation.finish()
            }
        }

        return outputStream
    }

    func stopTranscription() async throws -> String {
        let wasRecording = stateLock.withLock { state -> Bool in
            guard state.isRecording else { return false }
            state.isRecording = false
            return true
        }

        guard wasRecording else {
            return accumulatedTranscript
        }

        // Stop audio engine
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil

        // Send end_of_stream to ElevenLabs
        if let webSocketTask {
            let endMessage: [String: Any] = ["message_type": "end_of_stream"]
            if let data = try? JSONSerialization.data(withJSONObject: endMessage),
               let str = String(data: data, encoding: .utf8) {
                try? await webSocketTask.send(.string(str))
            }

            // Allow a brief moment for final committed_transcript to arrive
            try? await Task.sleep(for: .milliseconds(500))

            // Close the WebSocket and invalidate the session
            webSocketTask.cancel(with: .normalClosure, reason: nil)
            self.webSocketTask = nil
            self.urlSession?.invalidateAndCancel()
            self.urlSession = nil
        }

        // Clear the consumed token — a fresh one is needed for the next session
        self.token = nil

        let finalTranscript = accumulatedTranscript

        if finalTranscript.isEmpty {
            throw TranscriptionError.noSpeechDetected
        }

        return finalTranscript
    }
}
