//
//  SafariExtensionHandler.swift
//  Userscripts Extension
//
//  Created by Justin Wasack on 4/25/19.
//  Copyright © 2019 Justin Wasack. All rights reserved.
//

import SafariServices
import WebKit

class SafariExtensionHandler: SFSafariExtensionHandler {
    
    override func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        if messageName == "REQUEST_SAVED_DATA" {
            if EditorData.code.isEmpty {
                loadSavedData()
            }
            if UserDefaults.standard.string(forKey: "ToggleStatus") != "off" {
                page.dispatchMessageToScript(withName: "SEND_SAVED_DATA", userInfo: ["code": EditorData.code])
            }
        }
    }
    
    override func toolbarItemClicked(in window: SFSafariWindow) {
        // This method will be called when your toolbar item is clicked.
        NSLog("The extension's toolbar item was clicked")
    }
    
    override func validateToolbarItem(in window: SFSafariWindow, validationHandler: @escaping ((Bool, String) -> Void)) {
        validationHandler(true, "")
    }
    
    override func popoverViewController() -> SFSafariExtensionViewController {
        return SafariExtensionViewController.shared
    }

}
