//
//  SafariExtensionViewController.swift
//  Userscripts Extension
//
//  Created by Justin Wasack on 4/25/19.
//  Copyright © 2019 Justin Wasack. All rights reserved.
//

import SafariServices
import WebKit

class SafariExtensionViewController: SFSafariExtensionViewController, WKScriptMessageHandler {
    
    @IBOutlet var webView: WKWebView!
    
    static let shared: SafariExtensionViewController = {
        let shared = SafariExtensionViewController()
        shared.preferredContentSize = NSSize(width:700, height:600)
        return shared
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        webView.configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        webView.configuration.userContentController.add(self, name: "webViewOnLoad")
        webView.configuration.userContentController.add(self, name: "saveCode")
        webView.configuration.userContentController.add(self, name: "getInfo")
        webView.configuration.userContentController.add(self, name: "downloadScript")
        webView.configuration.userContentController.add(self, name: "setCursor")
        let bundleURL = Bundle.main.resourceURL!.absoluteURL
        let html = bundleURL.appendingPathComponent("editor.html")
        webView.loadFileURL(html, allowingReadAccessTo:bundleURL)
    }
    
    override func viewWillAppear() {
        super.viewWillAppear()
        webView.evaluateJavaScript("___userscripts.loadCode('\(EditorData.code)');", completionHandler: nil)
        webView.evaluateJavaScript("___userscripts.setSaveDate('\(EditorData.lastEdited)');", completionHandler: nil)
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "saveCode" {
            saveData(code: message.body as! String)
            webView.evaluateJavaScript("___userscripts.setSaveDate('\(EditorData.lastEdited)');", completionHandler: nil)
        }
        
        if message.name == "webViewOnLoad" {
            webView.evaluateJavaScript("___userscripts.loadCode('\(EditorData.code)');", completionHandler: nil)
            webView.evaluateJavaScript("___userscripts.setEditorMessage('Last edited on \(EditorData.lastEdited)');", completionHandler: nil)
            let appVersion = Bundle.main.infoDictionary!["CFBundleShortVersionString"] as! String
            webView.evaluateJavaScript("___userscripts.setVersion(' v\(appVersion)');", completionHandler: nil)
        }
        
        if message.name == "getInfo" {
            openExtensionHomepage()
            dismissPopover()
        }
        
        if message.name == "downloadScript" {
            downloadScript()
            dismissPopover()
        }
        
        //hack to get popover webview to set proper cursors
        if message.name == "setCursor" {
            let cursor = message.body as! String
            if (cursor == "auto" || cursor == "default") {
                NSCursor.arrow.set()
            }
            if (cursor == "pointer") {
                NSCursor.pointingHand.set()
            }
            if (cursor == "text") {
                NSCursor.iBeam.set()
            }
        }
    }
    
}
