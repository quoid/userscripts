import SwiftUI

let bundleIdentifier = Bundle.main.bundleIdentifier!
let groupIdentifier = Bundle.main.infoDictionary!["US_SHARED_GID"] as! String
let extIdentifier = Bundle.main.infoDictionary?["US_EXT_IDENTIFIER"] as! String
let projectName = "Userscripts"
//let projectName = Bundle.main.infoDictionary!["PROJECT_NAME"] as! String
private let logger = USLogger(#fileID)

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

func directoryExists(path: String) -> Bool {
	var isDirectory = ObjCBool(true)
	let exists = FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory)
	let inTrash = path.contains(".Trash") ? false : true
	return exists && inTrash && isDirectory.boolValue
}

func directoryEmpty(at url: URL) -> Bool? {
	// get a list of non-hidden files
	guard let contents = try? FileManager.default.contentsOfDirectory(
		at: url,
		includingPropertiesForKeys: [],
		options: .skipsHiddenFiles
	) else {
		logger?.error("\(#function, privacy: .public) - failed get contentsOfDirectory")
		return nil
	}
	return contents.isEmpty
}

func getDocumentsDirectory() -> URL {
	let fm = FileManager.default
	let paths = fm.urls(for: .documentDirectory, in: .userDomainMask)
	let documentsDirectory = paths[0]
	return documentsDirectory
}

func getProjectSharedDirectoryURL(path: String? = nil) -> URL? {
	// https://developer.apple.com/documentation/foundation/filemanager/1412643-containerurl/
	guard let sharedContainerURL = FileManager.default.containerURL(
		forSecurityApplicationGroupIdentifier: groupIdentifier
	) else {
		logger?.error("\(#function, privacy: .public) - Failed get sharedContainerURL")
		return nil
	}
	guard let path = path else {
		return sharedContainerURL
	}
	if #available(macOS 13.0, iOS 16.0, *) {
		return sharedContainerURL.appending(path: path, directoryHint: .isDirectory)
	} else {
		return sharedContainerURL.appendingPathComponent(path, isDirectory: true)
	}
}

func getDefaultScriptsDirectoryUrl() -> URL {
#if os(iOS)
	return URL(string: "default://uninitialized")!
#elseif os(macOS)
	var url: URL
	if #available(macOS 13.0, iOS 16.0, *) {
		url = getDocumentsDirectory().appending(path: "scripts")
	} else {
		url = getDocumentsDirectory().appendingPathComponent("scripts")
	}
	// if not in safari extension environment, replace with extension path
	if bundleIdentifier != extIdentifier {
		var path: String
		if #available(macOS 13.0, iOS 16.0, *) {
			path = url.path(percentEncoded: false)
		} else {
			path = url.path.removingPercentEncoding ?? url.path
		}
		let truePath = path.replacingOccurrences(of: bundleIdentifier, with: extIdentifier)
		url = URL(fileURLWithPath: truePath, isDirectory: true)
	}
	return url
#endif
}

#if os(iOS)
// Initialization directory is only required in iOS
func isCurrentDefaultScriptsDirectory() -> Bool {
	return Preferences.scriptsDirectoryUrl == getDefaultScriptsDirectoryUrl()
}
#endif

// For mac, the initial directory is Ext-Documents (default directory)
// For ios, the initial directory is App-Documents
// In ios only App-Documents can be displayed in Files App
func isCurrentInitialScriptsDirectory() -> Bool {
	let url = Preferences.scriptsDirectoryUrl.standardizedFileURL
#if os(iOS)
	return url == getDocumentsDirectory().standardizedFileURL
#elseif os(macOS)
	return url == getDefaultScriptsDirectoryUrl().standardizedFileURL
#endif
}

func getCurrentScriptsDirectoryString() -> String {
	if isCurrentInitialScriptsDirectory() {
		return "Userscripts App Documents"
	}
	let url = Preferences.scriptsDirectoryUrl.standardizedFileURL
	if #available(macOS 13.0, iOS 16.0, *) {
		return url.path(percentEncoded: false)
	} else {
		return url.path.removingPercentEncoding ?? url.path
	}
}

func getSaveLocation() -> URL? {
#if os(iOS)
	if isCurrentDefaultScriptsDirectory() {
		logger?.info("\(#function, privacy: .public) - Uninitialized save location")
		return nil
	}
#endif
	let url = Preferences.scriptsDirectoryUrl
	logger?.debug("\(#function, privacy: .public) - \(url, privacy: .public)")
	return url
}

func openSaveLocation() -> Bool {
#if os(macOS)
	guard let saveLocation = getSaveLocation() else {
		return false
	}
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: saveLocation.path)
#endif
	return true
}

func resetSaveLocation() {
	logger?.info("\(#function, privacy: .public) - Reset save location")
#if os(iOS)
	Preferences.scriptsDirectoryUrl = getDocumentsDirectory()
#elseif os(macOS)
#endif
}
