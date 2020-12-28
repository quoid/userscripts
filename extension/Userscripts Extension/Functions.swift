import Foundation
import SafariServices

// helpers
func getSaveLocation() -> URL? {
    let standardDefaults = UserDefaults.standard
    let userSaveLocationKey = "userSaveLocation"
    var defaultSaveLocation:URL
    
    // get the default save location, if key doesn't exist write it to user defaults
    if let dsl = standardDefaults.url(forKey: "saveLocation") {
        defaultSaveLocation = dsl
    } else {
        NSLog("default save location not set, writing to user defaults")
        let u = getDocumentsDirectory().appendingPathComponent("scripts")
        UserDefaults.standard.set(u, forKey: "saveLocation")
        defaultSaveLocation = u
    }

    // check if sharedBookmark data exists
    // check if can get bookmark URL (won't be able to if directory permanently deleted or in trash)
    guard
        let sharedBookmarkData = UserDefaults(suiteName: SharedDefaults.suiteName)?.data(forKey: SharedDefaults.keyName),
        let sharedBookmark = readBookmark(data: sharedBookmarkData, isSecure: false),
        directoryExists(path: sharedBookmark.path)
    else {
        // sharedBookmark removed, or in trash, use default location and ensure shared will not be used
        UserDefaults(suiteName: SharedDefaults.suiteName)?.removeObject(forKey: SharedDefaults.keyName)
        NSLog("removed sharedbookmark because it was either permanently deleted or exists in trash")
        return defaultSaveLocation
    }

    // at this point, it's known sharedbookmark exists
    // check local bookmark exists, can read url from bookmark, if bookmark url == shared bookmark url
    // no need to check if directoryExists for local bookmark (if local bookmark is exists)
    // can not think of instance where shared bookmark directory exists, yet local bookmark directory does not
    if
        let userSaveLocationData = standardDefaults.data(forKey: userSaveLocationKey),
        let userSaveLocation = readBookmark(data: userSaveLocationData, isSecure: true),
        sharedBookmark == userSaveLocation
    {
        return userSaveLocation
    }
    
    // at this point one of the following conditions met
    // local bookmark data doesn't exist
    // for some reason can't get url from local bookmark data
    // local bookmark url != shared bookmark url (user updated update location)
    // create new local bookmark
    if saveBookmark(url: sharedBookmark, isShared: false, keyName: userSaveLocationKey, isSecure: true) {
        // return newly created local bookmark url
        guard
            let localBookmarkData = standardDefaults.data(forKey: userSaveLocationKey),
            let localBookmarkUrl = readBookmark(data: localBookmarkData, isSecure: true)
        else {
            err("reading after saveBookmark failed in getSaveLocation")
            return nil
        }
        return localBookmarkUrl
    } else {
        err("could not save local version of shared bookmark")
        return nil
    }
}

func getRequireLocation() -> URL {
    return getDocumentsDirectory().appendingPathComponent("require")
}

func closeExtensionHTMLPages() {
    // this function attempts to close all instances of the extension's app page
    // unfortunately there is no good api for managing extension bundled html pages
    // this hack looks at all pages, sees if they are "active", if not, closes them
    // what "active" means in terms of the api is unclear
    // every page that is open and not a top sites page, favorites page or an extension bundled html page will return true
    // this enables differentiation of bundled html pages in a way
    SFSafariApplication.getAllWindows { (windows) in
        for window in windows {
            window.getAllTabs{ (tabs) in
                for tab in tabs {
                    tab.getPagesWithCompletionHandler { (pages) in
                        if pages != nil {
                            for page in pages! {
                                page.getPropertiesWithCompletionHandler({ props in
                                    let isActive = props?.isActive ?? false
                                    if !isActive {
                                        page.getContainingTab(completionHandler: { tab in
                                            tab.close()
                                        })
                                    }
                                })
                            }
                        }
                    }
                }
            }
        }
    }
}

func dateToMilliseconds(_ date: Date) -> Int {
    let since1970 = date.timeIntervalSince1970
    return Int(since1970 * 1000)
}

func santize(_ str: String) -> String? {
    // removes dubious characters from strings (filenames)
    var santized = str
    if santized.first == "." {
        santized = "%2" + str.dropFirst()
    }
    let allowedCharacterSet = (CharacterSet(charactersIn: "/:\\").inverted)
    return santized.addingPercentEncoding(withAllowedCharacters: allowedCharacterSet)
}

func isSanitzed(_ str: String) -> Bool {
    return str.removingPercentEncoding != str
}

func unsanitize(_ str: String) -> String {
    var s = str
    // un-santized name
    if s.hasPrefix("%2") && !s.hasPrefix("%2F") {
        s = "." + s.dropFirst(2)
    }
    if isSanitzed(s) {
        s = s.removingPercentEncoding ?? s
    }
    return s
}

func patternMatch(_ string: String,_ pattern: String) -> Bool {
    let predicate = NSPredicate(format: "self LIKE %@", pattern)
    return !NSArray(object: string).filtered(using: predicate).isEmpty
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

func openSaveLocation() -> Bool {
    guard let saveLocation = getSaveLocation() else {
        return false
    }
    let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { saveLocation.stopAccessingSecurityScopedResource() }
    }
    NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: saveLocation.path)
    return true
}

func openDocumentsDirectory() {
    NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: getDocumentsDirectory().path)
}

// parse
func parse(_ content: String) -> [String: Any]? {
    // returns structured data from content of file
    // will fail to parse if metablock or required @name key missing
    let pattern = #"(?:(\/\/ ==UserScript==\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)|(\/\* ==UserStyle==\r?\n([\S\s]*?)\r?\n==\/UserStyle== \*\/)([\S\s]*))"#
    // force try b/c pattern is known to be valid regex
    let regex = try! NSRegularExpression(pattern: pattern, options: [])
    let range = NSRange(location: 0, length: content.utf16.count)
    // return nil/fail if metablock missing
    guard let match = regex.firstMatch(in: content, options: [], range: range) else {
        return nil
    }
    
    // at this point the text content has passed initial validation, it contains valid metadata
    // the metadata can be in userscript or userstyle format, need to check for this and adjust group numbers
    // rather than being too strict, text content can precede the opening userscript tag, however it will be ignored
    // adjust start index of file content while assigning group numbers to account for any text content preceding opening tag
    let contentStartIndex = content.index(content.startIndex, offsetBy: match.range.lowerBound)
    var g1, g2, g3:Int
    if (content[contentStartIndex..<content.endIndex].starts(with: "//")) {
        g1 = 1; g2 = 2; g3 = 3
    } else {
        g1 = 4; g2 = 5; g3 = 6
    }
    
    // can force unwrap metablock since nil check was done above
    let metablock = content[Range(match.range(at: g1), in: content)!]
    // create var to store separated metadata keys/values
    var metadata = [:] as [String: [String]]
    // iterate through the possible metadata keys in file
    if let metas = Range(match.range(at: g2), in: content) {
        // split metadatas by new line
        let metaArray = content[metas].split(separator: "\n")
        for meta in metaArray {
            let p = #"^(?:[ \t]*(?:\/\/)?[ \t]*@)([\w-]+)[ \t]+([^\s]+[^\r\n\t\v\f]*)"#
            // this pattern checks for specific keys that won't have values
            let p2 = #"^(?:[ \t]*(?:\/\/)?[ \t]*@)(noframes)[ \t]*$"#
            // the individual meta string, ie. // @name File Name
            let metaString = String(meta)
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
        "metablock": metablock,
        "metadata": metadata
    ]
}

// manifest
struct Manifest: Codable {
    var blacklist:[String]
    var disabled:[String]
    var exclude: [String: [String]]
    var match: [String: [String]]
    var require: [String: [String]]
    var settings: [String: String]
    private enum CodingKeys : String, CodingKey {
        case blacklist, disabled, exclude = "exclude-match", match, require, settings
    }
}

let defaultSettings = [
    "autoHint": "true",
    "descriptions": "true",
    "languageCode": Locale.current.languageCode ?? "en",
    "lint": "false",
    "log": "false",
    "sortOrder": "lastModifiedDesc",
    "showInvisibles": "true",
    "tabSize": "4"
]

func getManifestKeys() -> Manifest? {
    let url = getDocumentsDirectory().appendingPathComponent("manifest.json")
    // if manifest doesn't exist, create new one
    if !FileManager.default.fileExists(atPath: url.path) {
        let manifest = Manifest(blacklist: [], disabled: [], exclude: [:], match: [:], require: [:], settings: [:])
        _ = updateManifest(with: manifest)
    }
    guard
        let content = try? String(contentsOf: url, encoding: .utf8),
        let data = content.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(Manifest.self, from: Data(data))
    else {
        // manifest missing, improperly formatted or key missing
        err("failed to read manifest")
        return nil
    }

    return decoded
}

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
        err(error.localizedDescription)
        return false
    }
}

func updateBlacklist(_ patterns: [String]) -> Bool {
    guard var manifestKeys = getManifestKeys() else {
        err("failed to get manifest keys when attempting to update blacklist")
        return false
    }
    manifestKeys.blacklist = patterns
    if updateManifest(with: manifestKeys) == true {
        return true
    }
    return false
}

func toggleFile(_ filename: String,_ action: String) -> Bool {
    guard var manifestKeys = getManifestKeys() else {
        err("failed to get manifest keys when attempting to toggle file")
        return false
    }
    // if file is already disabled or enabled
    if (action == "disable" && manifestKeys.disabled.contains(filename)) ||  (action == "enable" && !manifestKeys.disabled.contains(filename)) {
        return true
    }
    
    // add filename to disabled array
    if (action == "disable") {
        manifestKeys.disabled.append(filename)
    }
    
    // remove filename from disabled array
    if (action == "enable") {
        guard let index = manifestKeys.disabled.firstIndex(of: filename) else {
            err("failed to get file index when attempting to enable file")
            return false
        }
        manifestKeys.disabled.remove(at: index)
    }
    
    // update manifest
    if updateManifest(with: manifestKeys) != true {
        err("failed to \(action) file with name, \(filename)")
        return false
    }
    
    return true
}

func updateExcludesAndMatches(_ filename: String,_ excludePatterns: [String],_ matchPatterns: [String]) -> Bool {
    guard var manifestKeys = getManifestKeys() else {
        err("failed to get manifest keys when attempting to update excludes and matches")
        return false
    }
    
    // will hold the exclude/match patterns in file's metadata
    var patternsInFile = [String]()
    // will hold the exclude/match patterns in manifest that have file name as value
    var patternsInManifestForFile = [String]()
    
    func updatePatternDict(_ manifestExcludesOrMatches: [String: [String]]) -> [String: [String]] {
        // clear at every func run
        patternsInManifestForFile.removeAll()
        // new var from func argument, so it can be manipulated
        var returnDictionary = manifestExcludesOrMatches
        // exclude-match & match keys (url patterns) from manifest
        let keys = returnDictionary.keys
        
        // determine what patterns already have this filename as a value
        for key in keys {
            // key is an array of filenames
            guard let filenames = returnDictionary[key] else {
                err("failed to get values for manifest key, \(key)")
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
        // let common = patternsInFile.filter{patternsInManifestForFile.contains($0)}
        
        // patterns in file metadata, but don't have the filename as a value within the manifest
        // these are the manifest patterns that the filename needs to be added to
        let addFilenameTo = patternsInFile.filter{!patternsInManifestForFile.contains($0)}
        
        // the patterns that have the filename as a value, but not present in file metadata
        // ie. these are the manifest patterns we need to remove the filename from
        let removeFilenameFrom = patternsInManifestForFile.filter{!patternsInFile.contains($0)}
        
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
            if returnDictionary[pattern]!.count < 1 {
                returnDictionary.removeValue(forKey: pattern)
            }
        }
        // clear after every func run
        patternsInFile.removeAll()
        return returnDictionary
    }
    
    // get updated data for exclude-match and match
    patternsInFile = excludePatterns
    manifestKeys.exclude = updatePatternDict(manifestKeys.exclude)
    patternsInFile = matchPatterns
    manifestKeys.match = updatePatternDict(manifestKeys.match)
    
    // save updated data to manifest
    if updateManifest(with: manifestKeys) != true {
        err("failed to update manifest when attempting to update excludes and matches")
        return false
    }
    
    return true
}

func purgeManifest() -> Bool {
    var allSaveLocationFilenames = [String]() // stores the filtered filenames from the save location
    var update = false // determines whether to rewrite manifest
    guard
        var manifestKeys = getManifestKeys(),
        let saveLocation = getSaveLocation()
    else {
        err("failed to get manifest keys or save location when attempting to purge manifest")
        return false
    }
    // security scope
    let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { saveLocation.stopAccessingSecurityScopedResource() }
    }
    guard
        let allFilesUrls = try? FileManager.default.contentsOfDirectory(at: saveLocation, includingPropertiesForKeys: [])
    else {
        err("failed to get all file urls when attempting to purge manifest")
        return false
    }
    
    // populate allSaveLocationFilenames array with files of the correct type in save location
    for fileUrl in allFilesUrls {
        let filename = fileUrl.lastPathComponent
        if (!filename.hasSuffix(".css") && !filename.hasSuffix(".js")) {
            continue
        }
        allSaveLocationFilenames.append(filename)
    }
    
    // iterate through manifest matches
    // if no file exists for value, remove it from manifest
    for (pattern, filenames) in manifestKeys.match {
        for filename in filenames {
            if !allSaveLocationFilenames.contains(filename) {
                if let index = manifestKeys.match[pattern]?.firstIndex(of: filename) {
                    manifestKeys.match[pattern]?.remove(at: index)
                    update = true
                    NSLog("Could not find \(filename) in save location, removed from match pattern - \(pattern)")
                }
            }
        }
        // if there are no more filenames in pattern, remove pattern from manifest
        if let length = manifestKeys.match[pattern]?.count {
            if length < 1, let ind = manifestKeys.match.index(forKey: pattern) {
                manifestKeys.match.remove(at: ind)
                NSLog("No more files for \(pattern) match pattern, removed from manifest")
            }
        }
    }
    // iterate through manifest excludes
    for (pattern, filenames) in manifestKeys.exclude {
        for filename in filenames {
            if !allSaveLocationFilenames.contains(filename) {
                if let index = manifestKeys.exclude[pattern]?.firstIndex(of: filename) {
                    manifestKeys.exclude[pattern]?.remove(at: index)
                    update = true
                    NSLog("Could not find \(filename) in save location, removed from exclude-match pattern - \(pattern)")
                }
            }
            // if there are no more filenames in pattern, remove pattern from manifest
            if let length = manifestKeys.exclude[pattern]?.count {
                if length < 1, let ind = manifestKeys.exclude.index(forKey: pattern) {
                    manifestKeys.exclude.remove(at: ind)
                    NSLog("No more files for \(pattern) exclude-match pattern, removed from manifest")
                }
            }
        }
    }
    // iterate through manifest disabled
    for filename in manifestKeys.disabled {
        if !allSaveLocationFilenames.contains(filename) {
            if let index = manifestKeys.disabled.firstIndex(of: filename) {
                manifestKeys.disabled.remove(at: index)
                update = true
                NSLog("Could not find \(filename) in save location, removed from disabled")
            }
        }
    }
    // remove obsolete settings
    for setting in manifestKeys.settings {
        if !defaultSettings.keys.contains(setting.key) {
            manifestKeys.settings.removeValue(forKey: setting.key)
            update = true
            NSLog("Removed obsolete setting - \(setting.key)")
        }
    }
    // update manifest
    if update, updateManifest(with: manifestKeys) != true {
        err("failed to purge manifest")
        return false
    }
    return true
}

func updateSettings(_ settings: [String: String]) -> Bool {
    guard var manifestKeys = getManifestKeys() else {
        err("failed to get manifest keys when attempting to update settings")
        return false
    }
    manifestKeys.settings = settings
    if updateManifest(with: manifestKeys) != true {
        err("failed to update settings")
        return false
    }
    return true
}

func updateManifestRequires(_ filename: String, _ resources: [String]) -> Bool {
    guard var manifestKeys = getManifestKeys() else {
        return false
    }
    
    // file has no required resources but the key is in manifest
    if resources.count < 1 && manifestKeys.require[filename] != nil, let index = manifestKeys.require.index(forKey: filename) {
        manifestKeys.require.remove(at: index)
        NSLog("No more required resources for \(filename), removed from manifest")
        if updateManifest(with: manifestKeys) {
            return true
        } else {
            return false
        }
    }
    
    // file has required resources
    // santize all resource names
    var r = [String]()
    for resource in resources {
        if let santizedResourceName = santize(resource) {
            r.append(santizedResourceName)
        } else {
            return false
        }
    }
    
    // only write if current manifest differs from resources
    if r.count > 0 && r != manifestKeys.require[filename] {
        manifestKeys.require[filename] = r
        if !updateManifest(with: manifestKeys) {
            return false
        }
    }
    
    return true
}

// init
func getInitData() -> [String: Any]? {
    let defaultSaveLocation = getDocumentsDirectory().appendingPathComponent("scripts")
    let requireLocation = getRequireLocation()
    var update = false // determines whether to rewrite manifest
    guard let saveLocation = getSaveLocation() else {
        err("failed to get save location when attempting to get init data")
        return nil
    }
    
    // check if default save location directory exists, if not create it
    if !FileManager.default.fileExists(atPath: defaultSaveLocation.path) {
        do {
            try FileManager.default.createDirectory(at: defaultSaveLocation, withIntermediateDirectories: false)
        } catch {
            // could not create the save location directory, show error
            err("failed to create save location directory while getting init data")
            return nil
        }
    }
    
    // check if default save location directory exists, if not create it
    if !FileManager.default.fileExists(atPath: requireLocation.path) {
        do {
            try FileManager.default.createDirectory(at: requireLocation, withIntermediateDirectories: false)
        } catch {
            // could not create the save location directory, show error
            err("failed to create save location directory while getting init data")
            return nil
        }
    }
    
    // get manifest data
    var manifestKeys = getManifestKeys()
    // if manifest missing, improperly formatted or key missing it will be nil, create new manifest
    if manifestKeys == nil {
        manifestKeys = Manifest(blacklist: [], disabled: [], exclude: [:], match: [:], require: [:], settings: [:])
        if !updateManifest(with: manifestKeys!) { // force unwrap since it was assigned in above line
            err("manifest had issues that could not be resolved while getting init data")
            return nil
        }
    }
    
    // get settings from manifest
    // can force unwrap all instances of manifestKeys since nil check is done above
    
    // iterate over default settings and individually check if each present
    // missing keys will occur when new settings introduced
    for (key, value) in defaultSettings {
        if manifestKeys!.settings[key] == nil {
            manifestKeys!.settings[key] = value
            update = true
        }
    }
    
    // if flagged, update manifest
    if update, updateManifest(with: manifestKeys!) != true {
        err("failed to update manifest while getting init data")
        return nil
    }
    
    // purge manifest every init, if it fails, log error and continue since failed purges don't break functionality
    if !purgeManifest() {
        err("purge manifest failed while getting init data")
    }
    
    var data:[String: Any] = manifestKeys!.settings
    data["blacklist"] = manifestKeys!.blacklist
    data["saveLocation"] = saveLocation.path
    data["version"] = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
    
    return data
}

// files
func getAllFilesData() -> [[String: Any]]? {
    var files = [[String: Any]]() // this will be returned
    let fm = FileManager.default
    guard let saveLocation = getSaveLocation() else {
        err("failed to get save location when attempting to get all files data")
        return nil
    }
    guard  let manifestKeys = getManifestKeys() else {
        err("failed to get manifest keys when attempting to get all files data")
        return nil
    }
    // security scope
    let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { saveLocation.stopAccessingSecurityScopedResource() }
    }
    // get all file urls within directory
    guard let urls = try? fm.contentsOfDirectory(at: saveLocation, includingPropertiesForKeys: [])  else {
        err("couldn't read directory contents")
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
            NSLog("ignoring \(filename), file missing or metadata missing from file contents")
            continue
        }
        fileData["canUpdate"] = false
        fileData["content"] = content
        fileData["disabled"] = false
        fileData["filename"] = filename
        fileData["lastModified"] = dateToMilliseconds(dateMod)
        fileData["name"] =  metadata["name"]![0] // can force, parser ensures name exists
        fileData["type"] = type
        if metadata["version"] != nil && metadata["updateURL"] != nil {
            fileData["canUpdate"] = true
        }
        if metadata["description"] != nil {
            fileData["description"] = metadata["description"]![0] // can force
        }
        if manifestKeys.disabled.contains(filename) {
            fileData["disabled"] = true
        }
        // update excludes & matches
        var excluded = [String]()
        var matched = [String]()
        if metadata["exclude-match"] != nil {
            excluded.append(contentsOf: metadata["exclude-match"]!)
        }
        if metadata["match"] != nil {
            matched.append(contentsOf: metadata["match"]!)
        }
        // check for legacy include & exclude
        if metadata["include"] != nil {
            matched.append(contentsOf: metadata["include"]!)
        }
        if metadata["exclude"] != nil {
            excluded.append(contentsOf: metadata["exclude"]!)
        }
        if !updateExcludesAndMatches(filename, excluded, matched) {
            err("error updating excludes & matches while getting all files data")
        }
        
        // check for require keys, run even if metadata["require"] is nil to remove stale required resources
        let required = metadata["require"] ?? []
        if !getRequiredCode(filename, required, "\(type)") {
            err("error updating required resources while getting all files data")
        }
        
        files.append(fileData)
    }
    return files
}

func getFileContentsParsed(_ url: URL) -> [String: Any]? {
    guard let saveLocation = getSaveLocation() else {
        err("failed to get savelocation in getFileContents")
        return nil
    }
    // security scope
    let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { saveLocation.stopAccessingSecurityScopedResource() }
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

func saveFile(_ data: [String: Any]) -> [String: Any] {
    // lots of unique guard statements to try to better track down failures when they occur
    guard let saveLocation = getSaveLocation() else {
        return ["error": "failed to get save location when attempting to save"]
    }
    guard
        let newContent = data["new"] as? String,
        let current = data["current"] as? [String: Any],
        let oldFilename = current["filename"] as? String,
        let type = current["type"] as? String
    else {
        err("invalid save object")
        return ["error": "invalid argument in save function"]
    }
    guard
        let parsed = parse(newContent),
        let metadata = parsed["metadata"] as? [String: [String]],
        let n = metadata["name"]?[0],
        var name = santize(n)
    else {
        return ["error": "failed to parse argument in save function"]
    }
    
    // construct new file name
    let newFilename = "\(name).\(type)"
    
    // security scope
    let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { saveLocation.stopAccessingSecurityScopedResource() }
    }
    guard
        let allFilesUrls = try? FileManager.default.contentsOfDirectory(at: saveLocation, includingPropertiesForKeys: [])
    else {
        return ["error": "failed to read save urls in save function"]
    }
    
    // validate file before save
    var allFilenames:[String] = [] // stores the indv. filenames for later comparison
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
    
    if allFilenames.contains(newFilename.lowercased()) || newFilename.count > 250 {
        // filename taken or too long
        return ["error": "filename validation failed in save function"]
    }
    
    // file passed validation

    // check for require keys
    let required = metadata["require"] ?? []
    if !getRequiredCode(newFilename, required, type) {
        return ["error": "failed to get required resources"]
    }

    // attempt to save to disk
    let newFileUrl = saveLocation.appendingPathComponent(newFilename)
    do {
        try newContent.write(to: newFileUrl, atomically: false, encoding: .utf8)
    } catch {
        return ["error": "failed to write file to disk"]
    }
    
    // saved to disk successfully
    
    // get the file last modified date
    guard
        let dateMod = try? FileManager.default.attributesOfItem(atPath: newFileUrl.path)[.modificationDate] as? Date
    else {
        return ["error": "failed to read modified date in save function"]
    }
    
    // remove old file if it exists and manifest records for old file if they exist
    if oldFilename != newFilename {
        // if user changed the filename, remove file with old filename
        let oldFileUrl = saveLocation.appendingPathComponent(oldFilename)
        // however, when creating a new file, if user changes the temp given name by app...
        // oldFilename (the temp name in activeItem) and newFilename (@name in file contents) will differ
        // the file with oldFilename will not be on the filesystem and can not be deleted
        // for that edge case, using try? rather than try(!) to allow failures
        try? FileManager.default.trashItem(at: oldFileUrl, resultingItemURL: nil)
        
        // updateExcludesAndMatches for old file
        _ = updateExcludesAndMatches(oldFilename, [], [])
    }
    
    // update new excludes and matches for new file
    var excludes = metadata["exclude-match"] ?? []
    var matches = metadata["match"] ?? []
    // check for legacy include & exclude
    let includeLegacy = metadata["include"] ?? []
    let excludeLegacy = metadata["exclude"] ?? []
    matches.append(contentsOf: includeLegacy)
    excludes.append(contentsOf: excludeLegacy)
    _ = updateExcludesAndMatches(newFilename, excludes, matches)
    
    // un-santized name
    name = unsanitize(name)
    
    var response = [String: Any]()
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
    return response
}

func trashFile(_ filename: String) -> Bool {
    // remove file from manifest
    guard
        toggleFile(filename, "enable"),
        updateExcludesAndMatches(filename, [], []),
        let saveLocation = getSaveLocation()
    else {
        err("failed to remove script from manifest or get save location")
        return false
    }
    // security scope
    let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { saveLocation.stopAccessingSecurityScopedResource() }
    }
    let url = saveLocation.appendingPathComponent(filename)
    // if file is already removed from path, assume it was removed by user and return true
    if (FileManager.default.fileExists(atPath: url.path)) {
        do {
            try FileManager.default.trashItem(at: url, resultingItemURL: nil)
        } catch {
            err(error.localizedDescription)
            return false
        }
    }
    return true
}

func getRequiredCode(_ filename: String, _ resources: [String], _ fileType: String) -> Bool {
    let directory = getRequireLocation().appendingPathComponent(filename)
    
    // if file requires no resource but directory exists, trash it
    if resources.count < 1 && FileManager.default.fileExists(atPath: directory.path) {
        do {
            try FileManager.default.trashItem(at: directory, resultingItemURL: nil)
        } catch {
            // failing to trash item won't break functonality, so log error and move on
            err(error.localizedDescription)
            return true
        }
    }
    
    for resourceURLString in resources {
        // skip invalid urls or urls pointing to files of different types
        if let url = URL(string: resourceURLString), url.path.hasSuffix(fileType) {
            guard let resourceFilename = santize(resourceURLString) else {
                return false
            }
            let fileURL = directory.appendingPathComponent(resourceFilename)
            var contents = ""
            // only attempt to get resource if it does not yet exist
            if FileManager.default.fileExists(atPath: fileURL.path) {
                continue
            }
            
            // get remote file contents, synchronously
            let semaphore = DispatchSemaphore(value: 0)
            var task: URLSessionDataTask?
            task = URLSession.shared.dataTask(with: url) { data, response, error in
                if let r = response as? HTTPURLResponse, data != nil, error == nil {
                    if r.statusCode == 200 {
                        contents = String(data: data!, encoding: .utf8) ?? ""
                    }
                }
                semaphore.signal()
            }
            task?.resume()
            // wait 10 seconds before timing out
            if semaphore.wait(timeout: .now() + 10) == .timedOut {
                task?.cancel()
            }
            
            // if we made it to this point and contents is still an empty string, something went wrong with the request
            if contents.count < 1 {
                continue
            }
            
            // check if file specific folder exists at requires directory
            if !FileManager.default.fileExists(atPath: directory.path) {
                guard ((try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)) != nil) else {
                    return false
                }
            }
            
            guard ((try? contents.write(to: fileURL, atomically: false, encoding: .utf8)) != nil) else {
                return false
            }
        }
    }
    
    // remove unused files, if any exist
    var all = [String]()
    if let allResourceFilenamesSaved = try? FileManager.default.contentsOfDirectory(atPath: directory.path) {
        for savedResourceFilename in allResourceFilenamesSaved {
            if !resources.contains(unsanitize(savedResourceFilename)) {
                try? FileManager.default.trashItem(at: directory.appendingPathComponent(savedResourceFilename), resultingItemURL: nil)
            } else {
                all.append(savedResourceFilename)
            }
        }
    }

    if !updateManifestRequires(filename, all) {
        return false
    }
    
    return true
}

// injection
func getCode(_ url: String, _ isTop: Bool) -> [String: [String: [String: Any]]]? {
    var allFiles = [String: [String: [String: Any]]]() // will be returned
    
    // there has to be a better way to do this
    
    // dictionary to hold the indiv. css files that will be loaded
    // ["file.css": ["code": "/* code here */", "weight": "1"]]
    var cssFiles = [String:[String:String]]()
    
    // dictionary to hold the indiv. js files that will be loaded
    // ["scope": ["timing": ["file.js": ["code": "// code", "weight": "1"]]]]
    var jsFiles = [String: [String: [String: [String: String]]]]()
    jsFiles["auto"] = ["document-start": [:], "document-end": [:], "document-idle": [:]]
    jsFiles["content"] = ["document-start": [:], "document-end": [:], "document-idle": [:]]
    jsFiles["page"] = ["document-start": [:], "document-end": [:], "document-idle": [:]]
    
    var auto_docStart = [String: [String: String]]()
    var auto_docEnd = [String: [String: String]]()
    var auto_docIdle = [String: [String: String]]()
    var content_docStart = [String: [String: String]]()
    var content_docEnd = [String: [String: String]]()
    var content_docIdle = [String: [String: String]]()
    var page_docStart = [String: [String: String]]()
    var page_docEnd = [String: [String: String]]()
    var page_docIdle = [String: [String: String]]()
    
    // domains where loading is excluded for file
    var excludedFilenames:[String] = []
    
    // when code is loaded from a file, it's filename will be populated in the below array, to avoid duplication
    var matchedFilenames:[String] = []
    
    // get the manifest data
    guard let manifestKeys = getManifestKeys() else {
        err("could not read manifest when attempting to get code for injection")
        return nil
    }
    
    // url matches a pattern in blacklist, return empty dict
    for pattern in manifestKeys.blacklist {
        if patternMatch(url, pattern) {
            return allFiles
        }
    }
    
    // AT THIS POINT IT IS KNOWN THAT THE URL IS NOT IN THE BLACKLIST, PROCEED

    // all exclude patterns from manifest
    let excludePatterns = manifestKeys.exclude.keys
    
    // all match patterns from manifest
    let matchPatterns = manifestKeys.match.keys
    
    // add disabled script filenames to excludePatterns
    excludedFilenames.append(contentsOf: manifestKeys.disabled)
    
    // loop through exclude patterns and see if any match against page url
    for pattern in excludePatterns {
        // if pattern matches page url, add filenames from page url to excludes array, code from those filenames won't be loaded
        if patternMatch(url, pattern) {
            guard let filenames = manifestKeys.exclude[pattern] else {
                err("error parsing manifest.keys when attempting to get code for injected script")
                continue
            }
            for filename in filenames {
                if !excludedFilenames.contains(filename) {
                    excludedFilenames.append(filename)
                }
            }
        }
    }
    
    // loop through all match patterns from manifest to see if they match against the current page url (func arg)
    for pattern in matchPatterns {
        if patternMatch(url, pattern) {
            // the filenames listed for the pattern that match page url
            guard let filenames = manifestKeys.match[pattern] else {
                err("error parsing manifestKets.match when attempting to get code for injected script")
                continue
            }
            // loop through matched filenames and get corresponding code from file
            for filename in filenames {
                // don't load if filename is in excludes or filename already exists in matchedFilenames array (to avoid duplication)
                if !excludedFilenames.contains(filename) && !matchedFilenames.contains(filename) {
                    // if guards fail, log error continue to next file
                    guard
                        // NOTE: getFileContents returns parsed script metadata
                        let saveLocation = getSaveLocation(),
                        let contents = getFileContentsParsed(saveLocation.appendingPathComponent(filename)),
                        var code = contents["code"] as? String,
                        let type = filename.split(separator: ".").last
                    else {
                        err("could not get file contents for \(filename)")
                        continue
                    }
                    
                    // can force unwrap b/c getFileContentsParsed ensures metadata exists
                    let metadata = contents["metadata"] as! [String: [String]]
                    
                    // if metadata has noframes option and the url is not the top window, don't load
                    if (metadata["noframes"] != nil && !isTop) {
                        continue
                    }
                    
                    // normalize weight
                    var weight = metadata["weight"]?[0] ?? "1"
                    weight = normalizeWeight(weight)
                    
                    // attempt to get require resource from disk
                    // if required resource is inaccessible, silently fail and continue
                    if let required = metadata["require"] {
                        for require in required {
                            let sanitizedName = santize(require) ?? ""
                            let requiredFileURL = getRequireLocation().appendingPathComponent(filename).appendingPathComponent(sanitizedName)
                            if let requiredContent = try? String(contentsOf: requiredFileURL, encoding: .utf8) {
                                code = "\(requiredContent)\n\(code)"
                            } else {
                                err("could not get required resource from disk \(requiredFileURL)")
                            }
                        }
                    }
                    
                    if type == "css" {
                        cssFiles[filename] = ["code": code, "weight": weight]
                    } else if type == "js" {
                        var injectInto = metadata["inject-into"]?[0] ?? "page"
                        var runAt = metadata["run-at"]?[0] ?? "document-end"
                        
                        // ensure values are acceptable
                        let injectVals = ["auto", "content", "page"]
                        let runAtVals = ["document-start", "document-end", "document-idle"]
                        if !injectVals.contains(injectInto) {
                            injectInto = "page"
                        }
                        if !runAtVals.contains(runAt) {
                            runAt = "document-end"
                        }
                        
                        let data = ["code": code, "weight": weight]
                        // add file data to appropiate dict
                        if injectInto == "auto" && runAt == "document-start" {
                            auto_docStart[filename] = data
                        } else if injectInto == "auto" && runAt == "document-end" {
                            auto_docEnd[filename] = data
                        } else if injectInto == "auto" && runAt == "document-idle" {
                            auto_docIdle[filename] = data
                        } else if injectInto == "content" && runAt == "document-start" {
                            content_docStart[filename] = data
                        } else if injectInto == "content" && runAt == "document-end" {
                            content_docEnd[filename] = data
                        } else if injectInto == "content" && runAt == "document-idle" {
                            content_docIdle[filename] = data
                        } else if injectInto == "page" && runAt == "document-start" {
                            page_docStart[filename] = data
                        } else if injectInto == "page" && runAt == "document-end" {
                            page_docEnd[filename] = data
                        } else if injectInto == "page" && runAt == "document-idle" {
                            page_docIdle[filename] = data
                        }
                    }
                }
                matchedFilenames.append(filename)
            }
        }
    }
    
    // construct the js specific dictionaries
    jsFiles["auto"]!["document-start"] = auto_docStart
    jsFiles["auto"]!["document-end"] = auto_docEnd
    jsFiles["auto"]!["document-idle"] = auto_docIdle
    jsFiles["content"]!["document-start"] = content_docStart
    jsFiles["content"]!["document-end"] = content_docEnd
    jsFiles["content"]!["document-idle"] = content_docIdle
    jsFiles["page"]!["document-start"] = page_docStart
    jsFiles["page"]!["document-end"] = page_docEnd
    jsFiles["page"]!["document-idle"] = page_docIdle
    
    // construct the returned dictionary
    allFiles["css"] = cssFiles
    allFiles["js"] = jsFiles
    
    return allFiles
}
