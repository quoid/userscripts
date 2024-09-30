import AppKit
import SafariServices

private let logger = USLogger(#fileID)

func getSaveLocationURL() -> URL {
	return Preferences.scriptsDirectoryUrl
}

func setSaveLocationURL(url: URL) -> Bool {
	guard FileManager.default.isReadableFile(atPath: url.path) else {
		let alert = NSAlert()
		alert.messageText = "Cannot read the specified path; please choose a different one."
		alert.runModal()
		return false
	}
	guard FileManager.default.isWritableFile(atPath: url.path) else {
		let alert = NSAlert()
		alert.messageText = "Cannot write to the specified path; please choose a different one."
		alert.runModal()
		return false
	}
	Preferences.scriptsDirectoryUrl = url
	return Preferences.scriptsDirectoryUrl == url
}

func sendExtensionMessage(name: String, userInfo: [String : Any]? = nil, completion: ((Error?) -> Void)? = nil) {
	SFSafariApplication.dispatchMessage(
		withName: name,
		toExtensionWithIdentifier: extIdentifier,
		userInfo: userInfo
	) { error in // always be called
		if error != nil {
			debugPrint("Message attempted. Error info: \(String.init(describing: error))")
		}
		if let userHandle = completion { userHandle(error) }
	}
}

func changeSaveLocationPanel(directoryURL: URL? = nil) -> NSOpenPanel {
	let panel = NSOpenPanel()
	panel.allowsMultipleSelection = false
	panel.canChooseDirectories = true
	panel.canCreateDirectories = true
	panel.canChooseFiles = false
	if directoryURL != nil {
		panel.directoryURL = directoryURL
	}
	panel.title = "Change Save Location - Userscripts"
	panel.identifier = NSUserInterfaceItemIdentifier("changeSaveLocation")
	return panel
}

func schemeChangeSaveLocation() {
	let saveLocationURL = getSaveLocationURL()
	let panel = changeSaveLocationPanel(directoryURL: saveLocationURL)
	// shows the path selection panel
	let response = panel.runModal()
	// check if clicked open button and there is a valid result
	guard response == .OK, let url: URL = panel.urls.first else { return }
	// revoke implicitly starts security-scoped access
	defer { url.stopAccessingSecurityScopedResource() }
	// check if path has indeed changed
	if url.absoluteString == saveLocationURL.absoluteString { return }
	// try set new save location path to bookmark
	guard setSaveLocationURL(url: url) else { return }
	// use semaphore to ensure the async func executed before app exits
	let semaphore = DispatchSemaphore(value: 0)
	// notify browser extension of relevant updates
	sendExtensionMessage(
		name: "SAVE_LOCATION_CHANGED",
		userInfo: ["saveLocation": url.absoluteString.removingPercentEncoding ?? url.absoluteString],
		completion: { _ in semaphore.signal() }
	)
	semaphore.wait()
}
