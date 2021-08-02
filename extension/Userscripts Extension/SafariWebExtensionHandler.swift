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
        // these if/else if statement are formatted so that they can be neatly collapsed in Xcode
        // typically the "else if" would be on the same line as the preceding statements close backet
        // ie. } else if {
        if name == "REQ_USERSCRIPTS" {
            guard
                let url = message?["url"] as? String,
                let isTop = message?["isTop"] as? Bool,
                checkDefaultDirectories(),
                let matches = getInjectionFilenames(url),
                let code = getCode(matches, isTop)
            else {
                let e = "couldn't get userscripts"
                response.userInfo = [SFExtensionMessageKey: ["error": e]]
                context.completeRequest(returningItems: [response], completionHandler: nil)
                return
            }
            response.userInfo = [SFExtensionMessageKey: ["code": code]]
        }
        else if name == "POPUP_BADGE_COUNT" {
            guard
                let url = message?["url"] as? String,
                let frameUrls = message?["frameUrls"] as? [String],
                let matches = getPopupBadgeCount(url, frameUrls)
            else {
                // TODO: handle error
                return
            }
            response.userInfo = [SFExtensionMessageKey: ["count": matches]]
        }
        else if name == "POPUP_MATCHES" {
            let manifest = getManifest()
            guard
                let url = message?["url"] as? String,
                let frameUrls = message?["frameUrls"] as? [String],
                checkDefaultDirectories(),
                checkSettings(),
                let matches = getPopupMatches(url, frameUrls, true),
                let active = manifest.settings["active"],
                let updates = checkForRemoteUpdates()
            else {
                // TODO: handle error
                return
            }
            let r = ["active": active, "items": matches, "updates": updates] as [String : Any]
            response.userInfo = [SFExtensionMessageKey: r]
        }
        else if name == "POPUP_UPDATE_ALL" {
            guard
                popupUpdateAll(),
                let updates = checkForRemoteUpdates()
            else {
                // TODO: handle error
                return
            }
            response.userInfo = [SFExtensionMessageKey: ["updates": updates]]
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
                response.userInfo = [SFExtensionMessageKey: ["error": "failed to update settings"]]
            }
        }
        else if name == "TOGGLE_ITEM" {
            // the current status of the item to toggle comes in as 0 || 1
            guard
                let item = message?["item"] as? [String: Any],
                let filename = item["filename"] as? String,
                let current = item["disabled"] as? Int
            else {
                // TODO: handle error
                return
            }
            let action = current == 0 ? "disable" : "enable"
            if toggleFile(filename, action) {
                response.userInfo = [SFExtensionMessageKey: ["success": true]]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "failed to toggle file"]]
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
                // TODO: handle error better?
                response.userInfo = [SFExtensionMessageKey: ["error": "failed"]]
            }
        }
        else if name == "PAGE_ALL_FILES" {
            if let files = getAllFiles() {
                response.userInfo = [SFExtensionMessageKey: files]
            } else {
                // TODO: handle error better?
                response.userInfo = [SFExtensionMessageKey: ["error": "failed"]]
            }
        }
        else if name == "PAGE_SAVE" {
            guard
                let item = message?["item"] as? [String: Any],
                let content = message?["content"] as? String
            else {
                // TODO: handle error
                return
            }
            let saveResponse = saveFile(item, content)
            response.userInfo = [SFExtensionMessageKey: saveResponse]
        }
        else if name == "PAGE_TRASH" {
            guard let item = message?["item"] as? [String: Any] else {
                // TODO: handle error
                return
            }
            if trashFile(item) {
                response.userInfo = [SFExtensionMessageKey: ["success": true]]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "failed to trash file"]]
            }
        }
        else if name == "PAGE_UPDATE" {
            guard let content = message?["content"] as? String else {
                // TODO: handle error
                return
            }
            let updateResponse = updateFile(content)
            response.userInfo = [SFExtensionMessageKey: updateResponse]
        }
        else if name == "CANCEL_REQUESTS" {
            URLSession.shared.getAllTasks { tasks in
                for task in tasks {
                    task.cancel()
                }
            }
        }
        else if name == "PAGE_NEW_REMOTE" {
            guard let url = message?["url"] as? String else {
                // TODO: handle error
                return
            }
            var r = [String: String]()
            if !validateUrl(url) {
                r = ["error": "Failed to get remote content, invalid url"]
            } else if let content = getRemoteFileContents(url) {
                r = ["content": content]
            } else {
                r = ["error": "Failed to get remote content"]
            }
            response.userInfo = [SFExtensionMessageKey: r]
        }
        else if name == "PAGE_UPDATE_SETTINGS" {
            guard let settings = message?["settings"] as? [String: String] else {
                // TODO: handle error
                return
            }
            if updateSettings(settings) {
                response.userInfo = [SFExtensionMessageKey: ["success": true]]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "Failed to save settings to disk"]]
            }
        }
        else if name == "PAGE_UPDATE_BLACKLIST" {
            guard let blacklist = message?["blacklist"] as? [String] else {
                // TODO: handle error
                return
            }
            var manifest = getManifest()
            manifest.blacklist = blacklist
            if updateManifest(with: manifest) {
                response.userInfo = [SFExtensionMessageKey: ["success": true]]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "Failed to save blacklist to disk"]]
            }
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
