import Cocoa

@NSApplicationMain
class AppDelegate: NSObject, NSApplicationDelegate {
    
    private var window: NSWindow!
    private var windowForego = false
    private var windowLoaded = false
    
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
    
}
