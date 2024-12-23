import SwiftUI

let bundleIdentifier = Bundle.main.bundleIdentifier!
let groupIdentifier = Bundle.main.infoDictionary!["US_SHARED_GID"] as! String
let extIdentifier = Bundle.main.infoDictionary?["US_EXT_IDENTIFIER"] as! String
let projectName = "Userscripts"
//let projectName = Bundle.main.infoDictionary!["PROJECT_NAME"] as! String
private let logger = USLogger(#fileID)

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
#if os(macOS)
	return "macos"
#elseif os(iOS)
	// https://developer.apple.com/documentation/uikit/uiuserinterfaceidiom
	// There is no reliable way to detect visionOS for now, will match `.phone` in Apple Vision (Designed for iPad) mode
	switch UIDevice.current.userInterfaceIdiom {
	case .phone:
		return "ios"
	case .pad, .mac:
		return "ipados"
	case .vision:
		return "visionos"
	case .tv:
		return "tvos"
	case .carPlay:
		return "carplay"
	case .unspecified:
		return "unspecified"
	@unknown default:
		return "unknown"
	}
#endif
}
