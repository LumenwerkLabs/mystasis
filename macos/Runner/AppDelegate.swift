import Cocoa
import FlutterMacOS

@main
class AppDelegate: FlutterAppDelegate {

  /// Stored as AnyObject to avoid @available on a stored property.
  private var _anamnesisChannel: AnyObject?

  override func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    return true
  }

  override func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
    return true
  }

  override func applicationDidFinishLaunching(_ notification: Notification) {
    if let controller = mainFlutterWindow?.contentViewController as? FlutterViewController {
      if #available(macOS 26.0, *) {
        let channel = AnamnesisMethodChannel()
        channel.register(with: controller.engine.binaryMessenger)
        _anamnesisChannel = channel
      }
    }
    super.applicationDidFinishLaunching(notification)
  }
}
