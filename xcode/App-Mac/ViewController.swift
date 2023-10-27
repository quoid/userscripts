import SafariServices.SFSafariApplication

private let logger = USLogger(#fileID)

class ViewController: NSViewController {

    @IBOutlet var appName: NSTextField!
    @IBOutlet var saveLocation: NSTextField!
    @IBOutlet weak var enabledText: NSTextField!
    @IBOutlet weak var enabledIcon: NSView!
	@IBOutlet weak var openButton: NSButton!
	
    let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "??"
    let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "??"

    override func viewDidLoad() {
        super.viewDidLoad()
        self.appName.stringValue = "Userscripts Safari Version \(appVersion) (\(buildNumber))"
        setExtensionState()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(setExtensionState),
            name: NSApplication.didBecomeActiveNotification,
            object: nil
        )
        let url = getSaveLocationURL()
        self.saveLocation.stringValue = url.absoluteString
        self.saveLocation.toolTip = url.absoluteString
		if #available(macOS 13, *) {
			self.openButton.title = "Open Safari Settings"
		}
    }

    @objc func setExtensionState() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extIdentifier) { (state, error) in
            guard let state = state else {
                self.enabledText.stringValue = "Safari Extension State Unknown"
                if let error = error {
                    logger?.error("\(#function, privacy: .public) - \(error.localizedDescription, privacy: .public)")
                } else {
                    logger?.error("\(#function, privacy: .public) - couldn't get safari extension state in containing app")
                }
                return
            }
            DispatchQueue.main.async {
                self.enabledIcon.layer?.backgroundColor = state.isEnabled ? NSColor.green.cgColor : NSColor.red.cgColor
                self.enabledText.stringValue = state.isEnabled ? "Safari Extension Enabled" : "Safari Extension Disabled"
            }
        }
    }

    @IBAction func changeSaveLocation(_ sender: AnyObject?) {
        guard let window = self.view.window else { return }
        let saveLocationURL = getSaveLocationURL()
        let panel = changeSaveLocationPanel(directoryURL: saveLocationURL)
        panel.beginSheetModal(for: window, completionHandler: { response in
            // check if clicked open button and there is a valid result
            guard response == .OK, let url: URL = panel.urls.first else { return }
            // revoke implicitly starts security-scoped access
            defer { url.stopAccessingSecurityScopedResource() }
            // check if path has indeed changed
            if url.absoluteString == saveLocationURL.absoluteString { return }
            // try set new save location path to bookmark
            guard setSaveLocationURL(url: url) else { return }
            // update user interface text display
            self.saveLocation.stringValue = url.absoluteString
            self.saveLocation.toolTip = url.absoluteString
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

    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extIdentifier)
    }
}
