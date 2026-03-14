import Flutter
import HealthKit

/// Platform channel for reading VO2 Max from HealthKit.
///
/// The Flutter `health` package does not expose VO2 Max, so we read it
/// directly via a MethodChannel.
class VO2MaxChannel {
  static let channelName = "com.mystasis/vo2max"

  private let healthStore = HKHealthStore()

  func register(with messenger: FlutterBinaryMessenger) {
    let channel = FlutterMethodChannel(name: VO2MaxChannel.channelName, binaryMessenger: messenger)
    channel.setMethodCallHandler { [weak self] call, result in
      guard let self = self else { return }
      switch call.method {
      case "getVO2Max":
        let args = call.arguments as? [String: Any]
        let sinceDateMs = args?["sinceMs"] as? Double
        let since = sinceDateMs.map { Date(timeIntervalSince1970: $0 / 1000.0) }
        self.fetchVO2Max(since: since, result: result)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private func fetchVO2Max(since: Date?, result: @escaping FlutterResult) {
    guard HKHealthStore.isHealthDataAvailable() else {
      result([])
      return
    }

    guard let vo2MaxType = HKQuantityType.quantityType(forIdentifier: .vo2Max) else {
      result([])
      return
    }

    // Request read permission
    healthStore.requestAuthorization(toShare: nil, read: [vo2MaxType]) { success, error in
      if !success {
        result([])
        return
      }

      let startDate = since ?? Calendar.current.date(byAdding: .day, value: -7, to: Date())!
      let predicate = HKQuery.predicateForSamples(
        withStart: startDate,
        end: Date(),
        options: .strictStartDate
      )

      let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

      let query = HKSampleQuery(
        sampleType: vo2MaxType,
        predicate: predicate,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: [sortDescriptor]
      ) { _, samples, error in
        guard let samples = samples as? [HKQuantitySample], error == nil else {
          DispatchQueue.main.async { result([]) }
          return
        }

        let data: [[String: Any]] = samples.map { sample in
          return [
            "value": sample.quantity.doubleValue(for: HKUnit(from: "mL/kg·min")),
            "timestamp": ISO8601DateFormatter().string(from: sample.startDate),
            "source": sample.sourceRevision.source.bundleIdentifier,
          ]
        }

        DispatchQueue.main.async { result(data) }
      }

      self.healthStore.execute(query)
    }
  }
}
