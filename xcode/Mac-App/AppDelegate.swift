import Cocoa

@NSApplicationMain
class AppDelegate: NSObject, NSApplicationDelegate {
    
    private var window: NSWindow!
    private var windowForego = false
    private var windowLoaded = false
    
    @IBOutlet weak var enbaleNativeLogger: NSMenuItem!
    
    func application(_ application: NSApplication, open urls: [URL]) {
        // if open panel is already open, stop processing the URL scheme
        if NSApplication.shared.keyWindow?.accessibilityIdentifier() == "open-panel" { return }
        for url in urls {
            if url.host == "changesavelocation" {
                // avoid opening the panel repeatedly and playing unnecessary warning sounds
                if NSApplication.shared.keyWindow?.identifier?.rawValue == "changeSaveLocation" { continue }
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
    
    func applicationDidFinishLaunching(_ aNotification: Notification) {
        // Initialize menu items
        enbaleNativeLogger.state = Preferences.enableLogger ? .on : .off
        if windowForego { return }
        let storyboard = NSStoryboard(name: "View", bundle: Bundle.main)
        let windowController = storyboard.instantiateInitialController() as! NSWindowController
//        let viewController = windowController.contentViewController as! ViewController
        window = windowController.window
        window.setIsVisible(true)
        windowLoaded = true
    }
    
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        return true
    }
    
    func applicationWillTerminate(_ aNotification: Notification) {
        // Insert code here to tear down your application
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
