//
//  ViewController.swift
//  Userscripts-iOS
//
//  Created by Justin Wasack on 10/3/21.
//  Copyright © 2021 Justin Wasack. All rights reserved.
//

import UIKit
import WebKit
import UniformTypeIdentifiers
import os

private let logger = USLogger(#fileID)

class ViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, UIDocumentPickerDelegate {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        let backgroundColor = UIColor.init(red: (47/255.0), green: (51/255.0), blue: (55/255.0), alpha: 1.0)
        view.setValue(backgroundColor, forKey: "backgroundColor")
        self.webView.isOpaque = false
        self.webView.backgroundColor = backgroundColor
        self.webView.navigationDelegate = self
        self.webView.scrollView.isScrollEnabled = false
        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "??"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "??"
        webView.evaluateJavaScript("printDirectory('\(Preferences.scriptsDirectoryUrl.absoluteString)')")
        webView.evaluateJavaScript("printVersion('v\(appVersion)', '(\(buildNumber))')")
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated  {
            guard
                let url =  navigationAction.request.url,
                UIApplication.shared.canOpenURL(url)
            else {
                return
            }
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let name = message.body as? String else {
            logger?.error("\(#function, privacy: .public) - Userscripts iOS received a message without a name")
            return
        }
        if name == "SET_READ_LOCATION" {
            // https://developer.apple.com/documentation/uikit/view_controllers/providing_access_to_directories
            logger?.info("\(#function, privacy: .public) - Userscripts iOS has requested to set the readLocation")
            let documentPicker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
            documentPicker.delegate = self
            documentPicker.directoryURL = getDocumentsDirectory()
            present(documentPicker, animated: true, completion: nil)
        }
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentAt url: URL) {
        Preferences.scriptsDirectoryUrl = url
        webView.evaluateJavaScript("printDirectory('\(Preferences.scriptsDirectoryUrl.absoluteString)')")
    }
}
