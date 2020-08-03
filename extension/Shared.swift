import Foundation
import os

struct SharedDefaults {
    static let suiteName = "group.com.userscripts.macos"
    static let keyName = "hostSelectedSaveLocation"
}

func err(_ message: String) {
    let log = OSLog(subsystem: Bundle.main.bundleIdentifier!, category: "general")
    print("Error: \(message)")
    os_log("%{public}@", log: log, type: .error, "Error: \(message)")
}

func getDocumentsDirectory() -> URL {
    let fm = FileManager.default
    let paths = fm.urls(for: .documentDirectory, in: .userDomainMask)
    let documentsDirectory = paths[0]
    return documentsDirectory
}

func saveBookmark(url: URL, isShared: Bool, keyName: String, isSecure: Bool) -> Bool {
    let options:URL.BookmarkCreationOptions = isSecure ? [.withSecurityScope] : []
    do {
        let bookmark = try url.bookmarkData(
            options: options,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        if isShared {
            UserDefaults(suiteName: SharedDefaults.suiteName)?.set(bookmark, forKey: keyName)
        } else {
            UserDefaults.standard.set(bookmark, forKey: keyName)
        }
        return true
    } catch let error {
        err("Error: \(error)")
        return false
    }
}

func readBookmark(data: Data, isSecure: Bool) -> URL? {
    let options:URL.BookmarkResolutionOptions = isSecure ? [.withSecurityScope] : []
    do {
        var bookmarkIsStale = false
        let url = try URL(
            resolvingBookmarkData: data,
            options: options,
            relativeTo: nil,
            bookmarkDataIsStale: &bookmarkIsStale
        )
        if bookmarkIsStale {
            NSLog("Stale bookmark, renewing it \(url)")
            if saveBookmark(url: url, isShared: true, keyName: SharedDefaults.keyName, isSecure: false) {
                NSLog("Successfully renewed stale bookmark - \(url)")
            } else {
                NSLog("Could not renew stale bookmark - \(url)")
            }
        }
        return url
    } catch let error {
        err("Error: \(error)")
        return nil
    }
}
