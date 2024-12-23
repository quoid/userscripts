import Cocoa

@NSApplicationMain
class AppDelegate: NSObject, NSApplicationDelegate {

	private var window: NSWindow!
	private var windowForego = false
	private var windowLoaded = false
	private let logger = USLogger(#fileID)

	@IBOutlet weak var enbaleNativeLogger: NSMenuItem!

	@objc func handleGetURL(event: NSAppleEventDescriptor, replyEvent: NSAppleEventDescriptor) {
		// issue: https://developer.apple.com/forums/thread/697217
//		sendExtensionMessage(name: "URL_SCHEME_STARTED")
		// if open panel is already open, stop processing the URL scheme
		if NSApplication.shared.keyWindow?.accessibilityIdentifier() == "open-panel" { return }
		// handle URL scheme
		if let urlString = event.paramDescriptor(forKeyword: AEKeyword(keyDirectObject))?.stringValue,
		   let url = URL(string: urlString) {
			logger?.info("\(#function, privacy: .public) - \(urlString, privacy: .public)")
			if url.host == "changesavelocation" {
				// avoid opening the panel repeatedly and playing unnecessary warning sounds
				if NSApplication.shared.keyWindow?.identifier?.rawValue == "changeSaveLocation" { return }
				if windowLoaded {
					let viewController = window.contentViewController as? ViewController
					viewController?.changeSaveLocation(nil)
				} else {
					windowForego = true
					schemeChangeSaveLocation()
				}
			}
		}
	}

	// https://developer.apple.com/documentation/appkit/nsapplicationdelegate/1428623-applicationwillfinishlaunching/
	func applicationWillFinishLaunching(_ notification: Notification) {
		// https://developer.apple.com/documentation/foundation/nsappleeventmanager/1416131-seteventhandler
		NSAppleEventManager.shared().setEventHandler(
			self,
			andSelector: #selector(handleGetURL(event:replyEvent:)),
			forEventClass: AEEventClass(kInternetEventClass),
			andEventID: AEEventID(kAEGetURL)
		)
	}

	// https://developer.apple.com/documentation/appkit/nsapplicationdelegate/1428385-applicationdidfinishlaunching
	func applicationDidFinishLaunching(_ notification: Notification) {
		// Initialize menu items
		enbaleNativeLogger.state = Preferences.enableLogger ? .on : .off
		// Whether to initialize the main view
		logger?.debug("\(#function, privacy: .public) - windowForego: \(self.windowForego, privacy: .public)")
		if windowForego { return }
		let storyboard = NSStoryboard(name: "View", bundle: Bundle.main)
		let windowController = storyboard.instantiateInitialController() as! NSWindowController
//		let viewController = windowController.contentViewController as! ViewController
		window = windowController.window
		window.setIsVisible(true)
		windowLoaded = true
	}

	func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
		return true
	}

	func applicationWillTerminate(_ notification: Notification) {
		// Insert code here to tear down your application
		USLogStoreToFile()
	}

	func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
		return true
	}

	@IBAction func enableLogger(_ sender: NSMenuItem) {
		if sender.state == .on {
			Preferences.enableLogger = false
			sender.state = .off
		} else {
			Preferences.enableLogger = true
			sender.state = .on
		}
	}

	@IBAction func applicationHelp(_ sender: NSMenuItem) {
		if let url = URL(string: "https://github.com/quoid/userscripts") {
			NSWorkspace.shared.open(url)
		}
	}

}
