import SafariServices

class SafariExtensionHandler: SFSafariExtensionHandler {
    
    override func page(_ page: SFSafariPage, willNavigateTo url: URL?) {
        //guard let pageUrl = url else { return }
    }
    
    override func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        var responseName:String = ""
        var responseData:Any = ""
        var responseError = ""
        var dispatch = true;
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
            guard let settings = userInfo as? [String: String] else {
                return responseError = "settings object is invalid"
            }
            if !updateSettings(settings) {
                responseError = "settings updated locally but failed to save"
            }
        case "REQ_UPDATE_BLACKLIST":
            responseName = "RESP_UPDATE_BLACKLIST"
            guard
                let patternsDict = userInfo as? [String: [String]],
                let patterns = patternsDict["patterns"]
            else {
                return responseError = "blacklist object is invalid"
            }
            if !updateBlacklist(patterns) {
                responseError = "failed to save blacklist"
            }
        case "REQ_TOGGLE_FILE":
            responseName = "RESP_TOGGLE_FILE"
            guard
                let fileData = userInfo as? [String: String],
                let filename = fileData["filename"],
                let action = fileData["action"]
            else {
                return responseError = "invalid file object"
            }
            if toggleFile(filename, action) {
                responseData = ["filename": filename]
            } else {
                responseError = "failed to toggle file"
            }
        case "REQ_FILE_SAVE":
            responseName = "RESP_FILE_SAVE"
            guard let data = userInfo else {
                return responseError = "invalid save object"
            }
            let saved = saveFile(data)
            if let e = saved["error"] as? String {
                responseError = e
            } else {
                responseData = saved
            }
        case "REQ_FILE_TRASH":
            responseName = "RESP_FILE_TRASH"
            guard
                let data = userInfo as? [String: String],
                let filename = data["filename"]
            else {
                return responseError = "invalid file object for trashing"
            }
            // do not need to return any data if save was successful
            // if no error included with response, active file is deleted
            if !trashFile(filename) {
                responseError = "failed to trash file"
            }
        case "REQ_OPEN_SAVE_LOCATION":
            responseName = "RESP_OPEN_SAVE_LOCATION"
            if !openSaveLocation() {
                responseError = "failed to get save location"
            }
        case "REQ_OPEN_DOCUMENTS_DIRECTORY":
            dispatch = false
            return openDocumentsDirectory()
        case "REQ_CHANGE_SAVE_LOCATION":
            dispatch = false
            closeExtensionHTMLPages()
        case "REQ_USERSCRIPTS":
            responseName = "RESP_USERSCRIPTS"
            dispatch = false
            page.getPropertiesWithCompletionHandler { props in
                guard
                    let url = props?.url,
                    let code = getCode(url.absoluteString)
                else {
                    responseError = "failed to get injected code"
                    return
                }
                responseData = code
                page.dispatchMessageToScript(withName: responseName, userInfo: ["data": responseData, "error": responseError])
            }
        
        default:
            dispatch = false
            err("message from js has no handler")
        }
        if dispatch {
            page.dispatchMessageToScript(withName: responseName, userInfo: ["data": responseData, "error": responseError])
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
