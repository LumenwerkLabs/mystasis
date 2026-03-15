import FlutterMacOS
import AVFoundation

/// MethodChannel handler bridging Flutter to native anamnesis services.
/// Handles speech transcription (via TranscriptionService strategy)
/// and transcript structuring (via Foundation Models).
@available(macOS 26.0, *)
class AnamnesisMethodChannel: NSObject {

    static let channelName = "com.mystasis/anamnesis"
    static let eventChannelName = "com.mystasis/anamnesis/transcriptStream"

    private var transcriptionService: TranscriptionService
    private let structuringService: AnamnesisStructuringService

    private var methodChannel: FlutterMethodChannel?
    private var eventChannel: FlutterEventChannel?
    private var eventSink: FlutterEventSink?

    private var transcriptStreamTask: Task<Void, Never>?

    /// Called by TranscriptStreamHandler when Flutter starts/stops listening.
    func setEventSink(_ sink: FlutterEventSink?) {
        eventSink = sink
    }

    override init() {
        self.transcriptionService = OnDeviceTranscriptionService()
        self.structuringService = AnamnesisStructuringService()
        super.init()
    }

    /// Register the method channel and event channel with Flutter.
    func register(with messenger: FlutterBinaryMessenger) {
        let methodChannel = FlutterMethodChannel(
            name: AnamnesisMethodChannel.channelName,
            binaryMessenger: messenger
        )
        methodChannel.setMethodCallHandler { [weak self] call, result in
            guard let self = self else { return }
            Task { @MainActor in
                await self.handleMethodCall(call, result: result)
            }
        }
        self.methodChannel = methodChannel

        let eventChannel = FlutterEventChannel(
            name: AnamnesisMethodChannel.eventChannelName,
            binaryMessenger: messenger
        )
        let streamHandler = TranscriptStreamHandler(channel: self)
        eventChannel.setStreamHandler(streamHandler)
        self.eventChannel = eventChannel
    }

    // MARK: - Method Call Handler

    @MainActor
    private func handleMethodCall(_ call: FlutterMethodCall, result: @escaping FlutterResult) async {
        switch call.method {

        case "checkAvailability":
            let foundationModelsAvailable = await structuringService.isAvailable
            let isElevenLabs = transcriptionService is ElevenLabsTranscriptionService
            result([
                "speechAvailable": transcriptionService.isAvailable,
                "foundationModelsAvailable": foundationModelsAvailable,
                // Token is fetched per-session at recording time, so report
                // configured=true whenever ElevenLabs is the active backend.
                "elevenLabsConfigured": isElevenLabs,
            ])

        case "requestMicrophonePermission":
            let granted = await AVCaptureDevice.requestAccess(for: .audio)
            result(granted)

        case "startTranscription":
            let args = call.arguments as? [String: Any]
            let localeId = args?["locale"] as? String ?? "en-US"
            let locale = Locale(identifier: localeId)

            do {
                let stream = try await transcriptionService.startTranscription(locale: locale)

                // Forward transcript updates to the Flutter event sink
                transcriptStreamTask?.cancel()
                transcriptStreamTask = Task { [weak self] in
                    for await update in stream {
                        guard !Task.isCancelled else { break }
                        DispatchQueue.main.async {
                            self?.eventSink?([
                                "text": update.text,
                                "isFinal": update.isFinal,
                                "confidence": update.confidence ?? -1.0,
                                "isError": update.isError,
                            ])
                        }
                    }
                }

                result(nil)
            } catch {
                result(FlutterError(
                    code: "TRANSCRIPTION_ERROR",
                    message: error.localizedDescription,
                    details: nil
                ))
            }

        case "stopTranscription":
            do {
                transcriptStreamTask?.cancel()
                transcriptStreamTask = nil
                let transcript = try await transcriptionService.stopTranscription()
                result(transcript)
            } catch {
                result(FlutterError(
                    code: "TRANSCRIPTION_ERROR",
                    message: error.localizedDescription,
                    details: nil
                ))
            }

        case "structureAnamnesis":
            guard let args = call.arguments as? [String: Any],
                  let transcript = args["transcript"] as? String else {
                result(FlutterError(
                    code: "INVALID_ARGS",
                    message: "Missing 'transcript' argument",
                    details: nil
                ))
                return
            }

            do {
                let verified = try await structuringService.structure(transcript: transcript)
                result(structuringService.toDictionary(verified))
            } catch {
                result(FlutterError(
                    code: "STRUCTURING_ERROR",
                    message: error.localizedDescription,
                    details: nil
                ))
            }

        case "setTranscriptionBackend":
            // Prevent switching backends during an active recording
            if transcriptionService.isAvailable,
               transcriptStreamTask != nil {
                result(FlutterError(
                    code: "INVALID_STATE",
                    message: "Cannot change transcription backend during an active recording",
                    details: nil
                ))
                return
            }
            let args = call.arguments as? [String: Any]
            let backend = args?["backend"] as? String ?? "onDevice"
            let token = args?["token"] as? String
            switch backend {
            case "elevenLabs":
                let service = ElevenLabsTranscriptionService()
                if let token { service.configure(apiKey: token) }
                transcriptionService = service
            default:
                transcriptionService = OnDeviceTranscriptionService()
            }
            result(nil)

        case "getTranscriptionBackend":
            if transcriptionService is ElevenLabsTranscriptionService {
                result("elevenLabs")
            } else {
                result("onDevice")
            }

        default:
            result(FlutterMethodNotImplemented)
        }
    }
}

// MARK: - Event Stream Handler

/// StreamHandler for the EventChannel that delivers real-time transcript updates to Flutter.
/// Uses AnyObject reference to avoid @available constraints on stored properties.
class TranscriptStreamHandler: NSObject, FlutterStreamHandler {

    private weak var _channel: AnyObject?

    @available(macOS 26.0, *)
    init(channel: AnamnesisMethodChannel) {
        self._channel = channel
    }

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        if #available(macOS 26.0, *) {
            (_channel as? AnamnesisMethodChannel)?.setEventSink(events)
        }
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        if #available(macOS 26.0, *) {
            (_channel as? AnamnesisMethodChannel)?.setEventSink(nil)
        }
        return nil
    }
}
