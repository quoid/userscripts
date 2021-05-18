import Cocoa
import SafariServices.SFSafariApplication

class ViewController: NSViewController {

    @IBOutlet var appName: NSTextField!
    @IBOutlet var saveLocation: NSTextField!
    @IBOutlet weak var enabledText: NSTextField!
    @IBOutlet weak var enabledIcon: NSView!

    let appVersion = Bundle.main.infoDictionary!["CFBundleShortVersionString"] as! String
    let hostID = Bundle.main.bundleIdentifier!
    let extensionID = "com.userscripts.macos.Userscripts-Extension"
    let documentsDirectory = getDocumentsDirectory().appendingPathComponent("scripts").absoluteString

    override func viewDidLoad() {
        super.viewDidLoad()
        let location = documentsDirectory.replacingOccurrences(of: hostID, with: extensionID)
        self.appName.stringValue = "Userscripts Safari Version \(appVersion)"
        setExtensionState()
        // check if bookmark data exists
        guard
            let sharedBookmark = UserDefaults(suiteName: SharedDefaults.suiteName)?.data(forKey: SharedDefaults.keyName),
            let url = readBookmark(data: sharedBookmark, isSecure: false),
            directoryExists(path: url.path)
        else {
            // sharedBookmark removed, or in trash
            // renamed directories retain association
            // moved directories retain association
            UserDefaults(suiteName: SharedDefaults.suiteName)?.removeObject(forKey: SharedDefaults.keyName)
            NSLog("removed sharedbookmark because it is non-existent, permanently deleted or exists in trash")
            self.saveLocation.stringValue = location
            return
        }
        self.saveLocation.stringValue = url.absoluteString
        NotificationCenter.default.addObserver(self, selector: #selector(setExtensionState), name: NSApplication.didBecomeActiveNotification, object: nil)
    }

    @objc func setExtensionState() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionID) { (state, error) in
            guard let state = state, error == nil else {
                self.enabledText.stringValue = "Safari Extension State Unknown"
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
        panel.beginSheetModal(for: window, completionHandler: { response in
            if let url: URL = panel.urls.first {
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
                }
            }
        })
    }

    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionID)
    }
}
