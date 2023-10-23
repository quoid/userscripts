import SwiftUI
import os.log

func USLogger(_ category: String) -> Logger? {
    let subsystem = Bundle.main.bundleIdentifier!
#if DEBUG // Always enable logger in DEBUG builds
    return Logger(subsystem: subsystem, category: category)
#else
    if Preferences.enableLogger {
        return Logger(subsystem: subsystem, category: category)
    }
    return nil
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
