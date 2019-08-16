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
        webViewConfig.userContentController.add(self, name: "webViewReady")
        webViewConfig.userContentController.add(self, name: "setCursor")
        webViewConfig.userContentController.add(self, name: "saveCode")
        webViewConfig.userContentController.add(self, name: "setStatus")
        webViewConfig.userContentController.add(self, name: "setModificationDate")
        webViewConfig.userContentController.add(self, name: "getInfo")
        webViewConfig.userContentController.add(self, name: "downloadScript")
        webView = WKWebView(frame: CGRect(x: 0, y: 0, width: parentWidth, height: parentHeight), configuration: webViewConfig)
        webView.navigationDelegate = self
        webView.allowsLinkPreview = false
        webView.loadFileURL(html, allowingReadAccessTo:bundleURL)
        webView.alphaValue = 0.0;
        self.view.addSubview(webView)
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        let backgroundColor = NSColor.init(red: (39/255.0), green: (42/255.0), blue: (46/255.0), alpha: 1.0)
        view.setValue(backgroundColor, forKey: "backgroundColor")
        if UserDefaults.standard.object(forKey: "toggleOff") == nil {
            UserDefaults.standard.set(false, forKey: "toggleOff")
        }
        initWebView()
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let lang = Locale.current.languageCode!
        let ver = Bundle.main.infoDictionary!["CFBundleShortVersionString"] as! String
        let toggle = UserDefaults.standard.bool(forKey: "toggleOff")
        if var code = getSavedCode() {
            code = code.addingPercentEncoding(withAllowedCharacters: .alphanumerics)!
            webView.evaluateJavaScript("___userscripts.init('\(lang)', '\(ver)', '\(toggle)', '\(code)');", completionHandler: nil)
        } else {
            webView.evaluateJavaScript("___userscripts.init('\(lang)', '\(ver)', '\(toggle)');", completionHandler: nil)
        }
    }
    
    func saveCode(code:String) {
        let documentDirectory = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0] as String
        let path = documentDirectory.appending("/userscript.js")
        let fileURL = URL(fileURLWithPath: path)
        let fileContent = code
        do {
            try fileContent.write(to: fileURL, atomically: false, encoding: .utf8)
            let escapedCode = code.addingPercentEncoding(withAllowedCharacters: .alphanumerics)!
            webView.evaluateJavaScript("___userscripts.saveSucceed('\(escapedCode)');", completionHandler: { (value, error) in
                guard error == nil else {return}
                let d = getModificationDate()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.25) {
                    self.webView.evaluateJavaScript("___userscripts.setStatusText('\(d)', '\(true)');", completionHandler: nil)
                }
            })
        } catch {
            webView.evaluateJavaScript("___userscripts.saveFail();", completionHandler: nil)
        }
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "webViewReady" {
            if getSavedCode() != nil && UserDefaults.standard.bool(forKey: "toggleOff") == false {
                let d = getModificationDate()
                self.webView.evaluateJavaScript("___userscripts.setStatusText('\(d)', '\(true)');", completionHandler: nil)
            }
            NSAnimationContext.runAnimationGroup({_ in
                NSAnimationContext.current.duration = 0.35
                webView.animator().alphaValue = 1.0
            })
        }
        if message.name == "setCursor" {
            let cursor = message.body as! String
            switch cursor {
            case "auto", "default":
                NSCursor.arrow.set()
            case "pointer":
                NSCursor.pointingHand.set()
            case "text":
                NSCursor.iBeam.set()
            default:
                break
            }
        }
        if message.name == "saveCode" {
            let code = message.body as! String
            saveCode(code: code)
        }
        if message.name == "setStatus" {
            let toggleStatus = message.body as! Bool
            UserDefaults.standard.set(toggleStatus, forKey: "toggleOff")
        }
        if message.name == "setModificationDate" {
            let d = getModificationDate()
            webView.evaluateJavaScript("___userscripts.setStatusText('\(d)', '\(true)');", completionHandler: nil)
        }
        if message.name == "getInfo" {
            openExtensionHomepage()
            dismissPopover()
        }
        if message.name == "downloadScript" {
            downloadScript()
        }
    }
}

func getModificationDate() -> String {
    let documentDirectory = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0] as String
    let path = documentDirectory.appending("/userscript.js")
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = .medium
    dateFormatter.timeStyle = .short
    do {
        let date = try FileManager.default.attributesOfItem(atPath: path)[.modificationDate] as! Date
        return dateFormatter.string(from: date)
    } catch {
        return "error getting date"
    }
}

func getSavedCode() -> String? {
    let fileManager = FileManager.default
    let documentDirectory = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0] as String
    let path = documentDirectory.appending("/userscript.js")
    let fileURL = URL(fileURLWithPath: path)
    var savedCode:String?
    if fileManager.fileExists(atPath: path) {
        do {
            savedCode = try String(contentsOf: fileURL, encoding: .utf8)
        } catch {
            print(error)
        }
    }
    return savedCode
}

func openExtensionHomepage() {
    guard let url = URL(string: "https://github.com/quoid/userscripts") else { return }
    SFSafariApplication.getActiveWindow { (window) in
        window?.openTab(with: url, makeActiveIfPossible: true) { (tab) in
            //although it is stated in the documentation that the completion handler is optional, that is untrue
        }
    }
}

func downloadScript() {
    guard let code = getSavedCode() else {return}
    SFSafariApplication.getActiveWindow { (window) in
        window?.getActiveTab { (tab) in
            tab?.getActivePage { (page) in
                page?.dispatchMessageToScript(withName: "DOWNLOAD_SCRIPT", userInfo: ["code": code])
            }
        }
    }
}
