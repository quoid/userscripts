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

    override func viewDidLoad() {
        super.viewDidLoad()
        self.appName.stringValue = "Userscripts Safari Version \(appVersion)"
        setExtensionState()
        
        self.saveLocation.stringValue = "Not set up"
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


    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionID)
    }
}
