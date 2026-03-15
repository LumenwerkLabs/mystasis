import Foundation
import Speech
import AVFoundation
import os

/// On-device transcription using Apple's SpeechAnalyzer + SpeechTranscriber.
/// Requires macOS 26+ and Apple Intelligence enabled.
@available(macOS 26.0, *)
class OnDeviceTranscriptionService: TranscriptionService {

    // MARK: - Properties

    private var analyzer: SpeechAnalyzer?
    private var transcriber: SpeechTranscriber?
    private var audioEngine: AVAudioEngine?
    private var inputContinuation: AsyncStream<AnalyzerInput>.Continuation?

    /// Lock protecting transcript state (`finalizedSegments`, `currentVolatileText`, `_isRecording`)
    /// to prevent data races between the result-processing Task, stopTranscription, and the audio tap.
    private let stateLock = OSAllocatedUnfairLock(initialState: TranscriptState())

    /// Mutable state protected by `stateLock`.
    private struct TranscriptState {
        var finalizedSegments: [String] = []
        var currentVolatileText: String = ""
        var isRecording: Bool = false
    }

    /// Assemble transcript from finalized segments + optional volatile text.
    /// Must be called either from within a `stateLock.withLock` block (pass the state directly)
    /// or via the convenience `accumulatedTranscript` computed property.
    private static func assembleTranscript(from state: TranscriptState) -> String {
        let finalized = state.finalizedSegments.joined(separator: " ")
        if state.currentVolatileText.isEmpty {
            return finalized
        }
        return finalized.isEmpty ? state.currentVolatileText : finalized + " " + state.currentVolatileText
    }

    /// The full transcript computed from locked state.
    private var accumulatedTranscript: String {
        stateLock.withLock { Self.assembleTranscript(from: $0) }
    }

    var isAvailable: Bool {
        // SpeechTranscriber.isAvailable is a synchronous check for device support
        return SpeechTranscriber.isAvailable
    }

    var displayName: String { "On-Device (Apple Speech)" }

    // MARK: - TranscriptionService

    func startTranscription(locale: Locale) async throws -> AsyncStream<TranscriptionUpdate> {
        let alreadyRecording = stateLock.withLock { $0.isRecording }
        guard !alreadyRecording else {
            throw TranscriptionError.alreadyRecording
        }

        // Resolve a supported locale
        guard let supportedLocale = await SpeechTranscriber.supportedLocale(equivalentTo: locale) else {
            throw TranscriptionError.speechRecognitionUnavailable
        }

        // Step 1: Create the transcriber module with progressive preset for live audio
        let transcriber = SpeechTranscriber(locale: supportedLocale, preset: .progressiveTranscription)
        self.transcriber = transcriber

        // Step 2: Ensure assets are available
        if let installationRequest = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
            try await installationRequest.downloadAndInstall()
        }

        // Step 3: Determine the audio format the analyzer expects
        guard let targetFormat = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [transcriber]) else {
            throw TranscriptionError.speechRecognitionUnavailable
        }

        // Step 4: Create the audio input stream
        let (inputSequence, inputContinuation) = AsyncStream.makeStream(of: AnalyzerInput.self)
        self.inputContinuation = inputContinuation

        // Step 5: Create the analyzer
        let analyzer = SpeechAnalyzer(modules: [transcriber])
        self.analyzer = analyzer

        // Step 6: Set up AVAudioEngine for microphone capture with format conversion
        let audioEngine = AVAudioEngine()
        self.audioEngine = audioEngine

        let inputNode = audioEngine.inputNode
        let micFormat = inputNode.outputFormat(forBus: 0)

        // Install a tap on the audio input to capture microphone audio
        // Convert from mic format to the analyzer's expected format
        let needsConversion = micFormat != targetFormat
        var converter: AVAudioConverter? = nil
        if needsConversion {
            converter = AVAudioConverter(from: micFormat, to: targetFormat)
        }

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: micFormat) { [weak self] buffer, _ in
            guard let self = self else { return }
            let recording = self.stateLock.withLock { $0.isRecording }
            guard recording else { return }

            if let converter = converter {
                // Convert audio to the target format
                let frameCount = AVAudioFrameCount(
                    Double(buffer.frameLength) * targetFormat.sampleRate / micFormat.sampleRate
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
                self.inputContinuation?.yield(AnalyzerInput(buffer: convertedBuffer))
            } else {
                self.inputContinuation?.yield(AnalyzerInput(buffer: buffer))
            }
        }

        try audioEngine.start()
        stateLock.withLock { state in
            state.finalizedSegments = []
            state.currentVolatileText = ""
            state.isRecording = true
        }

        // Step 7: Start analysis in a background task
        Task {
            _ = try? await analyzer.analyzeSequence(inputSequence)
        }

        // Step 8: Create the output stream from transcriber results.
        // Each result is a segment/phrase. With progressiveTranscription,
        // volatile results refine the current segment, then a new segment starts.
        // We track finalized segments separately so pauses don't erase prior text.
        let outputStream = AsyncStream<TranscriptionUpdate> { continuation in
            Task { [weak self] in
                do {
                    for try await result in transcriber.results {
                        guard let self = self else { break }
                        let segmentText = String(result.text.characters)

                        // Update transcript state under the lock to prevent races
                        // with stopTranscription().
                        let fullTranscript = self.stateLock.withLock { state -> String in
                            let previousVolatile = state.currentVolatileText
                            if !previousVolatile.isEmpty && !segmentText.hasPrefix(previousVolatile.prefix(min(previousVolatile.count, 20))) {
                                state.finalizedSegments.append(previousVolatile)
                            }
                            state.currentVolatileText = segmentText
                            return Self.assembleTranscript(from: state)
                        }

                        continuation.yield(TranscriptionUpdate(
                            text: fullTranscript,
                            isFinal: false,
                            confidence: nil
                        ))
                    }
                    // Stream ended normally — finalize the last volatile segment
                    if let self = self {
                        let finalText = self.stateLock.withLock { state -> String in
                            if !state.currentVolatileText.isEmpty {
                                state.finalizedSegments.append(state.currentVolatileText)
                                state.currentVolatileText = ""
                            }
                            return Self.assembleTranscript(from: state)
                        }
                        if !finalText.isEmpty {
                            continuation.yield(TranscriptionUpdate(
                                text: finalText,
                                isFinal: true,
                                confidence: nil
                            ))
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish()
                }
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

        // Stop audio engine (no more audio tap callbacks after this)
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil

        // Close the input stream to signal end of audio
        inputContinuation?.finish()
        inputContinuation = nil

        // Finalize analysis — this may cause the result-processing Task
        // to emit final results before its for-await loop ends.
        if let analyzer = analyzer {
            try? await analyzer.finalizeAndFinishThroughEndOfInput()
        }

        // Finalize any remaining volatile segment under the lock
        let finalTranscript = stateLock.withLock { state -> String in
            if !state.currentVolatileText.isEmpty {
                state.finalizedSegments.append(state.currentVolatileText)
                state.currentVolatileText = ""
            }
            return Self.assembleTranscript(from: state)
        }

        // Clean up
        analyzer = nil
        transcriber = nil

        if finalTranscript.isEmpty {
            throw TranscriptionError.noSpeechDetected
        }

        return finalTranscript
    }
}
