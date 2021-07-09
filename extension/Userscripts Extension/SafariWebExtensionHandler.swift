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
        if name == "REQ_USERSCRIPTS" {
            guard
                let url = message?["url"] as? String,
                let isTop = message?["isTop"] as? Bool,
                let matches = getInjectionFilenames(url),
                let code = getCode(matches, isTop)
            else {
                let e = "couldn't get userscripts"
                response.userInfo = [SFExtensionMessageKey: ["error": e]]
                context.completeRequest(returningItems: [response], completionHandler: nil)
                return
            }
            response.userInfo = [SFExtensionMessageKey: ["code": code]]
        } else if name == "POPUP_BADGE_COUNT" {
            guard
                let url = message?["url"] as? String,
                let frameUrls = message?["frameUrls"] as? [String],
                let matches = getPopupBadgeCount(url, frameUrls)
            else {
                // TODO: handle error
                return
            }
            response.userInfo = [SFExtensionMessageKey: ["count": matches]]
        } else if name == "POPUP_MATCHES" {
            let manifest = getManifest()
            guard
                let url = message?["url"] as? String,
                let frameUrls = message?["frameUrls"] as? [String],
                let matches = getPopupMatches(url, frameUrls, true),
                let active = manifest.settings["active"],
                let updates = checkForRemoteUpdates()
            else {
                // TODO: handle error
                return
            }
            let r = ["active": active, "items": matches, "updates": updates] as [String : Any]
            response.userInfo = [SFExtensionMessageKey: r]
        } else if name == "POPUP_UPDATE_ALL" {
            guard
                popupUpdateAll(),
                let updates = checkForRemoteUpdates()
            else {
                // TODO: handle error
                return
            }
            response.userInfo = [SFExtensionMessageKey: ["updates": updates]]
        } else if name == "POPUP_TOGGLE_EXTENSION" {
            var manifest = getManifest()
            let active = manifest.settings["active"]
            if active == "true" {
                manifest.settings["active"] = "false"
            } else {
                manifest.settings["active"] = "true"
            }
            if updateManifest(with: manifest) {
                response.userInfo = [SFExtensionMessageKey: ["status": "success"]]
            } else {
                response.userInfo = [SFExtensionMessageKey: ["error": "failed to update settings"]]
            }
        } else if name == "POPUP_TOGGLE_SCRIPT" {
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
        } else if name == "OPEN_SAVE_LOCATION" {
            if openSaveLocation() {
                response.userInfo = [SFExtensionMessageKey: ["status": "success"]]
            }
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
