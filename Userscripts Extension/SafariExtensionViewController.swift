//
//  SafariExtensionViewController.swift
//  Userscripts Extension
//
//  Created by Justin Wasack on 4/25/19.
//  Copyright © 2019 Justin Wasack. All rights reserved.
//

import SafariServices
import WebKit

class SafariExtensionViewController: SFSafariExtensionViewController, WKScriptMessageHandler, WKNavigationDelegate {
    
    var webView: WKWebView!
    
    static let shared: SafariExtensionViewController = {
        let shared = SafariExtensionViewController()
        shared.preferredContentSize = NSSize(width:616, height:616)
        return shared
    }()
    
    func initWebView() {
        let parentHeight = SafariExtensionViewController.shared.preferredContentSize.height
        let parentWidth = SafariExtensionViewController.shared.preferredContentSize.width
        let webViewConfig = WKWebViewConfiguration()
        let bundleURL = Bundle.main.resourceURL!.absoluteURL
        let html = bundleURL.appendingPathComponent("editor.html")
        webViewConfig.preferences.setValue(true, forKey: "developerExtrasEnabled")
        webViewConfig.userContentController.add(self, name: "webViewOnLoad")
        webViewConfig.userContentController.add(self, name: "saveCode")
        webViewConfig.userContentController.add(self, name: "getInfo")
        webViewConfig.userContentController.add(self, name: "downloadScript")
        webViewConfig.userContentController.add(self, name: "setCursor")
        webViewConfig.userContentController.add(self, name: "setStatus")
        webView = WKWebView(frame: CGRect(x: 0, y: 0, width: parentWidth, height: parentHeight), configuration: webViewConfig)
        webView.navigationDelegate = self
        webView.allowsLinkPreview = false
        webView.loadFileURL(html, allowingReadAccessTo:bundleURL)
        //webView.isHidden = true
        webView.alphaValue = 0.0;
        self.view.addSubview(webView)
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            NSAnimationContext.runAnimationGroup({_ in
                NSAnimationContext.current.duration = 0.3
                webView.animator().alphaValue = 1.0
            }, completionHandler: {
                print("Animation Complete")
            })
        }
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        let backgroundColor = NSColor.init(red: (39/255.0), green: (42/255.0), blue: (46/255.0), alpha: 1.0)
        view.setValue(backgroundColor, forKey: "backgroundColor")
        initWebView()
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "saveCode" {
            saveData(code: message.body as! String)
            webView.evaluateJavaScript("___userscripts.setSaveDate('\(EditorData.lastEdited)');", completionHandler: nil)
        }
        
        if message.name == "webViewOnLoad" {
            webView.evaluateJavaScript("___userscripts.loadCode('\(EditorData.code)');", completionHandler: nil)
            if !EditorData.lastEdited.isEmpty {
                webView.evaluateJavaScript("___userscripts.setEditorMessage('Last edited on \(EditorData.lastEdited)');", completionHandler: nil)
            }
            let status = UserDefaults.standard.string(forKey: "ToggleStatus")
            if status == "off" {
                webView.evaluateJavaScript("___userscripts.toggleOff();", completionHandler: nil)
            }
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
        
        if message.name == "setStatus" {
            let st = message.body as! String
            setToggleStatus(status: st)
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
