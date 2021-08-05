import SafariServices

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as? NSExtensionItem
        let message = item?.userInfo?[SFExtensionMessageKey] as? [String: Any]
        // if message received without name, ignore
        guard let name = message?["name"] as? String else {
            err("could not get message name from web extension")
            return
        }
        logText("Got message with name: \(name)")
        // got a valid message, construct response based on message received
        let response = NSExtensionItem()
        // send standard error when there's an issue parsing inbound message
        var inBoundError = false
        // these if/else if statement are formatted so that they can be neatly collapsed in Xcode
        // typically the "else if" would be on the same line as the preceding statements close backet
        // ie. } else if {
        if name == "REQ_USERSCRIPTS" {
            if let url = message?["url"] as? String, let isTop = message?["isTop"] as? Bool {
                if
                    checkDefaultDirectories(),
                    let matches = getInjectionFilenames(url),
                    let code = getCode(matches, isTop)
                {
                    response.userInfo = [SFExtensionMessageKey: ["code": code]]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["error": "couldn't get userscripts"]]
                }
            } else {
                inBoundError = true
            }
        }
        else if name == "POPUP_BADGE_COUNT" {
            if let url = message?["url"] as? String, let frameUrls = message?["frameUrls"] as? [String] {
                if let matches = getPopupBadgeCount(url, frameUrls) {
                    response.userInfo = [SFExtensionMessageKey: ["count": matches]]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["error": "failed to update badge count"]]
                }
            } else {
                inBoundError = true
            }
        }
        else if name == "POPUP_MATCHES" {
            let manifest = getManifest()
            if let url = message?["url"] as? String, let frameUrls = message?["frameUrls"] as? [String] {
                if
                    checkDefaultDirectories(),
                    checkSettings(),
                    let matches = getPopupMatches(url, frameUrls, true),
                    let active = manifest.settings["active"],
                    let updates = checkForRemoteUpdates()
                {
                    let r = ["active": active, "items": matches, "updates": updates] as [String : Any]
                    response.userInfo = [SFExtensionMessageKey: r]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["error": "failed to run match sequence"]]
                }
            } else {
                inBoundError = true
            }
        }
        else if name == "POPUP_UPDATE_ALL" {
            if popupUpdateAll(), let updates = checkForRemoteUpdates() {
                response.userInfo = [SFExtensionMessageKey: ["updates": updates]]
            } else {
               response.userInfo = [SFExtensionMessageKey: ["error": "failed to run update sequence"]]
            }
        }
        else if name == "POPUP_TOGGLE_EXTENSION" {
            var manifest = getManifest()
            let active = manifest.settings["active"]
            if active == "true" {
                manifest.settings["active"] = "false"
            } else {
                manifest.settings["active"] = "true"
            }
            if updateManifest(with: manifest) {
                response.userInfo = [SFExtensionMessageKey: ["success": true]]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "failed to update injection state"]]
            }
        }
        else if name == "TOGGLE_ITEM" {
            // the current status of the item to toggle comes in as 0 || 1
            if
                let item = message?["item"] as? [String: Any],
                let filename = item["filename"] as? String,
                let current = item["disabled"] as? Int
            {
                let action = current == 0 ? "disable" : "enable"
                if toggleFile(filename, action) {
                    response.userInfo = [SFExtensionMessageKey: ["success": true]]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["error": "failed to toggle file"]]
                }
            } else {
                inBoundError = true
            }
        }
        else if name == "OPEN_SAVE_LOCATION" {
            if openSaveLocation() {
                response.userInfo = [SFExtensionMessageKey: ["success": true]]
            }
        }
        else if name == "PAGE_INIT_DATA" {
            if let settings = getInitData() {
                response.userInfo = [SFExtensionMessageKey: settings]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "failed to get init data"]]
            }
        }
        else if name == "PAGE_ALL_FILES" {
            if let files = getAllFiles() {
                response.userInfo = [SFExtensionMessageKey: files]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "failed to get all files"]]
            }
        }
        else if name == "PAGE_SAVE" {
            if
                let item = message?["item"] as? [String: Any],
                let content = message?["content"] as? String
            {
                let saveResponse = saveFile(item, content)
                response.userInfo = [SFExtensionMessageKey: saveResponse]
            } else {
                inBoundError = true
            }
        }
        else if name == "PAGE_TRASH" {
            if let item = message?["item"] as? [String: Any] {
                if trashFile(item) {
                    response.userInfo = [SFExtensionMessageKey: ["success": true]]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["error": "failed to trash file"]]
                }
            } else {
                inBoundError = true
            }
        }
        else if name == "PAGE_UPDATE" {
            if let content = message?["content"] as? String {
                let updateResponse = getFileRemoteUpdate(content)
                response.userInfo = [SFExtensionMessageKey: updateResponse]
            } else {
                inBoundError = true
            }
        }
        else if name == "CANCEL_REQUESTS" {
            URLSession.shared.getAllTasks { tasks in
                for task in tasks {
                    task.cancel()
                }
            }
        }
        else if name == "PAGE_NEW_REMOTE" {
            if let url = message?["url"] as? String {
                if !validateUrl(url) {
                    response.userInfo = [SFExtensionMessageKey: ["error": "Failed to get remote content, invalid url"]]
                } else if let content = getRemoteFileContents(url) {
                    response.userInfo = [SFExtensionMessageKey: content]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["error": "Failed to get remote content"]]
                }
            } else {
                inBoundError = true
            }
        }
        else if name == "PAGE_UPDATE_SETTINGS" {
            if let settings = message?["settings"] as? [String: String] {
                if updateSettings(settings) {
                    response.userInfo = [SFExtensionMessageKey: ["success": true]]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["error": "Failed to save settings to disk"]]
                }
            } else {
                inBoundError = true
            }
        }
        else if name == "PAGE_UPDATE_BLACKLIST" {
            if let blacklist = message?["blacklist"] as? [String] {
                var manifest = getManifest()
                manifest.blacklist = blacklist
                if !updateManifest(with: manifest) {
                    response.userInfo = [SFExtensionMessageKey: ["error": "Failed to save blacklist to disk"]]
                } else {
                    response.userInfo = [SFExtensionMessageKey: ["success": true]]
                }
            } else {
                inBoundError = true
            }
            
        }
        // send inBoundError if found
        if inBoundError {
            response.userInfo = [SFExtensionMessageKey: ["error": "Failed to parse inbound message"]]
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
