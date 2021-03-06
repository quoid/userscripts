import SafariServices

class SafariExtensionHandler: SFSafariExtensionHandler {
    
    override func page(_ page: SFSafariPage, willNavigateTo url: URL?) {
        //guard let pageUrl = url else { return }
    }
    
    override func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        var responseName:String = ""
        var responseData:Any = ""
        var responseError = ""
        switch messageName {
        case "REQ_INIT_DATA":
            responseName = "RESP_INIT_DATA"
            if let initData = getInitData() {
                responseData = initData
            } else {
                responseError = "failed to get settings"
            }
        case "REQ_ALL_FILES_DATA":
            responseName = "RESP_ALL_FILES_DATA"
            if let files = getAllFilesData() {
                responseData = files
            } else {
                responseError = "failed to get files"
            }
        case "REQ_UPDATE_SETTINGS":
            responseName = "RESP_UPDATE_SETTINGS"
            if let settings = userInfo as? [String: String] {
                if !updateSettings(settings) {
                    responseError = "settings updated locally but failed to save"
                }
            } else {
                responseError = "settings object is invalid"
            }
        case "REQ_UPDATE_BLACKLIST":
            responseName = "RESP_UPDATE_BLACKLIST"
            if let patternsDict = userInfo as? [String: [String]], let patterns = patternsDict["patterns"] {
                if !updateBlacklist(patterns) {
                    responseError = "failed to save blacklist"
                }
            } else {
                responseError = "blacklist object is invalid"
            }
        case "REQ_TOGGLE_FILE":
            responseName = "RESP_TOGGLE_FILE"
            if
                let fileData = userInfo as? [String: String],
                let filename = fileData["filename"],
                let action = fileData["action"]
            {
                if !toggleFile(filename, action) {
                    responseError = "failed to toggle file"
                }
                responseData = ["filename": filename]
            } else {
                responseError = "invalid file object"
            }
        case "REQ_FILE_SAVE":
            responseName = "RESP_FILE_SAVE"
            if let data = userInfo {
                let saved = saveFile(data)
                if let e = saved["error"] as? String {
                    responseError = e
                } else {
                    responseData = saved
                }
            } else {
                responseError = "invalid save object"
            }
        case "REQ_FILE_TRASH":
            responseName = "RESP_FILE_TRASH"
            if let data = userInfo as? [String: String], let filename = data["filename"] {
                // do not need to return any data if save was successful
                // if no error included with response, active file is deleted
                if !trashFile(filename) {
                    responseError = "failed to trash file"
                }
            } else {
                responseError = "invalid file object for trashing"
            }
        case "REQ_OPEN_SAVE_LOCATION":
            responseName = "RESP_OPEN_SAVE_LOCATION"
            if !openSaveLocation() {
                responseError = "failed to get save location"
            }
        case "REQ_OPEN_DOCUMENTS_DIRECTORY":
            return openDocumentsDirectory()
        case "REQ_CHANGE_SAVE_LOCATION":
            return closeExtensionHTMLPages()
        case "REQ_USERSCRIPTS":
            responseName = "RESP_USERSCRIPTS"
            if
                let data = userInfo,
                let url = data["url"] as? String,
                let isTop = data["top"] as? Bool,
                let id = data["id"] as? String,
                let matched = getMatchedFiles(url),
                let code = getCode(matched, isTop)
            {
                responseData = ["code": code, "id": id]
            } else {
                responseError = "failed to get code"
            }
        default:
            err("message from js has no handler")
        }
        page.dispatchMessageToScript(withName: responseName, userInfo: ["data": responseData, "error": responseError])
    }
    
    override func toolbarItemClicked(in window: SFSafariWindow) {
        // This method will be called when your toolbar item is clicked.
        NSLog("The extension's toolbar item was clicked")
        SFSafariExtension.getBaseURI { baseURI in
            guard let baseURI = baseURI else { return }
            window.openTab(with: baseURI.appendingPathComponent("index.html"), makeActiveIfPossible: true) { (tab) in
                //print(baseURI)
            }
        }
    }
    
    override func validateToolbarItem(in window: SFSafariWindow, validationHandler: @escaping ((Bool, String) -> Void)) {
        validationHandler(true, "")
        window.getActiveTab { tab in
            tab?.getActivePage { page in
                page?.getPropertiesWithCompletionHandler { props in
                    if let  url = props?.url {
                        guard
                            let matched = getMatchedFiles(url.absoluteString),
                            let manifestKeys = getManifestKeys(),
                            let showCount = manifestKeys.settings["showCount"]
                        else { return }
                        if matched.count > 0 && showCount == "true" {
                            window.getToolbarItem { toolbaritem in
                                toolbaritem?.setBadgeText(String(matched.count))
                            }
                        }
                    }
                }
            }
        }
    }

}
