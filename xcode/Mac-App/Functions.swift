import AppKit
import SafariServices

let extensionIdentifier = Bundle.main.infoDictionary?["US_EXT_IDENTIFIER"] as! String

func getSaveLocationURL() -> URL {
    var url: URL
    // default url
    if #available(macOS 13.0, *) {
        url = getDocumentsDirectory().appending(path: "scripts")
    } else {
        url = getDocumentsDirectory().appendingPathComponent("scripts")
    }
    // if not in safari extension environment, replace with extension path
    if let bundleIdentifier = Bundle.main.bundleIdentifier, bundleIdentifier != extensionIdentifier {
        let s = url.absoluteString.replacingOccurrences(of: bundleIdentifier, with: extensionIdentifier)
        // avoid being encode again, decode first
        if let decodePath = s.removingPercentEncoding {
            url = URL(fileURLWithPath: decodePath, isDirectory: true)
        }
    }
    // bookmark url
    if let data = UserDefaults(suiteName: SharedDefaults.suiteName)?.data(forKey: SharedDefaults.keyName) {
        if let bookmarkURL = readBookmark(data: data, isSecure: false) {
            if directoryExists(path: bookmarkURL.path) {
                url = bookmarkURL
            } else {
                UserDefaults(suiteName: SharedDefaults.suiteName)?.removeObject(forKey: SharedDefaults.keyName)
                NSLog("removed shared bookmark because it's directory is non-existent, permanently deleted or in trash")
            }
        }
    }
    return url
}

func setSaveLocationURL(url: URL) -> Bool {
    guard FileManager.default.isWritableFile(atPath: url.path) else {
        let alert = NSAlert()
        alert.messageText = "Can not write to path. Choose a different path."
        alert.runModal()
        return false
    }
    guard saveBookmark(url: url, isShared: true, keyName: SharedDefaults.keyName, isSecure: false) else {
        err("couldn't save new location from host app")
        return false
    }
    return true
}

func sendExtensionMessage(name: String, userInfo: [String : Any]? = nil, completion: ((Error?) -> Void)? = nil) {
    SFSafariApplication.dispatchMessage(
        withName: name,
        toExtensionWithIdentifier: extensionIdentifier,
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
