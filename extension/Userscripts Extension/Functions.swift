import Foundation
import SafariServices

// helpers
func getSaveLocation() -> URL? {
    let standardDefaults = UserDefaults.standard
    let userSaveLocationKey = "userSaveLocation"
    // get the default save location
    guard let defaultSaveLocation = standardDefaults.url(forKey: "saveLocation") else {
        err("could not get the default saveLocation in getSaveLocation")
        return nil
    }
    // check if sharedBookmark data exists
    // check if can get bookmark URL (won't be able to if directory permanently deleted)
    // check if bookmark directory is in trash
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
        print("local bookmark same as shared, return local")
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

func patternMatch(_ string: String,_ pattern: String) -> Bool {
    let predicate = NSPredicate(format: "self LIKE %@", pattern)
    return !NSArray(object: string).filtered(using: predicate).isEmpty
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

func sendMessageToAllPages(withName: String, userInfo: [String: Any]?) {
    SFSafariApplication.getAllWindows { (windows) in
        for window in windows {
            window.getAllTabs{ (tabs) in
                for tab in tabs {
                    tab.getPagesWithCompletionHandler { (pages) in
                        if pages != nil {
                            for page in pages! {
                                page.dispatchMessageToScript(withName: withName, userInfo: userInfo)
                            }
                        }
                    }
                }
            }
        }
    }
}

// parser
func parse(content: String) -> [String: Any]? {
    // returns structured datat from content of script file
    // will fail to parse if metablock or required @name key missing
    let pattern = #"\B(?:(\/\/ ==UserScript==\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)|(\/\* ==UserStyle==\r?\n([\S\s]*?)\r?\n==\/UserStyle== \*\/)([\S\s]*))"#
    // force try b/c pattern is known to be valid regex
    let regex = try! NSRegularExpression(pattern: pattern, options: [])
    let range = NSRange(location: 0, length: content.utf16.count)
    // return nil/fail if metablock missing
    guard
        let match = regex.firstMatch(in: content, options: [], range: range)
    else {
        err("metablock missing or improperly formatted, failed to parse")
        return nil
    }
    
    // check whether metablock for UserScript or UserStyle format, change group numbers as needed
    var g1, g2, g3:Int
    if (content.starts(with: "//")) {
        g1 = 1; g2 = 2; g3 = 3
    } else {
        g1 = 4; g2 = 5; g3 = 6
    }
    
    // can force unwrap metablock since nil check was done above
    let metablock = content[Range(match.range(at: g1), in: content)!]
    // create var to store separated metadata keys/values
    var metadata = [:] as [String: [String]]
    // iterate through the possible metadata keys in script file
    if let metas = Range(match.range(at: g2), in: content) {
        // split metadatas by new line
        let metaArray = content[metas].split(separator: "\n")
        for meta in metaArray {
            let p = #"@([\w-]+)[ \t]+([^\s]+[^\r\n\t\v\f]*)"#
            // the individual meta string, ie. // @name Script Name
            let metaString = String(meta)
            // force try b/c pattern is known to be valid regex
            let re = try! NSRegularExpression(pattern: p, options: [])
            let range = NSRange(location: 0, length: metaString.utf16.count)
            // key lines not properly prefixed & without values will be skipped
            if let m = re.firstMatch(in: metaString, options: [], range: range) {
                // force unwrap key & value since matches regex above
                let key = metaString[Range(m.range(at: 1), in: metaString)!]
                let value = metaString[Range(m.range(at: 2), in: metaString)!]
                if metadata[String(key)] != nil {
                    metadata[String(key)] = metadata[String(key)]
                } else {
                    metadata[String(key)] = []
                }
                metadata[String(key)]?.append(String(value))
            }
        }
    }
    // return nil/fail if @name key is missing or @name has no value
    if metadata["name"] == nil {
        err("@name metadata key missing or without value, failed to parse")
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

// settings
func getSettings() -> [String: String]? {
    let defaults = UserDefaults.standard
    var settings: [String: String] = [:]
    let fm = FileManager.default
    let defaultSaveLocation = getDocumentsDirectory().appendingPathComponent("scripts")
    let defaultSettings: [String: String] = [
        "autoShowHints": "true",
        "hideDescriptions": "false",
        "lint": "false",
        "saveLocation": defaultSaveLocation.path,
        "showInvisibles": "true",
        "tabSize": "4",
        "verbose": "false"
    ]
    // iterate over default settings and individually check if each present
    // if not, save the default value in UserDefaults
    // add setting from UserDefaults to settings dict to be returned
    for (key, value) in defaultSettings {
        if defaults.object(forKey: key) == nil {
            // setting not present, save default value to UserDefaults
            defaults.set(value, forKey: key)
        }
        // add key & value from UserDefaults to setting dict
        settings[key] = defaults.string(forKey: key)
    }
    // check that defaultSaveLocation folder exists, if not, create it
    if !fm.fileExists(atPath: defaultSaveLocation.path) {
        do {
            try fm.createDirectory(at: defaultSaveLocation, withIntermediateDirectories: false)
        } catch {
            // could not create the save location directory, show error
            err("failed to create save location folder when getting settings")
            return nil
        }
    }
    // check if the user changed the defaultSaveLocation if so return that path instead
    if let actualSaveLocation = getSaveLocation() {
        settings["saveLocation"] = actualSaveLocation.path
    }
    return settings
}

func updateSetting(_ key: String,_ value: String) -> Bool {
    // if the key does not exist
    if UserDefaults.standard.string(forKey: key) == nil {
        err("\(key) does not exist, failed to update setting")
        return false
    }
    UserDefaults.standard.set(value, forKey: key)
    return true
}

func getInitData() -> [String: Any]? {
    guard let initData = getSettings() else {
        err("could not get settings for init data func")
        return nil
    }
    // create new dict to return
    var returnData:[String: Any] = initData
    // get language code
    let language = Locale.current.languageCode ?? "en"
    returnData["languageCode"] = language
    // check manifest is valid by getting any key, get blacklist
    var blacklist:[String] = []
    if let bl = getManifestKey("blacklist") as? [String] {
        blacklist = bl
    } else {
        let manifest = Manifest(blacklist: [], disabled: [], exclude: [:], match: [:])
        if updateManifest(with: manifest) != true {
            err("failed fix manifest issue when getting init data")
            return nil
        }
    }
    returnData["blacklist"] = blacklist
    returnData["version"] = Bundle.main.infoDictionary!["CFBundleShortVersionString"] as! String
    return returnData
}

// manifest
struct Manifest: Codable {
    var blacklist:[String]
    var disabled:[String]
    var exclude: [String:[String]]
    var match: [String:[String]]
    private enum CodingKeys : String, CodingKey {
        case blacklist, disabled, exclude = "exclude-match", match
    }
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

func getManifestKey(_ key: String) -> Any? {
    // gets the value of a key stored in the manifest file
    // can also be used to validate the manifest file
    // will return nil if:
    // manifest missing, json improperly formatted or manifest missing keys
    let url = getDocumentsDirectory().appendingPathComponent("manifest.json")
    guard
        let content = try? String(contentsOf: url, encoding: .utf8),
        let data = content.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(Manifest.self, from: Data(data))
    else {
        // manifest missing, improperly formatted or required key missing
        err("failed to read manifest")
        return nil
    }
    if key == "blacklist" {
        return decoded.blacklist
    } else if key == "disabled" {
        return decoded.disabled
    } else if (key == "exclude" || key == "exclude-match") {
        return decoded.exclude
    } else if key == "match" {
        return decoded.match
    } else {
        err("key not present in manifest - \(key)")
        return nil
    }
}

func updateExcludesAndMatches(_ filename: String,_ exclude: [String],_ match: [String]) -> Bool {
    // arguments = the script's filename, script's exclude-match patterns, script's match patterns

    // get the manifest's current key values
    guard
        let blacklist = getManifestKey("blacklist") as? [String],
        let disabled = getManifestKey("disabled") as? [String],
        var manifestExclude = getManifestKey("exclude") as? [String: [String]],
        var manifestMatch = getManifestKey("match") as? [String: [String]]
    else {
        err("failed to get manifest keys when attempting to update excludes and matches")
        return false
    }
    
    // will hold the exclude/match patterns in script's metadata
    var patternsInScript: [String] = []
    
    // will hold the exclude/match patterns in manifest that have script name as value
    var patternsInManifestForScript: [String] = []
    
    func updatePatternDict(_ manifestDict: [String: [String]]) -> [String: [String]] {
        // func arguments should be current exclude-match or match dictionary from manifest
        // returns updated dictionary to be saved to manifest
        
        // clear at every func run
        patternsInManifestForScript.removeAll()
        
        // new var from func argument, so it can be manipulated
        var returnDict = manifestDict
        
        // exclude-match & match keys (url patterns) from manifest
        let keys = returnDict.keys
        
        // determine what patterns already have this script as a value
        for key in keys {
            // key is an array of filenames
            guard let filenames = returnDict[key] else {
                err("failed to get values for manifest key, \(key)")
                continue
            }
            // name is a single filename
            for name in filenames {
                // if name is same as script filename, script already added for this pattern
                // add it to patternsInManifestForScript for later comparison
                if name == filename {
                    patternsInManifestForScript.append(key)
                }
            }
        }
        
        // patterns in script metadata and patterns in manifest that have script filename as a value
        // script filename already present in manifest for these patterns, do nothing with these
        // let common = scriptMatchPatterns.filter{ existsInManifest.contains($0) }
        
        // patterns in script metadata, but don't have the script filename as a value within the manifest
        // these are the manifest patterns that the script filename needs to be added to
        let addScriptTo = patternsInScript.filter{ !patternsInManifestForScript.contains($0) }
        
        // the patterns that have the script filename as a value, but not present in script metadata
        // ie. these are the manifest patterns we need to remove the script filename from
        let removeScriptFrom = patternsInManifestForScript.filter{ !patternsInScript.contains($0) }
        
        // check if script filename needs to be appended or new key/val needs to be created
        for pattern in addScriptTo {
            if returnDict[pattern] != nil {
                returnDict[pattern]?.append(filename)
            } else {
                 returnDict[pattern] = [filename]
            }
        }
        
        for pattern in removeScriptFrom {
            // get the index of the script filename within the array
            let ind = returnDict[pattern]?.firstIndex(of: filename)
            // remove script filename from array by index
            returnDict[pattern]?.remove(at: ind!)
            // if script filename was the last item in array, remove the url pattern from dictionary
            if returnDict[pattern]!.count < 1 {
                returnDict.removeValue(forKey: pattern)
            }
        }
        
        // clear after every func run
        patternsInScript.removeAll()
        return returnDict
    }
    
    // get updated data for exclude-match and match
    patternsInScript = exclude
    manifestExclude = updatePatternDict(manifestExclude)
    patternsInScript = match
    manifestMatch = updatePatternDict(manifestMatch)
    
    // save updated data to manifest
    let manifest = Manifest(blacklist: blacklist, disabled: disabled, exclude: manifestExclude, match: manifestMatch)
    if updateManifest(with: manifest) != true {
        err("failed to update manifest when attempting to update excludes and matches")
        return false
    }
    
    return true
}

func toggleScript(_ type: String,_ scriptName: String) -> Bool {
    // get manifest data
    guard
        let blacklist = getManifestKey("blacklist") as? [String],
        var disabled = getManifestKey("disabled") as? [String],
        let excluded = getManifestKey("exclude") as? [String: [String]],
        let match = getManifestKey("match") as? [String: [String]]
    else {
        err("failed to get manifest keys when attempting to toggle script")
        return false
    }
    
    // if script is already disabled/enabled
    if (type == "disable" && disabled.contains(scriptName))
        ||  (type == "enable" && !disabled.contains(scriptName))
    {
        return true
    }
    
    // add script name to disabled array
    if (type == "disable") {
        disabled.append(scriptName)
    }
    
    // remove script name from disabled array
    if (type == "enable") {
        guard let index = disabled.firstIndex(of: scriptName) else {
            err("failed to get script index when attempting to enable script")
            return false
        }
        disabled.remove(at: index)
    }
    
    let manifest = Manifest(blacklist: blacklist, disabled: disabled, exclude: excluded, match: match)
    if updateManifest(with: manifest) == true {
        return true
    }
    
    err("failed to \(type) script with filename, \(scriptName)")
    return false
}

func updateBlacklist(_ patterns: [String]) -> Bool {
    guard
        let disabled = getManifestKey("disabled") as? [String],
        let excluded = getManifestKey("exclude") as? [String: [String]],
        let match = getManifestKey("match") as? [String: [String]]
    else {
        err("failed to get manifest keys when attempting to update blacklist")
        return false
    }
    let manifest = Manifest(blacklist: patterns, disabled: disabled, exclude: excluded, match: match)
    if updateManifest(with: manifest) == true {
        return true
    }
    return false
}

// scripts loading
func getFileContents(_ url: URL) -> Any? {
    // function argument takes a url for a single file or directory of files
    // returns the contents of single file or all files within directory
    let fm = FileManager.default
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = .medium
    dateFormatter.timeStyle = .short
    // this array holds all urls of files that will have their contents read
    var urls:[URL] = []
    // this array will be returned if successful, if url arg issingle file, return only first index
    var fileContents: [[String: Any]] = []
    // get the saveLocation to access security scope if needed
    guard let securityScope = getSaveLocation() else {
        err("failed to get savelocation for security scope in getFileContents")
        return nil
    }
    // secrutiy scope
    let didStartAccessing = securityScope.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { securityScope.stopAccessingSecurityScopedResource() }
    }
    // check that url is a valid path to a directory or single file
    guard fm.fileExists(atPath: url.path) else {
        err("could not get file contents, no directory or file exists at path, \(url.path)")
        return nil
    }
    // check if url is to a directory or single file
    let isDirectory = (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
    if isDirectory {
        // get all file urls within directory
        guard let dirUrls = try? fm.contentsOfDirectory(at: url, includingPropertiesForKeys: [])  else {
            err("couldn't read directory contents")
            return nil
        }
        // set urls array to dirUrls array
        urls = dirUrls
    } else {
        // url is a single, add the file url to the urls array
        urls.append(url)
    }
    // loop through all urls in the urls array
    for url in urls {
        // only read contents for css & js files
        let filename = url.lastPathComponent
        if (!filename.hasSuffix(".css") && !filename.hasSuffix(".js")) {
            continue
        }
        // file will be skipped if metablock is missing
        guard
            let content = try? String(contentsOf: url, encoding: .utf8),
            let dateMod = try? fm.attributesOfItem(atPath: url.path)[.modificationDate] as? Date,
            var parsed = parse(content: content),
            let type = filename.split(separator: ".").last
        else {
            err("ignoring \(filename), metadata missing from file contents")
            continue
        }
        parsed["lastModified"] = dateFormatter.string(from: dateMod)
        parsed["lastModifiedMS"] = String(dateToMilliseconds(dateMod))
        parsed["filename"] = filename
        parsed["type"] = String(type)
        fileContents.append(parsed)
    }
    if isDirectory {
        return fileContents
    } else {
        return fileContents[0]
    }
}

func updateScriptsData() -> [[String: Any]]? {
    // returns description, disabled, filename, name, type
    guard let url = getSaveLocation() else {
        err("failed to get save location in func updateScriptsData")
        return nil
    }
    var allScriptsData: [[String: Any]] = []
    guard
        let dataArray = getFileContents(url) as? [[String: Any]],
        let disabledScripts = getManifestKey("disabled") as? [String]
    else {
        err("failed to get file contents or manifest in func updateScriptsData")
        return nil
    }
    for data in dataArray {
        var scriptData: [String: Any] = [:]
        // can force unwrap because getFileContents adds filename
        let filename = data["filename"] as! String
        // can force unwrap b/c getFileContents ensure metadata exists
        let metadata = data["metadata"] as! [String: [String]]
        scriptData["disabled"] = false
        scriptData["filename"] = filename
        // can force unwrap b/c parser ensures name exists
        scriptData["name"] = metadata["name"]![0]
        scriptData["type"] = data["type"]
        scriptData["lastModifiedMS"] = data["lastModifiedMS"]
        // check if script has a description
        if metadata["description"] != nil {
            // can force unwrap b/c already checked description is not nil
            scriptData["description"] = metadata["description"]![0]
        }
        if disabledScripts.contains(filename) {
            scriptData["disabled"] = true
        }
        // update excludes & matches
        var excluded:[String] = []
        var matched:[String] = []
        if metadata["exclude-match"] != nil {
            // can force unwrap b/c already checked exclude-match is not nil
            excluded = metadata["exclude-match"]!
        }
        if metadata["match"] != nil {
            // can force unwrap b/c already checked match is not nil
            matched = metadata["match"]!
        }
        // check for legacy include & exclude
        if metadata["include"] != nil {
            // can force unwrap b/c already checked match is not nil
            matched.append(contentsOf: metadata["include"]!)
        }
        if metadata["exclude"] != nil {
            // can force unwrap b/c already checked match is not nil
            excluded.append(contentsOf: metadata["exclude"]!)
        }
        if !updateExcludesAndMatches(filename, excluded, matched) {
            err("error updating matches in func updateScriptsData")
        }
        allScriptsData.append(scriptData)
    }
    return allScriptsData
}

func loadScriptData(_ filename: String) -> [String: String]? {
    // returns content, filename, lastModified (string date), name, type
    guard let saveLocation = getSaveLocation() else {
        err("failed to get save location in func loadScriptData")
        return nil
    }
    let url = saveLocation.appendingPathComponent(filename)
    var scriptData:[String: String] = [:]
    guard
        let fileContents = getFileContents(url) as? [String: Any],
        let content = fileContents["content"] as? String,
        let lastModified = fileContents["lastModified"] as? String,
        let metadata = fileContents["metadata"] as? [String: [String]],
        let name = metadata["name"]?[0],
        let type = fileContents["type"] as? String
    else {
        err("failed to get or properly parse file contents in func loadScriptData")
        return nil
    }
    scriptData["content"] = content
    scriptData["filename"] = filename
    scriptData["lastModified"] = lastModified
    scriptData["name"] = name
    scriptData["type"] = type
    return scriptData
}

// scripts saving
func validateScript(_ oldName: String,_ newName: String,_ type: String,_ allUrls: [URL]) -> Bool {
    // validates filenames for naming conflicts and length
    
    // will hold filenames for all scripts currently in saved location
    var allFilenames:[String] = []
    
    // if the old filename and new filename are the same, it's ok to save (overwrite)
    if oldName.lowercased() == newName.lowercased() {
        return true
    }
    
    // loop through all the file urls in the save location
    for fileUrl in allUrls {
        // skip file if it is not of the proper type
        let filename = fileUrl.lastPathComponent
        if (!filename.hasSuffix(type)) {
            continue
        }
        // if file is of the proper type, add it to the allFilenames array
        allFilenames.append(filename.lowercased())
    }
    
    // if there is already a different file with the new filename, do not validate
    if allFilenames.contains(newName.lowercased()) {
        return false
    }
    
    // if filename is longer than what is allow in macOS
    if newName.count > 250 {
        return false
    }
    return true
}

func saveScriptFile(_ scriptData: [String: String]) -> [String: String]? {
    // func arg should be dict containing script file contents, type and filename (id)
    
    // this will be returned
    var response:[String: String] = [:]
    
    // get the scripts save locations
    let fm = FileManager.default
    guard let url = getSaveLocation() else {
        err("failed to get save location when attempting to save script file")
        return nil
    }
    // secrutiy scope
    let didStartAccessing = url.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { url.stopAccessingSecurityScopedResource() }
    }
    // get script data and parse script content
    guard
        let content = scriptData["content"],
        let oldFilename = scriptData["id"],
        let type = scriptData["type"],
        let parsed = parse(content: content),
        let metadata = parsed["metadata"] as? [String: [String]],
        let n = metadata["name"]?[0],
        var name = santize(n)
    else {
        err("failed to parse script file contents when attempting to save script file")
        return nil
    }
    
    // construct new file name, get all the urls for script files for validateScript func
    let newFilename:String = "\(name).\(type)"
    guard
        let allFilesUrls = try? fm.contentsOfDirectory(at: url, includingPropertiesForKeys: [])
    else {
        err("failed to get all file urls when attempting to save script file")
        return nil
    }
    if !validateScript(oldFilename, newFilename, type, allFilesUrls) {
        err("\(oldFilename) failed script validation when attempting to save")
        return nil
    }
    
    // script validated
    let newFileUrl = url.appendingPathComponent(newFilename)
    do {
        if oldFilename.lowercased() != newFilename.lowercased() {
            // if user changed the filename, remove file with old filename
            let oldFileUrl = url.appendingPathComponent(oldFilename)
            // however, when creating a new script, if user changes the temp given name by app...
            // oldFilename (script ID from sidebar) and newFilename (@name in script contents) will differ
            // the file with oldFilename will not be on the filesystem and can not be deleted
            // for that edge case, using try? rather than try(!), should be improved at some point?
            try? fm.trashItem(at: oldFileUrl, resultingItemURL: nil)
        }
        try content.write(to: newFileUrl, atomically: false, encoding: .utf8)
    } catch {
        err("failed to save file")
        return nil
    }
    
    // saved successfully
    // set up date formatter for last modified date
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = .medium
    dateFormatter.timeStyle = .short
    guard
        let dateMod = try? fm.attributesOfItem(atPath: newFileUrl.path)[.modificationDate] as? Date
    else {
        err("failed to get modified date when attempting to save script file")
        return nil
    }
    
    // remove manifest records for old filename
    if oldFilename.lowercased() != newFilename.lowercased() {
        if !updateExcludesAndMatches(oldFilename, [], []) {
            err("failed to remove old filename from manifest when attempting to save script file")
        }
    }
    
    // update new excludes and matches
    var excludes = metadata["exclude-match"] ?? []
    var matches = metadata["match"] ?? []
    // check for legacy include & exclude
    let includeLegacy = metadata["include"] ?? []
    let excludeLegacy = metadata["exclude"] ?? []
    matches.append(contentsOf: includeLegacy)
    excludes.append(contentsOf: excludeLegacy)
    if !updateExcludesAndMatches(newFilename, excludes, matches) {
        err("failed to update manifest record for new filename when attempting to save script file")
    }
    
    // return un-santized name
    if name.hasPrefix("%2") && !name.hasPrefix("%2F") {
        name = "." + name.dropFirst(2)
    }
    if isSanitzed(name) {
        name = name.removingPercentEncoding!
    }
    
    response["content"] = content
    response["lastModified"] = dateFormatter.string(from: dateMod)
    response["lastModifiedMS"] = String(dateToMilliseconds(dateMod))
    response["id"] = newFilename
    response["name"] = name
    if metadata["description"] != nil {
        // can force unwrap b/c already checked description is not nil
        response["description"] = metadata["description"]![0]
    }
    return response
}

func deleteScript(_ filename: String) -> Bool {
    // remove script from manifest and then delete script file from save location
    guard
        toggleScript("enable", filename),
        updateExcludesAndMatches(filename, [], []),
        let saveLocation = getSaveLocation()
    else {
        err("failed to remove script from manifest or get save location")
        return false
    }
    // secrutiy scope
    let didStartAccessing = saveLocation.startAccessingSecurityScopedResource()
    defer {
        if didStartAccessing { saveLocation.stopAccessingSecurityScopedResource() }
    }
    let url = saveLocation.appendingPathComponent(filename)
    do {
        try FileManager.default.trashItem(at: url, resultingItemURL: nil)
    } catch {
        err(error.localizedDescription)
        return false
    }
    return true
}

// script injection
func getCode(_ url: String) -> [String: [String: String]]? {
    // return dict structure = ["css": ["file.css": "/*code*/"], "js": ["file.js: "//code", "file2.js", "//code2"]]
    var toLoadCSS:[String: String] = [:]
    var toLoadJS:[String: String] = [:]
    var toLoadAll:[String: [String: String]] = ["css":[:],"js":[:]]
    // domains where loading is excluded for file
    var excludedFilenames:[String] = []
    // when code is loaded from a file, it's filename will be populated in below array, to avoid duplication
    var matchedFilenames:[String] = []
    guard
        let blacklist = getManifestKey("blacklist") as? [String],
        let disabled = getManifestKey("disabled") as? [String],
        let manifestExcludePatterns = getManifestKey("exclude-match") as? [String: [String]],
        let manifestMatchPatterns = getManifestKey("match") as? [String: [String]]
    else {
        err("could not read manifest when attempting to get code for injected script")
        return nil
    }
    // url matches a pattern in blacklist, return empty dict
    for pattern in blacklist {
        if patternMatch(url, pattern) {
            return toLoadAll
        }
    }
    // url does not match any blacklist pattern
    let excludePatterns = manifestExcludePatterns.keys // all exclude patterns from manifest
    let matchPatterns = manifestMatchPatterns.keys // all match patterns from manifest
    // add disabled script filenames to excludePatterns
    excludedFilenames.append(contentsOf: disabled)
    // loop through exclude patterns and see if any match page url
    for pattern in excludePatterns {
        // if pattern matches page url, add filenames from it to excludes array, code from those filenames won't be loaded
        if patternMatch(url, pattern) {
            guard let filenames = manifestExcludePatterns[pattern] else {
                err("error parsing manifestExcludePatterns when attempting to get code for injected script")
                continue
            }
            for filename in filenames {
                if !excludedFilenames.contains(filename) {
                    excludedFilenames.append(filename)
                }
            }
        }
    }
    // loop through all patterns from manifest matches to see if they match against the current page url (func arg)
    for pattern in matchPatterns {
        // if page url matches any of the patterns from the manifest match patterns
        if patternMatch(url, pattern) {
            // the filenames listed for the pattern that match the page url
            guard let filenames = manifestMatchPatterns[pattern] else {
                err("error parsing manifestMatchPatterns when attempting to get code for injected script")
                continue
            }
            // loop through matched filenames and get corresponding code from file
            for filename in filenames {
                // don't load if filename if in excludes or filename already exists in matchedFilenames array (to avoid duplication)
                if !excludedFilenames.contains(filename) && !matchedFilenames.contains(filename) {
                    guard let saveLocation = getSaveLocation() else {
                        err("could not get save location from settings when attempting to get code for injected script")
                        continue
                    }
                    let url = saveLocation.appendingPathComponent(filename)
                    guard
                        let contents = getFileContents(url) as? [String: Any],
                        let code = contents["code"] as? String
                    else {
                        err("could not read contents from disk when attempting to get code for injected script")
                        continue
                    }
                    guard let type = filename.split(separator: ".").last else {
                        err("could not get file extension when attempting to get code for injected script")
                        continue
                    }
                    // add the file's content to it's respective dictionary
                    if type == "css" {
                        toLoadCSS[filename] = code
                    } else if type == "js" {
                        toLoadJS[filename] = code
                    }
                    // add filename to array
                    matchedFilenames.append(filename)
                }
            }
            // add individual dictionary to single dictionary
            toLoadAll["css"] = toLoadCSS
            toLoadAll["js"] = toLoadJS
        }
    }
    return toLoadAll
}
