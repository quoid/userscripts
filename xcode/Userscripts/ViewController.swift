import Cocoa
import SafariServices.SFSafariApplication

class ViewController: NSViewController {

    @IBOutlet var appName: NSTextField!
    @IBOutlet var saveLocation: NSTextField!
    @IBOutlet weak var enabledText: NSTextField!
    @IBOutlet weak var enabledIcon: NSView!

    let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "??"
    let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "??"
    let hostID = Bundle.main.bundleIdentifier!
    let foo = Bundle.main.bundleIdentifier
    let extensionID = "com.userscripts.macos.Userscripts-Extension"
    let documentsDirectory = getDocumentsDirectory().appendingPathComponent("scripts").absoluteString

    override func viewDidLoad() {
        super.viewDidLoad()
        let location = documentsDirectory.replacingOccurrences(of: hostID, with: extensionID)
        self.appName.stringValue = "Userscripts Safari Version \(appVersion) (\(buildNumber))"
        setExtensionState()
        NotificationCenter.default.addObserver(
            self, selector: #selector(setExtensionState), name: NSApplication.didBecomeActiveNotification, object: nil
        )
        // set the save location url to default location
        self.saveLocation.stringValue = location
        self.saveLocation.toolTip = location
        // check if bookmark data exists
        guard
            let sharedBookmark = UserDefaults(suiteName: SharedDefaults.suiteName)?.data(forKey: SharedDefaults.keyName)
        else {
            // bookmark data doesn't exist, no need to update url
            return
        }
        // at this point it's known bookmark data does exist, try to read it
        guard let url = readBookmark(data: sharedBookmark, isSecure: false) else {
            // bookmark data does exist, but it can not be read, log an error
            err("shared bookmark data exists, but it can not be read")
            return
        }
        // shared bookmark data does exist and it can be read, check if the directory where it leads to exists
        guard directoryExists(path: url.path) else {
            // sharedBookmark removed, or in trash
            // renamed directories retain association
            // moved directories retain association
            UserDefaults(suiteName: SharedDefaults.suiteName)?.removeObject(forKey: SharedDefaults.keyName)
            NSLog("removed shared bookmark because it's directory is non-existent, permanently deleted or in trash")
            return
        }
        // shared bookmark can be read and directory exists, update url
        self.saveLocation.stringValue = url.absoluteString
        self.saveLocation.toolTip = url.absoluteString
    }

    @objc func setExtensionState() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionID) { (state, error) in
            guard let state = state, error == nil else {
                self.enabledText.stringValue = "Safari Extension State Unknown"
                err(error?.localizedDescription ?? "couldn't get safari extension state in containing app")
                return
            }
            DispatchQueue.main.async {
                self.enabledIcon.layer?.backgroundColor = state.isEnabled ? NSColor.green.cgColor : NSColor.red.cgColor
                self.enabledText.stringValue = state.isEnabled ? "Safari Extension Enabled" : "Safari Extension Disabled"
            }
        }
    }

    @IBAction func changeSaveLocation(_ sender: NSButton) {
        guard let window = self.view.window else { return }
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.canChooseFiles = false
        let saveLocationDecode = self.saveLocation.stringValue.removingPercentEncoding ?? "??"
        panel.directoryURL = URL(fileURLWithPath: saveLocationDecode, isDirectory: true)
        panel.beginSheetModal(for: window, completionHandler: { response in
            if response == .OK, let url: URL = panel.urls.first {
                // check if path has changed
                if url.absoluteString == self.saveLocation.stringValue { return }
                // check it is a writeable path
                let canWrite = FileManager.default.isWritableFile(atPath: url.path)
                if !canWrite {
                    // display error message
                    let alert = NSAlert()
                    alert.messageText = "Can not write to path. Choose a different path."
                    alert.runModal()
                } else {
                    if !saveBookmark(url: url, isShared: true, keyName: SharedDefaults.keyName, isSecure: false) {
                        err("couldn't save new location from host app")
                        return
                    }
                    self.saveLocation.stringValue = url.absoluteString
                    self.saveLocation.toolTip = url.absoluteString
                    SFSafariApplication.dispatchMessage(
                        withName: "SAVE_LOCATION_CHANGED",
                        toExtensionWithIdentifier: self.extensionID,
                        userInfo: ["saveLocation": url.absoluteString.removingPercentEncoding ?? "??"]
                    ) { error in // always be called
                        if error != nil {
                            debugPrint("Message attempted. Error info: \(String.init(describing: error))")
                        }
                    }
                }
            }
        })
    }

    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionID)
    }
}
