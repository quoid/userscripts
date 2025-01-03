import WebKit
import SwiftUI

#if os(iOS)
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import SafariServices.SFSafariApplication
typealias PlatformViewController = NSViewController
#endif

private let logger = USLogger(#fileID)

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandlerWithReply {

	@IBOutlet var webView: WKWebView!
	
	enum ExtensionState: String {
		case unknow = "unknow"
		case on = "enabled"
		case off = "disabled"
		case error = "error"
	}
	var extensionState: ExtensionState = .unknow
#if os(iOS)
	var documentPickerHandler: ((URL) -> Void)?
#elseif os(macOS)
	var timerExtensionStateCheck: Timer?
#endif

	// https://developer.apple.com/documentation/uikit/uiviewcontroller/1621454-loadview
	override func loadView() {
		// https://developer.apple.com/documentation/webkit/wkwebviewconfiguration
		let configuration = WKWebViewConfiguration()
		// https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/2875766-seturlschemehandler
		configuration.setURLSchemeHandler(USchemeHandler(), forURLScheme: AppWebViewUrlScheme)
		// https://developer.apple.com/documentation/webkit/wkusercontentcontroller
		configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "controller")
		// https://developer.apple.com/documentation/webkit/wkwebview
		self.webView = WKWebView(frame: .zero, configuration: configuration)
#if os(iOS)
		self.webView.isOpaque = false
		// https://developer.apple.com/documentation/uikit/appearance_customization/supporting_dark_mode_in_your_interface#2993897
		self.webView.backgroundColor = UIColor(named: "USBackgroundColor")
//		self.webView.backgroundColor = .clear // DEBUG
//		self.webView.scrollView.isScrollEnabled = false
#elseif os(macOS)
		self.webView.frame = NSRect(x: 0, y: 0, width: 600, height: 600)
		self.webView.setValue(false, forKey: "drawsBackground")
#endif
		// https://developer.apple.com/documentation/webkit/wknavigationdelegate
		self.webView.navigationDelegate = self
#if DEBUG
		// https://webkit.org/blog/13936/enabling-the-inspection-of-web-content-in-apps/
		if #available(macOS 13.3, iOS 16.4, tvOS 16.4, *) {
			// https://developer.apple.com/documentation/webkit/wkwebview/4111163-inspectable/
			self.webView.isInspectable = true
		}
		logger?.debug("\(#function, privacy: .public) - DEBUG mode: isInspectable = true")
#endif
		self.view = self.webView
	}

	// https://developer.apple.com/documentation/uikit/uiviewcontroller/1621495-viewdidload
	override func viewDidLoad() {
		super.viewDidLoad()
#if VITE
		let url = URL(string: "https://userscripts.test:55173/entry-app-webview.html")!
#else
		let url = URL(string: "\(AppWebViewUrlScheme):///")!
#endif
		self.webView.load(URLRequest(url: url))
#if os(macOS)
		NotificationCenter.default.addObserver(
			self,
			selector: #selector(handleOcclusionStateChange),
			name: NSApplication.didChangeOcclusionStateNotification,
			object: nil
		)
#endif
	}

	// https://developer.apple.com/documentation/webkit/wknavigationdelegate/1455629-webview
	// DOMContentLoaded
//	func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
//		webView.evaluateJavaScript("")
//	}

	func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
		if navigationAction.navigationType == .linkActivated  {
			guard let url = navigationAction.request.url else {
				decisionHandler(.allow)
				return
			}
			// allow registration scheme
			if url.scheme == AppWebViewUrlScheme {
				decisionHandler(.allow)
				return
			}
			// allow specified url prefixes
//			let allowPrefixes = [
//				"https://github.com/quoid/userscripts"
//			]
//			for prefix in allowPrefixes {
//				if url.absoluteString.lowercased().hasPrefix(prefix) {
//					decisionHandler(.allow)
//					return
//				}
//			}
			// open from external app like safari
#if os(iOS)
			if UIApplication.shared.canOpenURL(url) {
				UIApplication.shared.open(url)
				decisionHandler(.cancel)
				return
			}
#elseif os(macOS)
			if let _ = NSWorkspace.shared.urlForApplication(toOpen: url) {
				NSWorkspace.shared.open(url)
				decisionHandler(.cancel)
				return
			}
#endif
			decisionHandler(.allow)
		}
		decisionHandler(.allow)
	}

	func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) async -> (Any?, String?) {
		guard let name = message.body as? String else {
			logger?.error("\(#function, privacy: .public) - Userscripts iOS received a message without a name")
			return (nil, "bad message body")
		}
		logger?.debug("\(#function, privacy: .public) - Got message: \(name)")
		switch name {
		case "INIT":
			let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
			let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
			let firstRunTime = Preferences.firstRunTime
			if(firstRunTime == 0) {
				Preferences.firstRunTime = Int(Date().timeIntervalSince1970 * 1000)
			}
			var useSettingsInsteadOfPreferences = false
#if os(iOS)
			let platform = "ios"
#elseif os(macOS)
			let platform = "mac"
			do {
				let state = try await SFSafariExtensionManager.stateOfSafariExtension(withIdentifier: extIdentifier)
				self.extensionState = state.isEnabled ? .on : .off
			} catch {
				self.extensionState = .error
				logger?.error("\(#function, privacy: .public) - \(error.localizedDescription, privacy: .public)")
			}
			if #available(macOS 13, *) {
				useSettingsInsteadOfPreferences = true
			}
#endif
			return ([
				"build": buildNumber,
				"version": appVersion,
				"platform": platform,
				"directory": getCurrentScriptsDirectoryString(),
				"extStatus": self.extensionState.rawValue,
				"useSettingsInsteadOfPreferences": useSettingsInsteadOfPreferences,
				"enableLogger": Preferences.enableLogger,
				"promptLogger": Preferences.promptLogger,
				"maxLogFileSize": Preferences.maxLogFileSize,
				"firstRunTime": firstRunTime,
			], nil)
		case "CHANGE_DIRECTORY":
			changeSaveLocation()
			break
		case "OPEN_DIRECTORY":
#if os(iOS)
			guard let saveLocation = getSaveLocation() else {
				return (nil, "Uninitialized save location")
			}
			guard var components = URLComponents(url: saveLocation, resolvingAgainstBaseURL: true) else {
				return (nil, "ScriptsDirectoryUrl malformed")
			}
			components.scheme = "shareddocuments"
			if let url = components.url, UIApplication.shared.canOpenURL(url) {
				await UIApplication.shared.open(url)
			}
#elseif os(macOS)
			guard openSaveLocation() else {
				return (nil, "ScriptsDirectoryUrl malformed")
			}
#endif
			break
#if os(macOS)
		case "SHOW_PREFERENCES":
			do {
				try await SFSafariApplication.showPreferencesForExtension(withIdentifier: extIdentifier)
			} catch {
				logger?.error("\(#function, privacy: .public) - \(error.localizedDescription, privacy: .public)")
				return (nil, error.localizedDescription)
			}
			break
#endif
		case "EXPORT_LOG_FILES":
			// write the logStore so far to log files (async, no guarantee)
			USLogStoreToFile(prioritize: true)
			// call the export func of different platforms
			exportLogFiles()
			break
		case "DISABLE_LOGGER":
			USLoggerSwitch(false)
			break
		case "DISMISS_LOGGER_PROMPT":
			Preferences.promptLogger = false
			break
		default:
			return (nil, "Unexpected message body")
		}
		return (nil, nil)
	}

	func updateEnableLoggerState() {
		self.webView.evaluateJavaScript("webapp.switchLogger(\(Preferences.enableLogger),\(Preferences.promptLogger))")
	}
	
	func updateCurrentDirectory() {
		self.webView.evaluateJavaScript("webapp.updateDirectory('\(getCurrentScriptsDirectoryString())')")
	}

#if os(macOS)
	deinit {
		NotificationCenter.default.removeObserver(
			self,
			name: NSApplication.didChangeOcclusionStateNotification,
			object: nil
		)
		
		DistributedNotificationCenter.default.removeObserver(
			self,
			name: NSNotification.Name("AppleInterfaceThemeChangedNotification"),
			object: nil
		)
	}
#endif

}

#if os(iOS)
// https://developer.apple.com/documentation/uikit/view_controllers/providing_access_to_directories
// https://developer.apple.com/documentation/uikit/uidocumentpickerviewcontroller
extension ViewController: UIDocumentPickerDelegate {
	
	// UIDocumentPickerDelegate
	// https://developer.apple.com/documentation/uikit/uidocumentpickerdelegate/2902364-documentpicker
	func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentAt url: URL) {
		guard let handler = documentPickerHandler else {
			logger?.debug("\(#function, privacy: .public) - documentPickerHandler not set")
			return
		}
		// call handler
		handler(url)
		// reset handler
		documentPickerHandler = nil
	}

	func changeSaveLocation() {
		logger?.info("\(#function, privacy: .public) - Userscripts iOS has requested to set the readLocation")
		// set handler
		documentPickerHandler = changeSaveLocationHandler
		let documentPicker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
		documentPicker.delegate = self
		documentPicker.directoryURL = getDocumentsDirectory()
		present(documentPicker, animated: true)
	}

	func changeSaveLocationHandler(_ url: URL) {
		Preferences.scriptsDirectoryUrl = url
		self.updateCurrentDirectory()
	}

	func exportLogFiles() {
		// set handler
		documentPickerHandler = exportLogFilesHandler
		let documentPicker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
		documentPicker.delegate = self
		present(documentPicker, animated: true)
	}

	func exportLogFilesHandler(_ url: URL) {
		guard url.startAccessingSecurityScopedResource() else {
			logger?.error("\(#function, privacy: .public) - failed access url: \(url, privacy: .public)")
			return
		}
		defer { url.stopAccessingSecurityScopedResource() }
		// export log files and open output directory
		do {
			let outURL = try USLogFilesExportTo(url)
			guard var components = URLComponents(url: outURL, resolvingAgainstBaseURL: true) else {
				logger?.error("\(#function, privacy: .public) - url malformed: \(url, privacy: .public)")
				return
			}
			components.scheme = "shareddocuments"
			if let url = components.url, UIApplication.shared.canOpenURL(url) {
				UIApplication.shared.open(url)
			}
		} catch {
			logger?.error("\(#function, privacy: .public) - Export failed: \(error)")
			let alert = UIAlertController(
				title: "Export failed",
				message: error.localizedDescription,
				preferredStyle: .alert
			)
			alert.addAction(UIAlertAction(title: "OK", style: .default))
			present(alert, animated: true)
		}
	}

}

#elseif os(macOS)
extension ViewController {

	// Only update the view when the window is visible
	@objc func handleOcclusionStateChange() {
		let occlusionState = NSApplication.shared.occlusionState
		if occlusionState.contains(.visible) {
			if timerExtensionStateCheck?.isValid != true {
				timerExtensionStateCheck = Timer.scheduledTimer(
					timeInterval: 0.2,
					target: self,
					selector: #selector(handleExtensionStateChange),
					userInfo: nil,
					repeats: true
				)
			}
		} else {
			timerExtensionStateCheck?.invalidate()
		}
	}

	// Update webview extension status display via timer
	@objc func handleExtensionStateChange() {
		SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extIdentifier) { (state, error) in
			var status: ExtensionState;
			if let state = state {
				status = state.isEnabled ? .on : .off
			} else {
				status = .error
				if let error = error {
					logger?.error("\(#function, privacy: .public) - \(error.localizedDescription, privacy: .public)")
				} else {
					logger?.error("\(#function, privacy: .public) - couldn't get safari extension state in containing app")
				}
			}
			if self.extensionState == status { return }
			self.extensionState = status
			DispatchQueue.main.async {
				self.webView.evaluateJavaScript("webapp.updateExtStatus('\(status.rawValue)')")
			}
		}
	}

	func changeSaveLocation() {
		guard let window = self.view.window else { return }
		let saveLocationURL = getSaveLocationURL()
		let panel = changeSaveLocationPanel(directoryURL: saveLocationURL)
		panel.beginSheetModal(for: window, completionHandler: { response in
			// check if clicked open button and there is a valid result
			guard response == .OK, let url: URL = panel.url else { return }
			// revoke implicitly starts security-scoped access
			defer { url.stopAccessingSecurityScopedResource() }
			// check if path has indeed changed
			if url.absoluteString == saveLocationURL.absoluteString { return }
			// try set new save location path to bookmark
			guard setSaveLocationURL(url: url) else { return }
			// update user interface text display
			self.updateCurrentDirectory()
			// notify browser extension of relevant updates
			sendExtensionMessage(
				name: "SAVE_LOCATION_CHANGED",
				userInfo: [
					"saveLocation": url.absoluteString.removingPercentEncoding ?? url.absoluteString,
					"returnApp": true
				]
			)
		})
	}

	func exportLogFiles() {
		guard let window = self.view.window else { return }
		let panel = NSOpenPanel()
		panel.allowsMultipleSelection = false
		panel.canChooseDirectories = true
		panel.canChooseFiles = false
		panel.title = "Export Log Files"
		panel.beginSheetModal(for: window, completionHandler: { response in
			panel.close()
			// check if clicked save button and there is a valid result
			guard response == .OK, let url: URL = panel.url else { return }
			// revoke implicitly starts security-scoped access
			defer { url.stopAccessingSecurityScopedResource() }
			// export log files and open output directory
			do {
				let outURL = try USLogFilesExportTo(url)
				NSWorkspace.shared.selectFile(outURL.path, inFileViewerRootedAtPath: url.path)
			} catch {
				logger?.error("\(#function, privacy: .public) - Export failed: \(error)")
				let alert = NSAlert()
				alert.messageText = "Export failed - \(error)"
				alert.runModal()
			}
		})
	}

}
#endif
