import Foundation
import SafariServices
import os

fileprivate let logger = Logger(subsystem: Bundle.main.bundleIdentifier!, category: #fileID)

struct SharedDefaults {
    // https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups
    static let suiteName = Bundle.main.infoDictionary?["US_SHARED_GID"] as? String
    #if os(iOS)
        static let keyName = "iosReadLocation"
    #elseif os(macOS)
        static let keyName = "hostSelectedSaveLocation"
    #endif
}

func getDocumentsDirectory() -> URL {
    let fm = FileManager.default
    let paths = fm.urls(for: .documentDirectory, in: .userDomainMask)
    let documentsDirectory = paths[0]
    return documentsDirectory
}

func directoryExists(path: String) -> Bool {
    var isDirectory = ObjCBool(true)
    let exists = FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory)
    let inTrash = path.contains(".Trash") ? false : true
    return exists && inTrash && isDirectory.boolValue
}

func getPlatform() -> String {
    var platform:String
    #if os(iOS)
        if UIDevice.current.userInterfaceIdiom == .pad {
            platform = "ipados"
        }
        else {
            platform = "ios"
        }
    #elseif os(macOS)
        platform = "macos"
    #endif
    return platform
}

func saveBookmark(url: URL, isShared: Bool, keyName: String, isSecure: Bool) -> Bool {
    #if os(iOS)
        let options:URL.BookmarkCreationOptions = []
    #elseif os(macOS)
        let options:URL.BookmarkCreationOptions = isSecure ? [.withSecurityScope] : []
    #endif
    do {
        let bookmark = try url.bookmarkData(
            options: options,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        #if os(iOS)
            UserDefaults(suiteName: SharedDefaults.suiteName)?.set(bookmark, forKey: keyName)
        #elseif os(macOS)
            if isShared {
                UserDefaults(suiteName: SharedDefaults.suiteName)?.set(bookmark, forKey: keyName)
            } else {
                UserDefaults.standard.set(bookmark, forKey: keyName)
            }
        #endif
        return true
    } catch let error {
        logger.error("\(#function, privacy: .public) - \(error, privacy: .public)")
        return false
    }
}

func readBookmark(data: Data, isSecure: Bool) -> URL? {
    #if os(iOS)
        let options:URL.BookmarkResolutionOptions = []
    #elseif os(macOS)
        let options:URL.BookmarkResolutionOptions = isSecure ? [.withSecurityScope] : []
    #endif
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
        logger.error("\(#function, privacy: .public) - \(error, privacy: .public)")
        return nil
    }
}
