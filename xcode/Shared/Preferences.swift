import Foundation

private let logger = USLogger(#fileID)
private let SDefaults = UserDefaults(suiteName: groupIdentifier) // Shared UserDefaults

// https://docs.swift.org/swift-book/documentation/the-swift-programming-language/properties#Property-Wrappers
// https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/
@propertyWrapper
private struct SharedUserDefaults<T> {
	private let key: String
	private let defaultValue: T

	init(wrappedValue: T, _ key: String) {
		self.key = key
		self.defaultValue = wrappedValue
		SDefaults?.register(defaults: [key: wrappedValue])
	}

	var wrappedValue: T {
		get { SDefaults?.object(forKey: key) as? T ?? defaultValue }
		set { SDefaults?.set(newValue, forKey: key) }
	}
}

#if os(macOS)
/* https://developer.apple.com/documentation/security/app_sandbox/accessing_files_from_the_macos_app_sandbox
 # Design ideas and processes
 Since the security-scoped URL bookmark is only available in the current app,
 pass to extensions can only use URL bookmark with an implicit security scope.
 app set URL write to:
 - `<key>_SetterId` (setter app bundleIdentifier)
 - `<key>_Transfer` (with an implicit security scope)
 - `<key>_SecurityScoped_<bundleIdentifier>` (with an explicit security scope)
 app get URL read from: `<key>_SecurityScoped_<bundleIdentifier>`
 ext get URL read flow:
 - if `<key>_Transfer` exist, remove to `<key>_SecurityScoped_<bundleIdentifier>`
 - if `<key>_Transfer` empty, read from `<key>_SecurityScoped_<bundleIdentifier>`
 */
@propertyWrapper
private struct SecurityScopedBookmark {
	private let key: String
	private let keySetter: String
	private let keyTransfer: String
	private let keySecurityScoped: String
	private let defaultValue: URL

	init(wrappedValue: URL, _ key: String) {
		self.key = key
		self.keySetter = key + "/SetterId"
		self.keyTransfer = key + "/Transfer"
		self.keySecurityScoped = key + "/SecurityScoped/" + bundleIdentifier
		self.defaultValue = wrappedValue
	}

	private func createBookmark(_ url: URL, _ withSecurityScope: Bool) -> Data? {
		do {
			return try url.bookmarkData(
				options: withSecurityScope ? .withSecurityScope : [],
				includingResourceValuesForKeys: nil,
				relativeTo: nil
			)
		} catch {
			logger?.error("\(#function, privacy: .public) - \(error, privacy: .public)")
		}
		return nil
	}

	private func resolvBookmark(_ data: Data, _ withSecurityScope: Bool, _ isStale: inout Bool) -> URL? {
		do {
			return try URL(
				resolvingBookmarkData: data,
				options: withSecurityScope ? .withSecurityScope : [],
				relativeTo: nil,
				bookmarkDataIsStale: &isStale
			)
		} catch {
			logger?.error("\(#function, privacy: .public) - \(error, privacy: .public)")
		}
		return nil
	}

	private func updateBookmark() {
		guard let setterIdentifier = SDefaults?.string(forKey: keySetter) else {
			logger?.debug("\(#function, privacy: .public) - setterId not exist: \(key, privacy: .public)")
			return
		}
		guard bundleIdentifier != setterIdentifier else { return } // update only in non-setter environment
		guard let data = SDefaults?.data(forKey: keyTransfer) else { // no need to update due empty data
			logger?.debug("\(#function, privacy: .public) - no update: \(key, privacy: .public)")
			return
		}
		var isStale = false // no need to renew since will remove anyway
		guard let url = resolvBookmark(data, false, &isStale) else { // get URL bookmark with an implicit security scope
			removeBookmark()
			return
		}
		defer { url.stopAccessingSecurityScopedResource() } // revoke implicitly starts security-scoped access
		if let data = createBookmark(url, true) { // set URL bookmark with an explicit security scope
			logger?.info("\(#function, privacy: .public) - update bookmark: \(key, privacy: .public) \(url, privacy: .public)")
			SDefaults?.removeObject(forKey: keyTransfer)
			SDefaults?.set(data, forKey: keySecurityScoped)
		}
	}

	private func removeBookmark() {
		logger?.info("\(#function, privacy: .public) - remove invalid bookmark: \(key, privacy: .public)")
		SDefaults?.removeObject(forKey: keyTransfer)
		SDefaults?.removeObject(forKey: keySecurityScoped)
		if let setterIdentifier = SDefaults?.string(forKey: keySetter) {
			SDefaults?.removeObject(forKey: key + "/SecurityScoped/" + setterIdentifier)
		}
	}

	// NOTE: This function will be deleted after several public versions of v4.5.0
	private func legacyBookmarkImporter() {
		guard key == "ScriptsDirectoryUrlBookmarkData" else { return }
		guard bundleIdentifier == extIdentifier else { return }
		func legacyCleanup() {
			logger?.debug("\(#function, privacy: .public) - cleanup legacy bookmark data")
			SDefaults?.removeObject(forKey: "hostSelectedSaveLocation") // shared
			UserDefaults.standard.removeObject(forKey: "saveLocation") // ext
			UserDefaults.standard.removeObject(forKey: "userSaveLocation") // ext
		}
		guard let data = UserDefaults.standard.data(forKey: "userSaveLocation") else { // get from old key
			logger?.debug("\(#function, privacy: .public) - legacy bookmark not exist")
			return
		}
		guard SDefaults?.string(forKey: keySetter) == nil else { // already a new key
			return legacyCleanup()
		}
		logger?.debug("\(#function, privacy: .public) - Import legacy bookmark data")
		var isStale = false // no need to renew since will remove anyway
		guard let url = resolvBookmark(data, true, &isStale) else { // get URL bookmark with an explicit security scope
			return legacyCleanup()
		}
		guard url.startAccessingSecurityScopedResource() else {
			return legacyCleanup()
		}
		defer { url.stopAccessingSecurityScopedResource() }
		guard let transferData = createBookmark(url, false) else {
			return legacyCleanup()
		}
		SDefaults?.set(bundleIdentifier, forKey: keySetter)
		SDefaults?.set(transferData, forKey: keyTransfer) // set URL bookmark with an implicit security scope
		SDefaults?.set(data, forKey: keySecurityScoped) // set URL bookmark with an explicit security scope
		legacyCleanup()
	}

	var wrappedValue: URL {
		get {
			legacyBookmarkImporter()
			updateBookmark()
			logger?.info("\(#function, privacy: .public) - try get bookmark: \(key, privacy: .public)")
			guard let data = SDefaults?.data(forKey: keySecurityScoped) else {
				logger?.debug("\(#function, privacy: .public) - bookmark not exist: \(key, privacy: .public)")
				return defaultValue
			}
			var isStale = false
			guard let url = resolvBookmark(data, true, &isStale) else { // get URL bookmark with an explicit security scope
				removeBookmark() // remove data that cannot be resolved
				return defaultValue
			}
			if isStale, url.startAccessingSecurityScopedResource() { // renew URL bookmark
				defer { url.stopAccessingSecurityScopedResource() }
				if let data = createBookmark(url, true) { // set URL bookmark with an explicit security scope
					logger?.info("\(#function, privacy: .public) - renew bookmark: \(key, privacy: .public) \(url, privacy: .public)")
					SDefaults?.set(data, forKey: keySecurityScoped)
				}
			}
			return url
		}
		set(url) {
			let k = key // key cannot be log directly with error: Escaping autoclosure captures mutating 'self' parameter
			logger?.info("\(#function, privacy: .public) - try set bookmark: \(k, privacy: .public) \(url, privacy: .public)")
			guard let tdata = createBookmark(url, false), let sdata = createBookmark(url, true) else {
				logger?.info("\(#function, privacy: .public) - failed create bookmark: \(k, privacy: .public) \(url, privacy: .public)")
				return
			}
			SDefaults?.set(bundleIdentifier, forKey: keySetter)
			SDefaults?.set(tdata, forKey: keyTransfer) // set URL bookmark with an implicit security scope
			SDefaults?.set(sdata, forKey: keySecurityScoped) // set URL bookmark with an explicit security scope
		}
	}
}
#elseif os(iOS)
/* https://developer.apple.com/documentation/uikit/view_controllers/providing_access_to_directories#3331285
 iOS and macOS have completely different processes, iOS has no implicit security scope
 The security-scoped URL is not bind to the app and can be shared directly between the app and ext
 Separating the wrappers for the two platforms is intentional for ease of viewing code logic
 */
@propertyWrapper
private struct SecurityScopedBookmark {
	private let key: String
	private let defaultValue: URL

	init(wrappedValue: URL, _ key: String) {
		self.key = key
		self.defaultValue = wrappedValue
	}

	private func createBookmark(_ url: URL) -> Data? {
		do {
			return try url.bookmarkData(options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil)
		} catch {
			logger?.error("\(#function, privacy: .public) - \(error, privacy: .public)")
		}
		return nil
	}

	private func resolvBookmark(_ data: Data, _ isStale: inout Bool) -> URL? {
		do {
			return try URL(resolvingBookmarkData: data, bookmarkDataIsStale: &isStale)
		} catch {
			logger?.error("\(#function, privacy: .public) - \(error, privacy: .public)")
		}
		return nil
	}

	// NOTE: This function will be deleted after several public versions of v4.5.0
	private func legacyBookmarkImporter() {
		guard let data = SDefaults?.data(forKey: "iosReadLocation") else { // get from old key
			logger?.debug("\(#function, privacy: .public) - legacy bookmark not exist")
			return
		}
		logger?.debug("\(#function, privacy: .public) - Import legacy bookmark data")
		SDefaults?.set(data, forKey: key)
		SDefaults?.removeObject(forKey: "iosReadLocation")
	}

	var wrappedValue: URL {
		get {
			legacyBookmarkImporter()
			logger?.info("\(#function, privacy: .public) - try get bookmark: \(key, privacy: .public)")
			guard let data = SDefaults?.data(forKey: key) else {
				logger?.debug("\(#function, privacy: .public) - bookmark not exist: \(key, privacy: .public)")
				return defaultValue
			}
			var isStale = false
			guard let url = resolvBookmark(data, &isStale) else { // get security-scoped URL
				SDefaults?.removeObject(forKey: key) // remove data that cannot be resolved
				return defaultValue
			}
			if isStale, url.startAccessingSecurityScopedResource() { // renew URL bookmark
				defer { url.stopAccessingSecurityScopedResource() }
				if let data = createBookmark(url) { // set security-scoped URL
					logger?.info("\(#function, privacy: .public) - renew bookmark: \(key, privacy: .public) \(url, privacy: .public)")
					SDefaults?.set(data, forKey: key)
				}
			}
			return url
		}
		set(url) {
			let k = key // key cannot be log directly with error: Escaping autoclosure captures mutating 'self' parameter
			logger?.info("\(#function, privacy: .public) - try set bookmark: \(k, privacy: .public) \(url, privacy: .public)")
			// true - when url from UIDocumentPicker
			// false - when set default app document
			let didStartAccessing = url.startAccessingSecurityScopedResource()
			defer {
				if didStartAccessing { url.stopAccessingSecurityScopedResource() }
			}
			guard let data = createBookmark(url) else {
				logger?.info("\(#function, privacy: .public) - failed create bookmark: \(k, privacy: .public) \(url, privacy: .public)")
				return
			}
			SDefaults?.set(data, forKey: key) // set security-scoped URL
		}
	}
}
#endif

// Define shared preferences, default values determine data type
struct Preferences {
	// Example preference, can be get or set with: Preferences.propertyName
	// @SharedUserDefaults("SharedUserDefaultsKeyName")
	// static var propertyName = "DefaultValue" // Type -> String
	
	// This is a separate wrapper, type is URL
	@SecurityScopedBookmark("ScriptsDirectoryUrlBookmarkData")
	static var scriptsDirectoryUrl = getDefaultScriptsDirectoryUrl()

	@SharedUserDefaults("EnableLogger")
	static var enableLogger = false

	@SharedUserDefaults("PromptLogger")
	static var promptLogger = true
	
	@SharedUserDefaults("MaxLogFileSize")
	static var maxLogFileSize = 500_000_000 // 500MB

	@SharedUserDefaults("FirstRunTime")
	static var firstRunTime = 0 {
		willSet {
			print("willSet \(newValue)")
		}
		didSet {
			print("didSet \(oldValue)")
		}
	}
}
