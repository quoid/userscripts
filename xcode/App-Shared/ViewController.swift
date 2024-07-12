import WebKit

private let logger = USLogger(#fileID)

class ViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, UIDocumentPickerDelegate {

	@IBOutlet var webView: WKWebView!

	// https://developer.apple.com/documentation/uikit/uiviewcontroller/1621454-loadview
	override func loadView() {
		// https://developer.apple.com/documentation/webkit/wkwebviewconfiguration
		let configuration = WKWebViewConfiguration()
		// https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/2875766-seturlschemehandler
		configuration.setURLSchemeHandler(USchemeHandler(), forURLScheme: AppWebViewUrlScheme)
		// https://developer.apple.com/documentation/webkit/wkusercontentcontroller
		configuration.userContentController.add(self, name: "controller")
		// https://developer.apple.com/documentation/webkit/wkwebview
		self.webView = WKWebView(frame: .zero, configuration: configuration)
		// https://developer.apple.com/documentation/webkit/wknavigationdelegate
		self.webView.navigationDelegate = self
#if DEBUG
		// https://webkit.org/blog/13936/enabling-the-inspection-of-web-content-in-apps/
		if #available(macOS 13.3, iOS 16.4, tvOS 16.4, *) {
			// https://developer.apple.com/documentation/webkit/wkwebview/4111163-inspectable/
			self.webView.isInspectable = true
		}
		logger?.debug("\(#function, privacy: .public) - DEBUG mode: isInspectable = true")
#endif
		view = webView
		self.webView.scrollView.isScrollEnabled = false
		self.webView.isOpaque = false
		let backgroundColor = UIColor.init(red: (47/255.0), green: (51/255.0), blue: (55/255.0), alpha: 1.0)
		view.setValue(backgroundColor, forKey: "backgroundColor")
		self.webView.backgroundColor = backgroundColor
	}

	// https://developer.apple.com/documentation/uikit/uiviewcontroller/1621495-viewdidload
	override func viewDidLoad() {
		super.viewDidLoad()
		webView.load(URLRequest(url: URL(string: "\(AppWebViewUrlScheme):///")!))
	}

	func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
		let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "??"
		let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "??"
		webView.evaluateJavaScript("APP.printVersion('v\(appVersion)', '(\(buildNumber))')")
		webView.evaluateJavaScript("APP.printDirectory('\(getCurrentScriptsDirectoryString())')")
	}

	func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
		if navigationAction.navigationType == .linkActivated  {
			guard let url = navigationAction.request.url else {
				decisionHandler(.allow)
				return
			}
			// allow registration scheme
			if url.scheme == AppWebViewUrlScheme {
				decisionHandler(.allow)
				return
			}
			// allow specified url prefixes
//			let allowPrefixes = [
//				"https://github.com/quoid/userscripts"
//			]
//			for prefix in allowPrefixes {
//				if url.absoluteString.lowercased().hasPrefix(prefix) {
//					decisionHandler(.allow)
//					return
//				}
//			}
			// open from external app like safari
			if UIApplication.shared.canOpenURL(url) {
				UIApplication.shared.open(url)
				decisionHandler(.cancel)
				return
			}
			decisionHandler(.allow)
		}
		decisionHandler(.allow)
	}

	func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
		guard let name = message.body as? String else {
			logger?.error("\(#function, privacy: .public) - Userscripts iOS received a message without a name")
			return
		}
		if name == "CHANGE_DIRECTORY" {
			// https://developer.apple.com/documentation/uikit/view_controllers/providing_access_to_directories
			logger?.info("\(#function, privacy: .public) - Userscripts iOS has requested to set the readLocation")
			let documentPicker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
			documentPicker.delegate = self
			documentPicker.directoryURL = getDocumentsDirectory()
			present(documentPicker, animated: true, completion: nil)
		}
		if name == "OPEN_DIRECTORY" {
			guard var components = URLComponents(url: Preferences.scriptsDirectoryUrl, resolvingAgainstBaseURL: true) else {
				return
			}
			components.scheme = "shareddocuments"
			if let url = components.url, UIApplication.shared.canOpenURL(url) {
				UIApplication.shared.open(url)
			}
		}
	}

	func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentAt url: URL) {
		Preferences.scriptsDirectoryUrl = url
		webView.evaluateJavaScript("APP.printDirectory('\(getCurrentScriptsDirectoryString())')")
	}
}
