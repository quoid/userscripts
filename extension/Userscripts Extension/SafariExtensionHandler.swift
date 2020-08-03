import SafariServices

class SafariExtensionHandler: SFSafariExtensionHandler {
    
    override func page(_ page: SFSafariPage, willNavigateTo url: URL?) {
        //guard let pageUrl = url else { return }
    }
    
    override func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        var respData = ["requestOrigin": messageName] as [String : Any]
        var respName:String = ""
        if messageName == "REQ_USERSCRIPTS" {
            respName = "RESP_USERSCRIPTS"
            page.getPropertiesWithCompletionHandler { props in
                guard
                    let url = props?.url,
                    let code = getCode(url.absoluteString)
                else {
                    respData["error"] = "failed to get injected code"
                    return
                }
                respData["data"] = code
                page.dispatchMessageToScript(withName: respName, userInfo: respData)
            }
        } else if messageName == "REQ_CHANGE_SAVE_LOCATION" {
            respName = "RESP_CHANGE_SAVE_LOCATION"
            SFSafariExtension.getBaseURI(completionHandler: { baseURI in
                guard let bundlePageURI = baseURI?.absoluteString else { return }
                respData["data"] = bundlePageURI
                sendMessageToAllPages(withName: respName, userInfo: respData)
            })
        } else {
            if messageName == "REQ_ALL_SCRIPTS" {
                respName = "RESP_ALL_SCRIPTS"
                if let scriptsData = updateScriptsData() {
                    respData["data"] = scriptsData
                } else {
                    respData["error"] = "failed to get scripts"
                }
            }
            if messageName == "REQ_BLACKLIST_SAVE" {
                respName = "RESP_BLACKLIST_SAVE"
                if let blacklist = userInfo?["blacklist"] as? [String], updateBlacklist(blacklist) {
                    respData["data"] = ["blacklist": blacklist]
                } else {
                    respData["error"] = "failed to update blacklist"
                }
            }
            if messageName == "REQ_DISABLE_SCRIPT" {
                respName = "RESP_DISABLE_SCRIPT"
                if let id = userInfo?["id"] as? String, toggleScript("disable", id) {
                    respData["data"] = ["id": id]
                } else {
                    respData["error"] = "failed to disable script"
                }
            }
            if messageName == "REQ_ENABLE_SCRIPT" {
                respName = "RESP_ENABLE_SCRIPT"
                if let id = userInfo?["id"] as? String, toggleScript("enable", id) {
                    respData["data"] = ["id": id]
                } else {
                    respData["error"] = "failed to enable script"
                }
            }
            if messageName == "REQ_INIT_DATA" {
                respName = "RESP_INIT_DATA"
                if let initData = getInitData() {
                    respData["data"] = initData
                } else {
                    respData["error"] = "failed to get init data"
                }
            }
            if messageName == "REQ_OPEN_SAVE_LOCATION" {
                respName = "RESP_OPEN_SAVE_LOCATION"
                guard let url = getSaveLocation() else {
                    respData["error"] = "failed to get save location in func openSaveLocation"
                    return
                }
                NSWorkspace.shared.activateFileViewerSelecting([url])
            }
            if messageName == "REQ_SCRIPT_DELETE" {
                respName = "RESP_SCRIPT_DELETE"
                if let filename = userInfo?["id"] as? String, deleteScript(filename) {
                    respData["data"] = ["id": filename]
                } else {
                    respData["error"] = "failed to delete script"
                }
            }
            if messageName == "REQ_SCRIPT_SAVE" {
                respName = "RESP_SCRIPT_SAVE"
                if let scriptData = userInfo as? [String: String], let responseData = saveScriptFile(scriptData) {
                    respData["data"] = responseData
                } else {
                    respData["error"] = "failed to save script"
                }
            }
            if messageName == "REQ_SETTING_CHANGE" {
                respName = "RESP_SETTING_CHANGE"
                if
                    let filename = userInfo?["id"] as? String,
                    let val = userInfo?["value"] as? String,
                    updateSetting(filename, val)
                {
                    respData["data"] = ["id": filename, "value": val]
                } else {
                    respData["error"] = "failed to change setting"
                }
            }
            if messageName == "REQ_SINGLE_SCRIPT" {
                respName = "RESP_SINGLE_SCRIPT"
                if let filename = userInfo?["id"] as? String, let scriptData = loadScriptData(filename) {
                    respData["data"] = scriptData
                } else {
                    respData["error"] = "failed to load script"
                }
            }
            page.dispatchMessageToScript(withName: respName, userInfo: respData)
        }
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
    }

}
