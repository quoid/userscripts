import SafariServices

private let logger = USLogger(#fileID)

// helpers
func getRequireLocation() -> URL {
	// simple helper in case required code save directory needs to change
	return getDocumentsDirectory().appendingPathComponent("require")
}

func dateToMilliseconds(_ date: Date) -> Int {
	let since1970 = date.timeIntervalSince1970
	return Int(since1970 * 1000)
}

func sanitize(_ str: String) -> String {
	// removes invalid filename characters from strings
	var sanitized = str
	if sanitized.first == "." {
		sanitized = "%2" + str.dropFirst()
	}
	sanitized = sanitized.replacingOccurrences(of: "/", with: "%2F")
	sanitized = sanitized.replacingOccurrences(of: ":", with: "%3A")
	sanitized = sanitized.replacingOccurrences(of: "\\", with: "%5C")
	return sanitized
}

func unsanitize(_ str: String) -> String {
	var s = str
	if s.hasPrefix("%2") && !s.hasPrefix("%2F") {
		s = "." + s.dropFirst(2)
	}
	if s.removingPercentEncoding != s {
		s = s.removingPercentEncoding ?? s
	}
	return s
}

func normalizeWeight(_ weight: String) -> String {
	if let w = Int(weight) {
		if w > 999 {
			return "999"
		} else if w < 1 {
			return "1"
		} else {
			return weight
		}
	} else {
		return "1"
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

func validateUrl(_ urlString: String) -> Bool {
	guard
		let parts = jsLikeURL(urlString),
		let ptcl = parts["protocol"],
		let path = parts["pathname"]
	else {
		logger?.error("\(#function, privacy: .public) - Invalid URL: \(urlString, privacy: .public)")
		return false
	}
	if
		(ptcl != "https:" && ptcl != "http:")
		|| (!path.hasSuffix(".css") && !path.hasSuffix(".js"))
	{
		return false
	}
	return true
}

func isVersionNewer(_ oldVersion: String, _ newVersion: String) -> Bool {
	let oldVersions = oldVersion.components(separatedBy: ".")
	let newVersions = newVersion.components(separatedBy: ".")
	for (index, version) in newVersions.enumerated() {
		let a = Int(version) ?? 0
		let oldVersionValue  = oldVersions.indices.contains(index) ? oldVersions[index] : "0"
		let b = Int(oldVersionValue) ?? 0
		if a > b {
			return true
		}
		if a < b {
			return false
		}
	}
	return false
}

func isEncoded(_ str: String) -> Bool {
	if let decoded = str.removingPercentEncoding {
		return decoded != str
	}
	return false
}

// parser
func parse(_ content: String) -> [String: Any]? {
	// returns structured data from content of file
	// will fail to parse if metablock or required @name key missing
	let pattern = #"(?:(\/\/ ==UserScript==[ \t]*?\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)|(\/\* ==UserStyle==[ \t]*?\r?\n([\S\s]*?)\r?\n==\/UserStyle== \*\/)([\S\s]*))"#
	// force try b/c pattern is known to be valid regex
	let regex = try! NSRegularExpression(pattern: pattern, options: [])
	let range = NSRange(location: 0, length: content.utf16.count)
	// return nil/fail if metablock missing
	guard let match = regex.firstMatch(in: content, options: [], range: range) else {
		logger?.debug("\(#function, privacy: .public) - Non matched content: \(content, privacy: .public)")
		return nil
	}

	// at this point the text content has passed initial validation, it contains valid metadata
	// the metadata can be in userscript or userstyle format, need to check for this and adjust group numbers
	// rather than being too strict, text content can precede the opening userscript tag, however it will be ignored
	// adjust start index of file content while assigning group numbers to account for any text content preceding opening tag
	let contentStartIndex = content.index(content.startIndex, offsetBy: match.range.lowerBound)
	let contentEndIndex = content.index(contentStartIndex, offsetBy: 15)
	let metaHeadContent = content[contentStartIndex..<contentEndIndex]
	var g1, g2, g3: Int
	if (metaHeadContent.starts(with: "//")) {
		g1 = 1; g2 = 2; g3 = 3
	} else {
		g1 = 4; g2 = 5; g3 = 6
	}

	// unlikely to happen but did see some crashes, add checking and logging
	guard let metablockRange = Range(match.range(at: g1), in: content) else {
		logger?.error("\(#function, privacy: .public) - Nil range (\(g1, privacy: .public)): \(metaHeadContent, privacy: .public)")
		logger?.debug("\(#function, privacy: .public) - Nil range content: \(content, privacy: .public)")
		return nil
	}
	// can force unwrap metablock since nil check was done above
	let metablock = content[metablockRange]
	// create var to store separated metadata keys/values
	var metadata = [:] as [String: [String]]
	// iterate through the possible metadata keys in file
	if let metas = Range(match.range(at: g2), in: content) {
		// split metadatas by new line
		let metaArray = content[metas].split(whereSeparator: \.isNewline)
		// loop through metadata lines and populate metadata dictionary
		for meta in metaArray {
			let p = #"^(?:[ \t]*(?:\/\/)?[ \t]*@)([\w-]+)[ \t]+([^\s]+[^\r\n\t\v\f]*)"#
			// this pattern checks for specific keys that won't have values
			let p2 = #"^(?:[ \t]*(?:\/\/)?[ \t]*@)(noframes)[ \t]*$"#
			// the individual meta string, ie. // @name File Name
			let metaString = String(meta).trimmingCharacters(in: .whitespaces)
			// force try b/c pattern is known to be valid regex
			let re = try! NSRegularExpression(pattern: p, options: [])
			let re2 = try! NSRegularExpression(pattern: p2, options: [])
			let range = NSRange(location: 0, length: metaString.utf16.count)
			// key lines not properly prefixed & without values will be skipped
			if let m = re.firstMatch(in: metaString, options: [], range: range) {
				// force unwrap key & value since matches regex above
				let key = metaString[Range(m.range(at: 1), in: metaString)!]
				let value = metaString[Range(m.range(at: 2), in: metaString)!]
				if metadata[String(key)] == nil {
					// if key does not exist in metadata dict, add it
					metadata[String(key)] = []
				}
				metadata[String(key)]?.append(String(value))
			} else if let m2 = re2.firstMatch(in: metaString, options: [], range: range) {
				// force unwrap key since matches regex above
				let key = metaString[Range(m2.range(at: 1), in: metaString)!]
				metadata[String(key)] = []
			}
		}
	}
	// return nil/fail if @name key is missing or @name has no value
	if metadata["name"] == nil {
		return nil
	}
	// get the code
	let code = content[Range(match.range(at: g3), in: content)!]
	let trimmedCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
	return [
		"code": trimmedCode,
		"content": content,
		"metablock": String(metablock),
		"metadata": metadata
	]
}

// manifest
struct Manifest: Codable {
	var blacklist:[String]
	var declarativeNetRequest: [String]
	var disabled:[String]
	var exclude: [String: [String]]
	var excludeMatch: [String: [String]]
	var include: [String: [String]]
	var match: [String: [String]]
	var require: [String: [String]]
	var settings: [String: String]
	private enum CodingKeys : String, CodingKey {
		case blacklist, declarativeNetRequest, disabled, exclude, excludeMatch = "exclude-match", include, match, require, settings
	}
}

let defaultSettings = [
	"active": "true",
	"autoCloseBrackets": "true",
	"autoHint": "true",
	"descriptions": "true",
	"languageCode": Locale.current.languageCode ?? "en",
	"lint": "false",
	"log": "false",
	"sortOrder": "lastModifiedDesc",
	"showCount": "true",
	"showInvisibles": "true",
	"tabSize": "4"
]

func updateManifest(with data: Manifest) -> Bool {
	let content = data
	let url = getDocumentsDirectory().appendingPathComponent("manifest.json")
	do {
		let encoder = JSONEncoder()
		encoder.outputFormatting = .prettyPrinted
		let encoded = try encoder.encode(content)
		let fileContent = String(decoding: encoded, as: UTF8.self)
		try fileContent.write(to: url, atomically: false, encoding: .utf8)
		return true
	} catch {
		logger?.error("\(#function, privacy: .public) - failed to update manifest: \(error.localizedDescription, privacy: .public)")
		return false
	}
}

func getManifest() -> Manifest {
	let url = getDocumentsDirectory().appendingPathComponent("manifest.json")
	if
		let content = try? String(contentsOf: url, encoding: .utf8),
		let data = content.data(using: .utf8),
		let decoded = try? JSONDecoder().decode(Manifest.self, from: Data(data))
	{
		return decoded
	} else {
		// manifest missing, improperly formatted or missing key
		// create new manifest with default key/vals
		let manifest = Manifest(
			blacklist: [],
			declarativeNetRequest: [],
			disabled: [],
			exclude: [:],
			excludeMatch: [:],
			include: [:],
			match: [:],
			require: [:],
			settings: defaultSettings
		)
		_ = updateManifest(with: manifest)
		return manifest
	}
}

func updateManifestMatches(_ optionalFilesArray: [[String: Any]] = []) -> Bool {
	logger?.info("\(#function, privacy: .public) - started")
	// only get all files if files were not provided
	var files = [[String: Any]]()
	if optionalFilesArray.isEmpty {
		guard let getFiles = getAllFiles() else {return false}
		files = getFiles
	} else {
		files = optionalFilesArray
	}
	var manifest = getManifest()
	for file in files {
		// can be force unwrapped because getAllFiles didn't return nil
		let metadata = file["metadata"] as! [String: [String]]
		let filename = file["filename"] as! String
		// skip request type userscripts
		let runAt = metadata["run-at"]?[0] ?? "document-end"
		if runAt == "request" {
			continue
		}
		// populate excludes & matches
		var excludeMatched = [String]()
		var matched = [String]()
		var excluded = [String]()
		var included = [String]()
		if metadata["exclude-match"] != nil {
			excludeMatched.append(contentsOf: metadata["exclude-match"]!)
		}
		if metadata["match"] != nil {
			matched.append(contentsOf: metadata["match"]!)
		}
		if metadata["include"] != nil {
			included.append(contentsOf: metadata["include"]!)
		}
		if metadata["exclude"] != nil {
			excluded.append(contentsOf: metadata["exclude"]!)
		}
		// if in declarativeNetRequest array, remove it
		if manifest.declarativeNetRequest.contains(filename) {
			if let index = manifest.declarativeNetRequest.firstIndex(of: filename) {
				manifest.declarativeNetRequest.remove(at: index)
			} else {
				logger?.error("\(#function, privacy: .public) - failed to remove \(filename, privacy: .public) from dNR array")
			}
		}

		// update manifest values
		manifest.excludeMatch = updatePatternDict(filename, excludeMatched, manifest.excludeMatch)
		manifest.match = updatePatternDict(filename, matched, manifest.match)
		manifest.exclude = updatePatternDict(filename, excluded, manifest.exclude)
		manifest.include = updatePatternDict(filename, included, manifest.include)

		if !updateManifest(with: manifest) {
			logger?.error("\(#function, privacy: .public) - failed to update manifest matches")
			return false
		}
	}
	logger?.info("\(#function, privacy: .public) - completed")
	return true
}

func updatePatternDict(_ filename: String, _ filePatterns: [String], _ manifestKeys: [String: [String]]) -> [String: [String]] {
	// will hold the exclude/match patterns in manifest that have file name as value
	var patternsInManifestForFile = [String]()
	// new var from func argument, so it can be manipulated
	var returnDictionary = manifestKeys
	// patterns from manifest
	let keys = returnDictionary.keys
	// determine what patterns already have this filename as a value
	for key in keys {
		// key is an array of filenames
		guard let filenames = returnDictionary[key] else {
			logger?.error("\(#function, privacy: .public) - failed to get values for manifest key, \(key, privacy: .public)")
			continue
		}
		for name in filenames {
			// name is a single filename
			// if name is same as filename, file already added for this pattern
			// add it to patternsInManifestForFile for later comparison
			if name == filename {
				patternsInManifestForFile.append(key)
			}
		}
	}
	// patterns in file metadata and patterns in manifest that have filename as a value
	// filename already present in manifest for these patterns, do nothing with these
	// let common = filePatterns.filter{patternsInManifestForFile.contains($0)}
	// patterns in file metadata, but don't have the filename as a value within the manifest
	// these are the manifest patterns that the filename needs to be added to
	let addFilenameTo = filePatterns.filter{!patternsInManifestForFile.contains($0)}

	// the patterns that have the filename as a value, but not present in file metadata
	// ie. these are the manifest patterns we need to remove the filename from
	let removeFilenameFrom = patternsInManifestForFile.filter{!filePatterns.contains($0)}

	// check if filename needs to be added or new key/val needs to be created
	for pattern in addFilenameTo {
		if returnDictionary[pattern] != nil {
			returnDictionary[pattern]?.append(filename)
		} else {
			returnDictionary[pattern] = [filename]
		}
	}

	for pattern in removeFilenameFrom {
		// get the index of the filename within the array
		let ind = returnDictionary[pattern]?.firstIndex(of: filename)
		// remove filename from array by index
		returnDictionary[pattern]?.remove(at: ind!)
		// if filename was the last item in array, remove the url pattern from dictionary
		if returnDictionary[pattern]!.isEmpty {
			returnDictionary.removeValue(forKey: pattern)
		}
	}

	return returnDictionary
}

func updateManifestRequired(_ optionalFilesArray: [[String: Any]] = []) -> Bool {
	logger?.info("\(#function, privacy: .public) - started")
	// only get all files if files were not provided
	var files = [[String: Any]]()
	if optionalFilesArray.isEmpty {
		guard let getFiles = getAllFiles() else {
			logger?.info("\(#function, privacy: .public) - count not get files")
			return false
		}
		files = getFiles
	} else {
		files = optionalFilesArray
	}
	logger?.info("\(#function, privacy: .public) - will loop through \(files.count, privacy: .public)")
	var manifest = getManifest()
	for file in files {
		// can be force unwrapped because getAllFiles didn't return nil
		let filename = file["filename"] as! String
		let metadata = file["metadata"] as! [String: [String]]
		let type = file["type"] as! String
		let required = metadata["require"] ?? []
		logger?.info("\(#function, privacy: .public) - begin \(filename, privacy: .public)")
		// get required resources for file, if fail, skip updating manifest
		if !getRequiredCode(filename, required, type) {
			logger?.error("\(#function, privacy: .public) - couldn't fetch remote content for \(filename, privacy: .public)")
			continue
		}

		// create filenames from sanitized resource urls
		// getRequiredCode does the same thing when saving to disk
		// populate array with entries for manifest
		var r = [String]()
		for resource in required {
			let sanitizedResourceName = sanitize(resource)
			r.append(sanitizedResourceName)
		}

		// if there are values, write them to manifest
		// if failed to write to manifest, continue to next file & log error
		if !r.isEmpty && r != manifest.require[filename] {
			manifest.require[filename] = r
			if !updateManifest(with: manifest) {
				logger?.error("\(#function, privacy: .public) - couldn't update manifest when getting required resources")
			}
		}
		logger?.info("\(#function, privacy: .public) - end   \(filename, privacy: .public)")
	}
	logger?.info("\(#function, privacy: .public) - completed")
	return true
}

func updateManifestDeclarativeNetRequests(_ optionalFilesArray: [[String: Any]] = []) -> Bool {
	logger?.info("\(#function, privacy: .public) - started")
	var files = [[String: Any]]()
	if optionalFilesArray.isEmpty {
		guard let getFiles = getAllFiles() else {
			logger?.error("\(#function, privacy: .public) - failed at (1)")
			return false
		}
		files = getFiles
	} else {
		files = optionalFilesArray
	}
	var manifest = getManifest()
	for file in files {
		// can be force unwrapped because getAllFiles didn't return nil
		// and getAllFiles always returns the following
		let metadata = file["metadata"] as! [String: [String]]
		let filename = file["filename"] as! String
		let runAt = metadata["run-at"]?[0] ?? "document-end"
		// if not a request type, ignore
		if runAt != "request" {
			continue
		}
		var update = false
		// if filename already in manifest
		if !manifest.declarativeNetRequest.contains(filename) {
			manifest.declarativeNetRequest.append(filename)
			update = true
		}
		// if filename in another array remove it
		for (pattern, filenames) in manifest.match {
			for fn in filenames {
				if fn == filename, let index = manifest.match[pattern]?.firstIndex(of: filename) {
					manifest.match[pattern]?.remove(at: index)
					update = true
				}
			}
		}
		for (pattern, filenames) in manifest.excludeMatch {
			for fn in filenames {
				if fn == filename, let index = manifest.excludeMatch[pattern]?.firstIndex(of: filename) {
					manifest.excludeMatch[pattern]?.remove(at: index)
					update = true
				}
			}
		}
		for (pattern, filenames) in manifest.include {
			for fn in filenames {
				if fn == filename, let index = manifest.include[pattern]?.firstIndex(of: filename) {
					manifest.include[pattern]?.remove(at: index)
					update = true
				}
			}
		}
		for (pattern, filenames) in manifest.exclude {
			for fn in filenames {
				if fn == filename, let index = manifest.exclude[pattern]?.firstIndex(of: filename) {
					manifest.exclude[pattern]?.remove(at: index)
					update = true
				}
			}
		}
		if update, !updateManifest(with: manifest) {
			logger?.error("\(#function, privacy: .public) - failed at (2)")
			return false
		}
	}
	logger?.info("\(#function, privacy: .public) - completed")
	return true
}

func purgeManifest(_ optionalFilesArray: [[String: Any]] = []) -> Bool {
	logger?.info("\(#function, privacy: .public) - started")
	// purge all manifest keys of any stale entries
	var update = false, manifest = getManifest(), allSaveLocationFilenames = [String]()
	// only get all files if files were not provided
	var allFiles = [[String: Any]]()
	if optionalFilesArray.isEmpty {
		// if getAllFiles fails to return, ignore and pass an empty array
		let getFiles = getAllFiles() ?? []
		allFiles = getFiles
	} else {
		allFiles = optionalFilesArray
	}
	// populate array with filenames
	for file in allFiles {
		if let filename = file["filename"] as? String {
			allSaveLocationFilenames.append(filename)
		}
	}
	// loop through manifest keys, if no file exists for value, remove value from manifest
	// if there are no more filenames in pattern, remove pattern from manifest
	for (pattern, filenames) in manifest.match {
		for filename in filenames {
			if !allSaveLocationFilenames.contains(filename) {
				if let index = manifest.match[pattern]?.firstIndex(of: filename) {
					manifest.match[pattern]?.remove(at: index)
					update = true
					logger?.info("\(#function, privacy: .public) - Could not find \(filename, privacy: .public) in save location, removed from match pattern - \(pattern, privacy: .public)")
				}
			}
		}
		if let length = manifest.match[pattern]?.count {
			if length < 1, let ind = manifest.match.index(forKey: pattern) {
				manifest.match.remove(at: ind)
				logger?.info("\(#function, privacy: .public) - No more files for \(pattern, privacy: .public) match pattern, removed from manifest")
			}
		}
	}
	for (pattern, filenames) in manifest.excludeMatch {
		for filename in filenames {
			if !allSaveLocationFilenames.contains(filename) {
				if let index = manifest.excludeMatch[pattern]?.firstIndex(of: filename) {
					manifest.excludeMatch[pattern]?.remove(at: index)
					update = true
					logger?.info("\(#function, privacy: .public) - Could not find \(filename, privacy: .public) in save location, removed from exclude-match pattern - \(pattern, privacy: .public)")
				}
			}
		}
		if let length = manifest.excludeMatch[pattern]?.count {
			if length < 1, let ind = manifest.excludeMatch.index(forKey: pattern) {
				manifest.excludeMatch.remove(at: ind)
				logger?.info("\(#function, privacy: .public) - No more files for \(pattern, privacy: .public) exclude-match pattern, removed from manifest")
			}
		}
	}
	for (pattern, filenames) in manifest.exclude {
		for filename in filenames {
			if !allSaveLocationFilenames.contains(filename) {
				if let index = manifest.exclude[pattern]?.firstIndex(of: filename) {
					manifest.exclude[pattern]?.remove(at: index)
					update = true
					logger?.info("\(#function, privacy: .public) - Could not find \(filename, privacy: .public) in save location, removed from exclude pattern - \(pattern, privacy: .public)")
				}
			}
		}
		if let length = manifest.exclude[pattern]?.count {
			if length < 1, let ind = manifest.exclude.index(forKey: pattern) {
				manifest.exclude.remove(at: ind)
				logger?.info("\(#function, privacy: .public) - No more files for \(pattern, privacy: .public) exclude pattern, removed from manifest")
			}
		}
	}
	for (pattern, filenames) in manifest.include {
		for filename in filenames {
			if !allSaveLocationFilenames.contains(filename) {
				if let index = manifest.include[pattern]?.firstIndex(of: filename) {
					manifest.include[pattern]?.remove(at: index)
					update = true
					logger?.info("\(#function, privacy: .public) - Could not find \(filename, privacy: .public) in save location, removed from exclude pattern - \(pattern, privacy: .public)")
				}
			}
		}
		if let length = manifest.include[pattern]?.count {
			if length < 1, let ind = manifest.include.index(forKey: pattern) {
				manifest.include.remove(at: ind)
				logger?.info("\(#function, privacy: .public) - No more files for \(pattern, privacy: .public) exclude pattern, removed from manifest")
			}
		}
	}
	// loop through manifest required
	for (filename, _) in manifest.require {
		if !allSaveLocationFilenames.contains(filename) {
			if let index = manifest.require.index(forKey: filename) {
				manifest.require.remove(at: index)
				// remove associated resources
				if !getRequiredCode(filename, [], (filename as NSString).pathExtension) {
					logger?.error("\(#function, privacy: .public) - failed to remove required resources when purging \(filename, privacy: .public) from manifest required records")
				}
				update = true
				logger?.info("\(#function, privacy: .public) - No more required resources for \(filename, privacy: .public), removed from manifest along with resource folder")
			}
		}
	}
	// loop through manifest disabled
	for filename in manifest.disabled {
		if !allSaveLocationFilenames.contains(filename) {
			if let index = manifest.disabled.firstIndex(of: filename) {
				manifest.disabled.remove(at: index)
				update = true
				logger?.info("\(#function, privacy: .public) - Could not find \(filename, privacy: .public) in save location, removed from disabled")
			}
		}
	}
	// loop through manifest declarativeNetRequest
	for filename in manifest.declarativeNetRequest {
		if !allSaveLocationFilenames.contains(filename) {
			if let index = manifest.declarativeNetRequest.firstIndex(of: filename) {
				manifest.declarativeNetRequest.remove(at: index)
				update = true
				logger?.info("\(#function, privacy: .public) - Could not find \(filename, privacy: .public) in save location, removed from dNR")
			}
		}
	}
	// remove obsolete settings
	for setting in manifest.settings {
		if !defaultSettings.keys.contains(setting.key) {
			manifest.settings.removeValue(forKey: setting.key)
			update = true
			logger?.info("\(#function, privacy: .public) - Removed obsolete setting - \(setting.key, privacy: .public)")
		}
	}
	if update, !updateManifest(with: manifest) {
		logger?.error("\(#function, privacy: .public) - failed to purge manifest")
		return false
	}
	logger?.info("\(#function, privacy: .public) - completed")
	return true
}

// settings
func checkSettings() -> Bool {
	// iterate over default settings and individually check if each present
	// if missing add setting to manifest about to be returned
	// missing keys will occur when new settings introduced
	var manifest = getManifest()
	var update = false
	for (key, value) in defaultSettings {
		if manifest.settings[key] == nil {
			manifest.settings[key] = value
			update = true
		}
	}
	if update, !updateManifest(with: manifest) {
		logger?.error("\(#function, privacy: .public) - failed to update manifest settings")
		return false
	}
	return true
}

func updateSettings(_ settings: [String: String]) -> Bool {
	var manifest = getManifest()
	manifest.settings = settings
	if updateManifest(with: manifest) != true {
		logger?.error("\(#function, privacy: .public) - failed to update settings")
		return false
	}
	return true
}

// files
func getAllFiles(includeCode: Bool = false) -> [[String: Any]]? {
	logger?.info("\(#function, privacy: .public) - started")
	// returns all files of proper type with filenames, metadata & more
	var files = [[String: Any]]()
	let fm = FileManager.default
	let manifest = getManifest()
	guard let saveLocation = getSaveLocation() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	// security scope
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	// get all file urls within save location
	guard let urls = try? fm.contentsOfDirectory(at: saveLocation, includingPropertiesForKeys: [])  else {
		logger?.error("\(#function, privacy: .public) - failed at (2)")
		return nil
	}
	for url in urls {
		var fileData = [String: Any]()
		// only read contents for css & js files
		let filename = url.lastPathComponent
		if (!filename.hasSuffix(".css") && !filename.hasSuffix(".js")) {
			continue
		}
		// file will be skipped if metablock is missing
		guard
			let content = try? String(contentsOf: url, encoding: .utf8),
			let dateMod = try? fm.attributesOfItem(atPath: url.path)[.modificationDate] as? Date,
			let parsed = parse(content),
			let metadata = parsed["metadata"] as? [String: [String]],
			let type = filename.split(separator: ".").last
		else {
			logger?.info("\(#function, privacy: .public) - ignoring \(filename, privacy: .public), file missing or metadata missing from file contents")
			continue
		}
		fileData["canUpdate"] = false
		fileData["content"] = content
		fileData["disabled"] = manifest.disabled.contains(filename)
		fileData["filename"] = filename
		fileData["lastModified"] = dateToMilliseconds(dateMod)
		fileData["metadata"] = metadata
		// force unwrap name since parser ensure it exists
		fileData["name"] = metadata["name"]![0]
		fileData["type"] = "\(type)"
		// add extra data if a request userscript
		let runAt = metadata["run-at"]?[0] ?? "document-end"
		if runAt == "request" {
			fileData["request"] = true
		}
		if metadata["description"] != nil {
			fileData["description"] = metadata["description"]![0]
		}
		if metadata["version"] != nil && metadata["updateURL"] != nil {
			fileData["canUpdate"] = true
		}
		fileData["noframes"] = metadata["noframes"] != nil ? true : false
		// if asked, also return the code string
		if (includeCode) {
			// can force unwrap because always returned from parser
			fileData["code"] = parsed["code"] as! String
		}
		files.append(fileData)
	}
	logger?.info("\(#function, privacy: .public) - completed")
	return files
}

func getRequiredCode(_ filename: String, _ resources: [String], _ fileType: String) -> Bool {
	let directory = getRequireLocation().appendingPathComponent(filename)
	// if file requires no resource but directory exists, remove it
	// this resource is not user-generated and can be downloaded again, so just remove it instead of moves to the trash
	// also in ios, the volume “Data” has no trash and item can only be removed directly
	if resources.isEmpty {
		if FileManager.default.fileExists(atPath: directory.path) {
			do {
				try FileManager.default.removeItem(at: directory)
			} catch {
				logger?.error("\(#function, privacy: .public) - failed to remove directory: \(error.localizedDescription, privacy: .public)")
			}
		}
		return true
	}
	// record URLs for subsequent processing
	var resourceUrls = Set<URL>()
	// loop through resource urls and attempt to fetch it
	for resourceUrlString in resources {
		// get the path of the url string
		guard let resourceUrlPath = URLComponents(string: resourceUrlString)?.path else {
			// if path can not be obtained, skip and log
			logger?.info("\(#function, privacy: .public) - failed to get path on \(filename, privacy: .public) for \(resourceUrlString, privacy: .public)")
			continue
		}
		// skip urls pointing to files of different types
		if resourceUrlPath.hasSuffix(fileType) {
			let resourceFilename = sanitize(resourceUrlString)
			let fileURL = directory.appendingPathComponent(resourceFilename)
			// insert url to resolve symlink into set
			resourceUrls.insert(fileURL.standardizedFileURL)
			// only attempt to get resource if it does not yet exist
			if FileManager.default.fileExists(atPath: fileURL.path) {continue}
			// get the remote file contents
			guard let contents = getRemoteFileContents(resourceUrlString) else {continue}
			// check if file specific folder exists at requires directory
			if !FileManager.default.fileExists(atPath: directory.path) {
				guard ((try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)) != nil) else {
					logger?.info("\(#function, privacy: .public) - failed to create required code directory for \(filename, privacy: .public)")
					return false
				}
			}
			// finally write file to directory
			guard ((try? contents.write(to: fileURL, atomically: false, encoding: .utf8)) != nil) else {
				logger?.info("\(#function, privacy: .public) - failed to write content to file for \(filename, privacy: .public) from \(resourceUrlString, privacy: .public)")
				return false
			}
		}
	}
	// cleanup downloaded files that are no longer required
	do {
		var downloadedUrls = Set<URL>()
		// get all downloaded resources url
		let fileUrls = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [])
		// insert url to resolve symlink into set
		for url in fileUrls { downloadedUrls.insert(url.standardizedFileURL) }
		// exclude currently required resources
		let abandonedUrls = downloadedUrls.subtracting(resourceUrls)
		// loop through abandoned urls and attempt to remove it
		for abandonFileUrl in abandonedUrls {
			do {
				try FileManager.default.removeItem(at: abandonFileUrl)
				logger?.info("\(#function, privacy: .public) - cleanup abandoned resource: \(unsanitize(abandonFileUrl.lastPathComponent), privacy: .public)")
			} catch {
				logger?.error("\(#function, privacy: .public) - failed to remove abandoned resource: \(error.localizedDescription, privacy: .public)")
			}
		}
	} catch {
		logger?.error("\(#function, privacy: .public) - failed to cleanup resources: \(error.localizedDescription, privacy: .public)")
	}
	return true
}

func checkForRemoteUpdates(_ optionalFilesArray: [[String: Any]] = []) -> [[String: String]]? {
	// only get all files if files were not provided
	var files = [[String: Any]]()
	if optionalFilesArray.isEmpty {
		guard let getFiles = getAllFiles() else {
			logger?.error("\(#function, privacy: .public) - failed at (1)")
			return nil
		}
		files = getFiles
	} else {
		files = optionalFilesArray
	}

	var hasUpdates = [[String: String]]()
	for file in files {
		// can be force unwrapped because getAllFiles didn't return nil
		let filename = file["filename"] as! String
		let canUpdate = file["canUpdate"] as! Bool
		let metadata = file["metadata"] as! [String: [String]]
		let type = file["type"] as! String
		let name = metadata["name"]![0]
		logger?.info("\(#function, privacy: .public) - Checking for remote updates for \(filename, privacy: .public)")
		if canUpdate {
			let currentVersion = metadata["version"]![0]
			let updateUrl = metadata["updateURL"]![0]
			// before fetching remote contents, ensure it points to a file of the same type
			if !updateUrl.hasSuffix(type) {continue}
			guard
				let remoteFileContents = getRemoteFileContents(updateUrl),
				let remoteFileContentsParsed = parse(remoteFileContents),
				let remoteMetadata = remoteFileContentsParsed["metadata"] as? [String: [String]],
				let remoteVersion = remoteMetadata["version"]?[0]
			else {
				logger?.error("\(#function, privacy: .public) - failed to parse remote file contents")
				return nil
			}
			let remoteVersionNewer = isVersionNewer(currentVersion, remoteVersion)
			if remoteVersionNewer {
				hasUpdates.append(["name": name, "filename": filename, "type": type, "url": updateUrl])
			}
		}
	}
	logger?.info("\(#function, privacy: .public) - Finished checking for remote updates for \(files.count, privacy: .public) files")
	return hasUpdates
}

func getRemoteFileContents(_ url: String) -> String? {
	logger?.info("\(#function, privacy: .public) - started for \(url, privacy: .public)")
	// if url is http change to https
	var urlChecked = url
	if urlChecked.hasPrefix("http:") {
		urlChecked = urlChecked.replacingOccurrences(of: "http:", with: "https:")
		logger?.info("\(#function, privacy: .public) - \(url, privacy: .public) is using insecure http, attempt to fetch remote content with https")
	}
	// convert url string to url
	guard let solidURL = fixedURL(string: urlChecked) else {
		logger?.error("\(#function, privacy: .public) - failed at (1), invalid URL: \(url, privacy: .public)")
		return nil
	}
	var contents = ""
	// get remote file contents, synchronously
	let semaphore = DispatchSemaphore(value: 0)
	var task: URLSessionDataTask?
	task = URLSession.shared.dataTask(with: solidURL) { data, response, error in
		if let r = response as? HTTPURLResponse, data != nil, error == nil {
			if r.statusCode == 200 {
				contents = String(data: data!, encoding: .utf8) ?? ""
			} else {
				logger?.error("\(#function, privacy: .public) - http statusCode (\(r.statusCode, privacy: .public)): \(url, privacy: .public)")
			}
		}
		if let error = error {
			logger?.error("\(#function, privacy: .public) - task error: \(error.localizedDescription, privacy: .public) (\(url, privacy: .public))")
		}
		semaphore.signal()
	}
	task?.resume()
	// wait 30 seconds before timing out
	if semaphore.wait(timeout: .now() + 30) == .timedOut {
		task?.cancel()
		logger?.error("\(#function, privacy: .public) - 30 seconds timeout: \(url, privacy: .public)")
	}

	// if made it to this point and contents still an empty string, something went wrong with the request
	if contents.isEmpty {
		logger?.error("\(#function, privacy: .public) - failed at (2), contents empty: \(url, privacy: .public)")
		return nil
	}
	logger?.info("\(#function, privacy: .public) - completed for \(url, privacy: .public)")
	return contents
}

func updateAllFiles(_ optionalFilesArray: [[String: Any]] = []) -> Bool {
	// get names of all files with updates available
	guard
		let filesWithUpdates = checkForRemoteUpdates(optionalFilesArray),
		let saveLocation = getSaveLocation()
	else {
		logger?.error("\(#function, privacy: .public) - failed to update files (1)")
		return false
	}
	// security scope
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	for file in filesWithUpdates {
		// can be force unwrapped because checkForRemoteUpdates didn't return nil
		let filename = file["filename"]!
		let fileUrl = saveLocation.appendingPathComponent(filename)
		guard
			let content = try? String(contentsOf: fileUrl, encoding: .utf8),
			let parsed = parse(content),
			let metadata = parsed["metadata"] as? [String: [String]],
			let updateUrl = metadata["updateURL"]?[0]
		else {
			logger?.error("\(#function, privacy: .public) - failed to update files (2)")
			continue
		}
		let downloadUrl = metadata["downloadURL"] != nil ? metadata["downloadURL"]![0] : updateUrl
		guard
			let remoteFileContents = getRemoteFileContents(downloadUrl),
			((try? remoteFileContents.write(to: fileUrl, atomically: false, encoding: .utf8)) != nil)
		else {
			logger?.error("\(#function, privacy: .public) - failed to update files (3)")
			continue
		}
		logger?.info("\(#function, privacy: .public) - updated \(filename, privacy: .public) with contents fetched from \(downloadUrl, privacy: .public)")
	}
	return true
}

func toggleFile(_ filename: String,_ action: String) -> Bool {
	// if file doesn't exist return false
	guard let saveLocation = getSaveLocation() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return false
	}
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	let path = saveLocation.appendingPathComponent(filename).path
	if !FileManager.default.fileExists(atPath: path) {
		logger?.error("\(#function, privacy: .public) - failed at (2)")
		return false
	}
	var manifest = getManifest()
	// if file is already disabled
	if action == "disable" && manifest.disabled.contains(filename) || action == "enabled" && !manifest.disabled.contains(filename) {
		return true
	}
	// add filename to disabled array if disabling
	if (action == "disable") {manifest.disabled.append(filename)}
	// remove filename from disabled array if enabling
	if (action == "enable") {
		guard let index = manifest.disabled.firstIndex(of: filename) else {
			logger?.error("\(#function, privacy: .public) - failed at (3)")
			return false
		}
		manifest.disabled.remove(at: index)
	}
	if !updateManifest(with: manifest) {
		logger?.error("\(#function, privacy: .public) - failed at (4)")
		return false
	}
	return true
}

func checkDefaultDirectories() -> Bool {
	let defaultSaveLocation = getDocumentsDirectory().appendingPathComponent("scripts")
	let requireLocation = getRequireLocation()
	let urls = [defaultSaveLocation, requireLocation]
	for url in urls {
		if !FileManager.default.fileExists(atPath: url.path) {
			do {
				try FileManager.default.createDirectory(at: url, withIntermediateDirectories: false)
			} catch {
				// could not create the save location directory, show error
				logger?.error("\(#function, privacy: .public) - failed at (1) - \(url, privacy: .public) - \(error.localizedDescription, privacy: .public)")
				return false
			}
		}
	}
	return true
}

// matching
func stringToRegex(_ stringPattern: String) -> NSRegularExpression? {
	let pattern = #"[\.|\?|\^|\$|\+|\{|\}|\[|\]|\||\\(|\)|\/]"#
	var patternReplace = "^\(stringPattern.replacingOccurrences(of: pattern, with: #"\\$0"#, options: .regularExpression))$"
	patternReplace = patternReplace.replacingOccurrences(of: "*", with: ".*")
	guard let regex = try? NSRegularExpression(pattern: patternReplace, options: .caseInsensitive) else {
		return nil
	}
	return regex
}

func match(_ url: String, _ matchPattern: String) -> Bool {
	guard
		let parts = jsLikeURL(url),
		let ptcl = parts["protocol"],
		let host = parts["hostname"],
		var path = parts["pathname"]
	else {
		logger?.error("\(#function, privacy: .public) - invalid url \(url, privacy: .public)")
		return false
	}

	// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#path
	// The value for the path matches against the string which is the URL path plus the URL query string
	if let search = parts["search"], search.count > 0 {
		path += search
	}

	// matchPattern is the value from metatdata key @match or @exclude-match
	if (matchPattern == "<all_urls>") {
		return true
	}
	// currently only http/s supported
	if (ptcl != "http:" && ptcl != "https:") {
		return false
	}
	let partsPattern = #"^(http:|https:|\*:)\/\/((?:\*\.)?(?:[a-z0-9-]+\.)+(?:[a-z0-9]+)|\*\.[a-z]+|\*|[a-z0-9]+)(\/[^\s]*)$"#
	let partsPatternReg = try! NSRegularExpression(pattern: partsPattern, options: .caseInsensitive)
	let range = NSMakeRange(0, matchPattern.utf16.count)
	guard let parts = partsPatternReg.firstMatch(in: matchPattern, options: [], range: range) else {
		logger?.error("\(#function, privacy: .public) - malformed regex match pattern - \(matchPattern, privacy: .public)")
		return false
	}
	// ensure url protocol matches pattern protocol
	let protocolPattern = matchPattern[Range(parts.range(at: 1), in: matchPattern)!]
	if (protocolPattern != "*:" && ptcl != protocolPattern) {
		return false
	}
	// construct host regex from matchPattern
	let matchPatternHost = matchPattern[Range(parts.range(at: 2), in: matchPattern)!]
	var hostPattern = "^\(matchPatternHost.replacingOccurrences(of: ".", with: "\\."))$"
	hostPattern = hostPattern.replacingOccurrences(of: "^*$", with: ".*")
	hostPattern = hostPattern.replacingOccurrences(of: "*\\.", with: "(.*\\.)?")
	guard let hostRegEx = try? NSRegularExpression(pattern: hostPattern, options: .caseInsensitive) else {
		logger?.error("\(#function, privacy: .public) - invalid host regex")
		return false
	}
	// construct path regex from matchPattern
	let matchPatternPath = matchPattern[Range(parts.range(at: 3), in: matchPattern)!]
	guard let pathRegEx = stringToRegex(String(matchPatternPath)) else {
		logger?.error("\(#function, privacy: .public) - invalid path regex")
		return false
	}
	guard
		(hostRegEx.firstMatch(in: host, options: [], range: NSMakeRange(0, host.utf16.count)) != nil),
		(pathRegEx.firstMatch(in: path, options: [], range: NSMakeRange(0, path.utf16.count)) != nil)
	else {
		return false
	}

	return true
}

func include(_ url: String,_ pattern: String) -> Bool {
	var regex:NSRegularExpression
	if pattern.hasPrefix("/") && pattern.hasSuffix("/") {
		let p = String(pattern.dropFirst().dropLast())
		guard let exp = try? NSRegularExpression(pattern: p, options: .caseInsensitive) else {
			logger?.error("\(#function, privacy: .public) - invalid regex")
			return false
		}
		regex = exp
	} else {
		guard let exp = stringToRegex(pattern) else {
			logger?.error("\(#function, privacy: .public) - coudn't convert string to regex")
			return false
		}
		regex = exp
	}
	if (regex.firstMatch(in: url, options: [], range: NSMakeRange(0, url.utf16.count)) == nil) {
		return false
	}
	return true
}

func getMatchedFiles(_ url: String, _ optionalManifest: Manifest?, _ checkBlocklist: Bool) -> [String] {
	logger?.info("\(#function, privacy: .public) - Getting matched files for \(url, privacy: .private(mask: .hash))")
	// logger?.debug("\(#function, privacy: .public) - Getting matched files for \(url, privacy: .public)")
	let manifest = optionalManifest ?? getManifest()

	// filenames that should not load for the passed url
	// the manifest values from @exclude and @exclude-match populate this set
	var excludedFilenames: Set<String> = []
	// filenames that should load for the passed url
	// the manifest values from @include and @match populate this set
	var matchedFilenames: Set<String> = []
	// all exclude-match patterns from manifest
	let excludeMatchPatterns = manifest.excludeMatch.keys
	// all match patterns from manifest
	let matchPatterns = manifest.match.keys
	// all include expressions from manifest
	let includeExpressions = manifest.include.keys
	// all exclude expressions from manifest
	let excludeExpressions = manifest.exclude.keys

	// if url matches a pattern in blocklist, no injection for this url
	if (checkBlocklist) {
		for pattern in manifest.blacklist {
			if match(url, pattern) {
				// return empty array
				return Array(matchedFilenames)
			}
		}
	}

	// loop through all the @exclude-match patterns
	// if any match passed url, push all filenames to excludedFilenames set
	for pattern in excludeMatchPatterns {
		if match(url, pattern) {
			guard let filenames = manifest.excludeMatch[pattern] else {
				logger?.error("\(#function, privacy: .public) - failed at (2) for \(pattern, privacy: .public)")
				continue
			}
			excludedFilenames = excludedFilenames.union(filenames)
		}
	}
	for exp in excludeExpressions {
		if include(url, exp) {
			guard let filenames = manifest.exclude[exp] else {
				logger?.error("\(#function, privacy: .public) - failed at (3) for \(exp, privacy: .public)")
				continue
			}
			excludedFilenames = excludedFilenames.union(filenames)
		}
	}
	for pattern in matchPatterns {
		if match(url, pattern) {
			guard let filenames = manifest.match[pattern] else {
				logger?.error("\(#function, privacy: .public) - failed at (4) for \(pattern, privacy: .public)")
				continue
			}
			matchedFilenames = matchedFilenames.union(filenames)
		}
	}
	for exp in includeExpressions {
		if include(url, exp) {
			guard let filenames = manifest.include[exp] else {
				logger?.error("\(#function, privacy: .public) - failed at (5) for \(exp, privacy: .public)")
				continue
			}
			matchedFilenames = matchedFilenames.union(filenames)
		}
	}
	matchedFilenames = matchedFilenames.subtracting(excludedFilenames)
	logger?.info("\(#function, privacy: .public) - Got \(matchedFilenames.count) matched files for \(url, privacy: .private(mask: .hash))")
	// logger?.debug("\(#function, privacy: .public) - Got \(matchedFilenames.count) matched files for \(url, privacy: .public)")
	return Array(matchedFilenames)
}

// injection
func getCode(_ filenames: [String], _ isTop: Bool)-> [String: Any]? {
	var cssFiles = [Any]()
	var jsFiles = [Any]()
	var menuFiles = [Any]()

	guard let saveLocation = getSaveLocation() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}

	for filename in filenames {
		guard
			let contents = getFileContentsParsed(saveLocation.appendingPathComponent(filename)),
			var code = contents["code"] as? String,
			let type = filename.split(separator: ".").last
		else {
			// if guard fails, log error continue to next file
			logger?.error("\(#function, privacy: .public) - failed at (2) for \(filename, privacy: .public)")
			continue
		}
		// can force unwrap b/c getFileContentsParsed ensures metadata exists
		let metadata = contents["metadata"] as! [String: [String]]
		let name = metadata["name"]![0]

		// if metadata has noframes option and the url is not the top window, don't load
		if (metadata["noframes"] != nil && !isTop) {
			continue
		}

		// get run-at values and set default if missing
		// if type request, ignore
		var runAt = metadata["run-at"]?[0] ?? "document-end"
		if runAt == "request" {
			continue
		}

		// normalize weight
		var weight = metadata["weight"]?[0] ?? "1"
		weight = normalizeWeight(weight)

		// get inject-into and set default if missing
		var injectInto = metadata["inject-into"]?[0] ?? "auto"
		let injectVals: Set<String> = ["auto", "content", "page"]
		let runAtVals: Set<String> = ["context-menu", "document-start", "document-end", "document-idle"]
		let validGrants: Set<String> = [
			"GM.info",
			"GM_info",
			"GM.addStyle",
			"GM.openInTab",
			"GM.closeTab",
			"GM.setValue",
			"GM.getValue",
			"GM.deleteValue",
			"GM.listValues",
			"GM.setClipboard",
			"GM.getTab",
			"GM.saveTab",
			"GM_xmlhttpRequest",
			"GM.xmlHttpRequest"
		]
		// if either is invalid use default value
		if !injectVals.contains(injectInto) {
			injectInto = "auto"
		}
		if !runAtVals.contains(runAt) {
			runAt = "document-end"
		}

		// attempt to get all @grant value
		var grants = metadata["grant"] ?? []

		if !grants.isEmpty {
			if grants.contains("none") {
				// `@grant none` takes precedence
				grants = []
			} else {
				// remove duplicates
				grants = Array(Set(grants))
				// filter out grant values that are not in validGrant set
				grants = grants.filter{validGrants.contains($0)}
			}
		}
		

		// set GM.info data
		let description = metadata["description"]?[0] ?? ""
		let excludes = metadata["exclude"] ?? []
		let excludeMatches = metadata["exclude-match"] ?? []
		let icon = metadata["icon"]?[0] ?? ""
		let includes = metadata["include"] ?? []
		let matches = metadata["match"] ?? []
		let requires = metadata["require"] ?? []
		let version = metadata["version"]?[0] ?? ""
		let noframes = metadata["noframes"] != nil ? true : false
		var scriptObject:[String: Any] = [
			"description": description,
			"excludes": excludes,
			"exclude-match": excludeMatches,
			"filename": filename,
			"grant": grants,
			"icon": icon,
			"includes": includes,
			"inject-into": injectInto,
			"matches": matches,
			"name": name,
			"noframes": noframes,
			"namespace": "",
			"resources": "",
			"require": requires,
			"run-at": runAt,
			"version": version
		]
		// certain metadata keys use a different key name then the actual key name
		// for compatibility keeping this when applicable, although the rationale is not clear to me
		// for unique keys passed to scriptObject, using the same key name that is present in actual userscript
		// this key map is used to check for existence of keys in next loop
		let keyMap = [
			"exclude": "excludes",
			"include": "includes",
			"match": "matches",
			"resource": "resources",
		]
		for metaline in metadata {
			let key = keyMap[metaline.key] ?? metaline.key
			if !scriptObject.keys.contains(key) {
				let value = metaline.value
				// metalines without values aren't included in parsed metadata object
				// the only exception is @noframes
				scriptObject[key] = !value.isEmpty ? value : value[0]
			}
		}
		let scriptMetaStr = contents["metablock"] as? String ?? "??"

		// attempt to get require resource from disk
		// if required resource is inaccessible, log error and continue
		if let required = metadata["require"] {
			// reverse required metadata
			// if required is ["A", "B", "C"], C gets added above B which is above A, etc..
			// the reverse of that is desired
			for require in required.reversed() {
				let sanitizedName = sanitize(require)
				let requiredFileURL = getRequireLocation().appendingPathComponent(filename).appendingPathComponent(sanitizedName)
				if let requiredContent = try? String(contentsOf: requiredFileURL, encoding: .utf8) {
					code = "\(requiredContent)\n\(code)"
				} else {
					logger?.error("\(#function, privacy: .public) - failed at (3) for \(require, privacy: .public)")
				}
			}
		}

		if type == "css" {
			cssFiles.append([
				"code": code,
				"filename": filename,
				"name": name,
				"type": "css",
				"weight": weight
			])
		} else if type == "js" {
			if runAt == "context-menu" {
				#if os(macOS)
					menuFiles.append([
						"code": code,
						"scriptMetaStr": scriptMetaStr,
						"scriptObject": scriptObject,
						"type": "js",
						"weight": weight
					])
				#endif
			} else {
				jsFiles.append([
					"code": code,
					"scriptMetaStr": scriptMetaStr,
					"scriptObject": scriptObject,
					"type": "js",
					"weight": weight
				])
			}
		}
	}
	let resp = [
		"files": ["css": cssFiles, "js": jsFiles, "menu": menuFiles],
		"scriptHandler": "Userscripts",
		"scriptHandlerVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "??"
	] as [String : Any]
	return resp
}

func getFileContentsParsed(_ url: URL) -> [String: Any]? {
	guard let saveLocation = getSaveLocation() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	// security scope
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	// check that url is a valid path to a directory or single file
	guard
		FileManager.default.fileExists(atPath: url.path),
		let content = try? String(contentsOf: url, encoding: .utf8),
		let parsed = parse(content)
	else {
		return nil
	}
	return parsed
}

func getInjectionFilenames(_ url: String) -> [String]? {
	var filenames = [String]()
	let manifest = getManifest()
	guard let active = manifest.settings["active"] else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	// if injection is disabled return empty array
	if active != "true" {
		return filenames
	}
	let matched = getMatchedFiles(url, manifest, true)
	// filter out all disabled files
	filenames = matched.filter{!manifest.disabled.contains($0)}
	return filenames
}

func getRequestScripts() -> [[String: String]]? {
	var requestScripts = [[String: String]]()
	// check the manifest to see if injection is enabled
	let manifest = getManifest()
	guard let active = manifest.settings["active"] else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	// if not enabled, do not apply any net requests, ie. return empty array
	if active != "true" {
		return requestScripts
	}
	guard let files = getAllFiles(includeCode: true) else {
		logger?.error("\(#function, privacy: .public) - failed at (2)")
		return nil
	}
	for file in files {
		let isRequest = file["request"] as? Bool ?? false
		// skip any non-request userscripts
		if !isRequest {
			continue
		}
		// can be force unwrapped because getAllFiles always returns these
		let name = file["name"] as! String
		let code = file["code"] as! String
		let filename = file["filename"] as! String

		if !manifest.disabled.contains(filename) {
			requestScripts.append(["name": name, "code": code])
		}
	}
	return requestScripts
}

func getContextMenuScripts() -> [String: Any]? {
	var menuFilenames = [String]()
	// check the manifest to see if injection is enabled
	let manifest = getManifest()
	guard let active = manifest.settings["active"] else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	// if not enabled return empty array
	if active != "true" {
		return ["files": ["menu": []]]
	}
	// get all files at save location
	guard let files = getAllFiles() else {
		logger?.error("\(#function, privacy: .public) - failed at (2)")
		return nil
	}
	// loop through files and find @run-at context-menu script filenames
	for file in files {
		guard let filename = file["filename"] as? String else {
			logger?.error("\(#function, privacy: .public) - failed at (3), couldn't get filename")
			continue
		}
		guard let fileMetadata = file["metadata"] as? [String: [String]] else {
			logger?.error("\(#function, privacy: .public) - failed at (4), couldn't get metadata for \(filename, privacy: .public)")
			continue
		}
		let runAt = fileMetadata["run-at"]?[0] ?? "document-end"
		if runAt != "context-menu" || manifest.disabled.contains(filename) {
			continue
		}
		menuFilenames.append(filename)
	}
	// get and return script objects for all context-menu scripts
	guard let scripts = getCode(menuFilenames, true) else {
		logger?.error("\(#function, privacy: .public) - failed at (5)")
		return nil
	}
	return scripts
}

// popup
func getPopupMatches(_ url: String, _ subframeUrls: [String]) -> [[String: Any]]? {
	var matches = [[String: Any]]()
	// if the url doesn't start with http/s return empty array
	if !url.starts(with: "http://") && !url.starts(with: "https://") {
		return matches
	}
	// get all the files saved to manifest that match the passed url
	let matched = getMatchedFiles(url, nil, false)
	// get all the files at the save location
	guard
		let files = getAllFiles()
	else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	// filter out the files that are present in both files and matched
	// force unwrap filename to string since getAllFiles always returns it
	matches = files.filter{matched.contains($0["filename"] as! String)}

	// get the subframe url matches
	var frameUrlsMatched = [[String: Any]]()
	var frameUrlsMatches = [String]()
	// filter out the top page url from the frame urls
	let frameUrls = subframeUrls.filter{$0 != url}
	// for each url just pushed to frameUrls, get all the files saved to manifest that match their url
	for frameUrl in frameUrls {
		let frameMatches = getMatchedFiles(frameUrl, nil, false)
		for frameMatch in frameMatches {
			// for the match against the frameUrl, see if it has @noframes
			// if so, it should not be appended to frameUrlsMatches
			// filter all files for the first one that matches the frameMatch filename
			// can force unwrap filename b/c getAllFiles always returns it
			let frameMatchMetadata = files.filter{$0["filename"] as! String == frameMatch}.first
			// can force unwrap noframes b/c getAllFiles always returns it
			let noFrames = frameMatchMetadata?["noframes"] as? Bool ?? false
			if !matched.contains(frameMatch) && !noFrames {
				frameUrlsMatches.append(frameMatch)
			}
		}
	}

	// filter out the files that are present in both files and frameUrlsMatches
	// force unwrap filename to string since getAllFiles always returns it
	frameUrlsMatched = files.filter{frameUrlsMatches.contains($0["filename"] as! String)}
	// loop through frameUrlsMatched and add subframe key/val
	for (index, var frameUrlsMatch) in frameUrlsMatched.enumerated() {
		frameUrlsMatch["subframe"] = true
		frameUrlsMatched[index] = frameUrlsMatch
	}
	// add frameUrlsMatched to matches array
	matches.append(contentsOf: frameUrlsMatched)
	return matches
}

func popupUpdateAll() -> Bool {
	guard
		let files = getAllFiles(),
		updateAllFiles(files),
		updateManifestMatches(files),
		updateManifestRequired(files),
		purgeManifest(files)
	else {
		return false
	}
	return true
}

func getPopupBadgeCount(_ url: String, _ subframeUrls: [String]) -> Int? {
	if !url.starts(with: "http://") && !url.starts(with: "https://") {
		return 0
	}
	let manifest = getManifest()
	guard
		var matches = getPopupMatches(url, subframeUrls)
	else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	for pattern in manifest.blacklist {
		if match(url, pattern) {
			return 0
		}
	}
	matches = matches.filter{!manifest.disabled.contains($0["filename"] as! String)}
	return matches.count
}

func popupUpdateSingle(_ filename: String, _ url: String, _ subframeUrls: [String]) -> [[String: Any]]? {
	guard let saveLocation = getSaveLocation() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	// security scope
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	let fileUrl = saveLocation.appendingPathComponent(filename)
	guard
		let content = try? String(contentsOf: fileUrl, encoding: .utf8),
		let parsed = parse(content),
		let metadata = parsed["metadata"] as? [String: [String]],
		let updateUrl = metadata["updateURL"]?[0]
	else {
		logger?.error("\(#function, privacy: .public) - failed at (2)")
		return nil
	}
	let downloadUrl = metadata["downloadURL"] != nil ? metadata["downloadURL"]![0] : updateUrl
	guard
		let remoteFileContents = getRemoteFileContents(downloadUrl),
		((try? remoteFileContents.write(to: fileUrl, atomically: false, encoding: .utf8)) != nil)
	else {
		logger?.error("\(#function, privacy: .public) - failed at (3)")
		return nil
	}
	guard
		let files = getAllFiles(),
		updateManifestMatches(files),
		updateManifestRequired(files),
		purgeManifest(files),
		let matches = getPopupMatches(url, subframeUrls)
	else {
		logger?.error("\(#function, privacy: .public) - failed at (4)")
		return nil
	}
	return matches
}

// page
func getInitData() -> [String: Any]? {
	guard let saveLocation = getSaveLocation() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return nil
	}
	return [
		"saveLocation": saveLocation.path,
		"platform": getPlatform(),
		"scheme": Bundle.main.infoDictionary?["US_URL_SCHEME"] as! String,
		"version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "??",
		"build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "??"
	]
}

func getLegacyData() -> [String: Any]? {
	let manifest = getManifest()
	var data:[String: Any] = manifest.settings
	data["blacklist"] = manifest.blacklist
	return data
}

func saveFile(_ item: [String: Any],_ content: String) -> [String: Any] {
	var response = [String: Any]()
	let newContent = content
	guard let saveLocation = getSaveLocation() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return ["error": "failed to get save location when attempting to save"]
	}
	guard
		let oldFilename = item["filename"] as? String,
		let type = item["type"] as? String
	else {
		return ["error": "invalid argument in save function"]
	}
	guard
		let parsed = parse(newContent),
		let metadata = parsed["metadata"] as? [String: [String]]
	else {
		return ["error": "failed to parse metadata"]
	}
	guard let n = metadata["name"]?[0] else {
		return ["error": "@name not found in metadata"]
	}
	var name = sanitize(n)

	// construct new file name
	let newFilename = "\(name).user.\(type)"

	// security scope
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	guard
		let allFilesUrls = try? FileManager.default.contentsOfDirectory(at: saveLocation, includingPropertiesForKeys: [])
	else {
		return ["error": "failed to read save urls in save function"]
	}

	// validate file before save
	var allFilenames:[String] = [] // stores the indv filenames for later comparison
	// old and new filenames are equal, overwriting and can skip
	if oldFilename.lowercased() != newFilename.lowercased() {
		// loop through all the file urls in the save location and save filename to var
		for fileUrl in allFilesUrls {
			// skip file if it is not of the proper type
			let filename = fileUrl.lastPathComponent
			if (!filename.hasSuffix(type)) {
				continue
			}
			// if file is of the proper type, add it to the allFilenames array
			allFilenames.append(filename.lowercased())
		}
	}

	if allFilenames.contains(newFilename.lowercased()) {
		return ["error": "filename already taken"]
	}

	if newFilename.count > 250 {
		return ["error": "filename too long"]
	}

	// file passed validation

	// attempt to save to disk
	let newFileUrl = saveLocation.appendingPathComponent(newFilename)
	do {
		try newContent.write(to: newFileUrl, atomically: false, encoding: .utf8)
	} catch {
		logger?.error("\(#function, privacy: .public) - failed at (2)")
		return ["error": "failed to write file to disk"]
	}

	// saved to disk successfully

	// get the file last modified date
	guard
		let dateMod = try? FileManager.default.attributesOfItem(atPath: newFileUrl.path)[.modificationDate] as? Date
	else {
		logger?.error("\(#function, privacy: .public) - failed at (3)")
		return ["error": "failed to read modified date in save function"]
	}

	// remove old file and manifest records for old file if they exist
	if oldFilename.lowercased() != newFilename.lowercased() {
		// if user changed the filename, remove file with old filename
		let oldFileUrl = saveLocation.appendingPathComponent(oldFilename)
		// however, when creating a new file, if user changes the temp given name by app...
		// oldFilename (the temp name in activeItem) and newFilename (@name in file contents) will differ
		// the file with oldFilename will not be on the filesystem and can not be deleted
		// for that edge case, using try? rather than try(!) to allow failures
		try? FileManager.default.trashItem(at: oldFileUrl, resultingItemURL: nil)
	}

	// update manifest for new file and purge anything from old file
	guard
		let allFiles = getAllFiles(),
		updateManifestMatches(allFiles),
		updateManifestRequired(allFiles),
		updateManifestDeclarativeNetRequests(allFiles),
		purgeManifest(allFiles)
	else {
		logger?.error("\(#function, privacy: .public) - failed at (4)")
		return ["error": "file save but manifest couldn't be updated"]
	}

	// un-santized name
	name = unsanitize(name)

	// build response dict
	response["canUpdate"] = false
	response["content"] = newContent
	response["filename"] = newFilename
	response["lastModified"] = dateToMilliseconds(dateMod)
	response["name"] = name
	if metadata["description"] != nil {
		response["description"] = metadata["description"]![0]
	}
	if metadata["version"] != nil && metadata["updateURL"] != nil {
		response["canUpdate"] = true
	}
	// if a request "type" userscript add key/val
	let runAt = metadata["run-at"]?[0] ?? "document-end"
	if runAt == "request" {
		response["request"] = true
	}

	return response
}

func trashFile(_ item: [String: Any]) -> Bool {
	guard
		let saveLocation = getSaveLocation(),
		let filename = item["filename"] as? String
	else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return false
	}
	// security scope
	let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
	defer {
		if didStartAccessing {saveLocation.stopAccessingSecurityScopedResource()}
	}
	let url = saveLocation.appendingPathComponent(filename)
	// if file is already removed from path, assume it was removed by user and return true
	if (FileManager.default.fileExists(atPath: url.path)) {
		do {
			try FileManager.default.trashItem(at: url, resultingItemURL: nil)
		} catch {
			logger?.error("\(#function, privacy: .public) - \(error.localizedDescription, privacy: .public)")
			return false
		}
	}
	// update manifest
	guard updateManifestMatches(), updateManifestRequired(), purgeManifest() else {
		logger?.error("\(#function, privacy: .public) - failed at (2)")
		return false
	}
	return true;
}

func getFileRemoteUpdate(_ content: String) -> [String: String] {
	guard
		let parsed = parse(content),
		let metadata = parsed["metadata"] as? [String: [String]]
	else {
		// can't parse editor contents
		return ["error": "Update failed, metadata missing"]
	}
	// editor contents missing version value
	guard let version = metadata["version"]?[0] else {
		return ["error": "Update failed, version value required"]
	}
	// editor contents missing updateURL
	guard let updateURL = metadata["updateURL"]?[0] else {
		return ["error": "Update failed, update url required"]
	}
	// set download url
	let downloadURL = (metadata["downloadURL"] != nil) ? metadata["downloadURL"]![0] : updateURL
	// basic url validation
	guard validateUrl(updateURL) else {
		return ["error": "Update failed, invalid updateURL"]
	}
	guard validateUrl(downloadURL) else {
		return ["error": "Update failed, invalid downloadURL"]
	}
	// get the remote file contents for checking version
	guard var remoteContent = getRemoteFileContents(updateURL) else {
		return ["error": "Update failed, updateURL unreachable"]
	}
	// parse remote file contents
	guard
		let remoteParsed = parse(remoteContent),
		let remoteMetadata = remoteParsed["metadata"] as? [String: [String]],
		let remoteVersion = remoteMetadata["version"]?[0]
	else {
		// can't parse editor contents
		return ["error": "Update failed, couldn't parse remote file contents"]
	}
	// check if update is needed
	if version >= remoteVersion {
		return ["info": "No updates found"]
	}
	// at this point it is known an update is available, get new code from downloadURL
	// is there's a specific downloadURL overwrite remoteContents with code from downloadURL
	if updateURL != downloadURL {
		guard let remoteDownloadContent = getRemoteFileContents(downloadURL) else {
			return ["error": "Update failed, downloadURL unreachable"]
		}
		remoteContent = remoteDownloadContent
	}
	return ["content": remoteContent]
}

// background
func nativeChecks() -> [String: String] {
	logger?.info("\(#function, privacy: .public) - started")
	#if os(iOS)
		// check the save location is set
		guard (getSaveLocation() != nil) else {
			logger?.error("\(#function, privacy: .public) - save location unset (iOS)")
			return [
				"error": "Native checks error (0)",
				"saveLocation": "unset",
				"scheme": Bundle.main.infoDictionary?["US_URL_SCHEME"] as! String
			]
		}
	#endif
	// check the default directories
	guard checkDefaultDirectories() else {
		logger?.error("\(#function, privacy: .public) - checkDefaultDirectories failed")
		return ["error": "Native checks error (1)"]
	}
	// check the settings
	guard checkSettings() else {
		logger?.error("\(#function, privacy: .public) - checkSettings failed")
		return ["error": "Native checks error (2)"]
	}
	// get all files to pass as arguments to function below
	guard let allFiles = getAllFiles() else {
		logger?.error("\(#function, privacy: .public) - getAllFiles failed")
		return ["error": "Native checks error (3)"]
	}
	// purge the manifest of old records
	guard purgeManifest(allFiles) else {
		logger?.error("\(#function, privacy: .public) - purgeManifest failed")
		return ["error": "Native checks error (4)"]
	}
	// update matches in manifest
	guard updateManifestMatches(allFiles) else {
		logger?.error("\(#function, privacy: .public) - updateManifestMatches failed")
		return ["error": "Native checks error (5)"]
	}
	// update the required resources
	guard updateManifestRequired(allFiles) else {
		logger?.error("\(#function, privacy: .public) - updateManifestRequired failed")
		return ["error": "Native checks error (6)"]
	}
	// update declarativeNetRequest
	guard updateManifestDeclarativeNetRequests(allFiles) else {
		logger?.error("\(#function, privacy: .public) - updateManifestDeclarativeNetRequests failed")
		return ["error": "Native checks error (7)"]
	}
	// pass some info in response
	logger?.info("\(#function, privacy: .public) - completed")
	return ["success": "Native checks complete"]
}

// userscript install
func installCheck(_ content: String) -> [String: Any] {
	// this func checks a userscript's metadata to determine if it's already installed

	guard let files = getAllFiles() else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return ["error": "installCheck failed at (1)"]
	}

	guard
		let parsed = parse(content),
		let metadata = parsed["metadata"] as? [String: [String]],
		let newName = metadata["name"]?[0]
	else {
		return ["error": "userscript metadata is invalid"]
	}

	// loop through all files nad get their names and filenames
	// we will check the new name/filename to see if this is a unique userscript
	// or if it will overwrite an existing userscript
	var names = [String]()
	for file in files {
		// can be force unwrapped because getAllFiles didn't return nil
		let name = file["name"] as! String

		// populate array
		names.append(name)
	}

	var directive = ""
	#if os(macOS)
		directive = "Click"
	#elseif os(iOS)
		directive = "Tap"
	#endif

	if names.contains(newName) {
		return [
			"success": "\(directive) to re-install",
			"metadata": metadata,
			"installed": true
		]
	}

	return [
		"success": "\(directive) to install",
		"metadata": metadata,
		"installed": false
	];
}

func installUserscript(_ url: String, _ type: String, _ content: String) -> [String: Any] {
	guard
		let parsed = parse(content),
		let metadata = parsed["metadata"] as? [String: [String]],
		let n = metadata["name"]?[0]
	else {
		logger?.error("\(#function, privacy: .public) - failed at (1)")
		return ["error": "installUserscript failed at (1)"]
	}
	let name = sanitize(n)
	let filename = "\(name).user.\(type)"

	let saved = saveFile(["filename": filename, "type": type], content)
	return saved
}
