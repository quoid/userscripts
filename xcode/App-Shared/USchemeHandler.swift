import WebKit
import UniformTypeIdentifiers

private let logger = USLogger(#fileID)
let AppWebViewUrlScheme = "userscriptsapp"
let AppWebViewEntryPage = "entry-app-webview.html"

// https://developer.apple.com/documentation/webkit/wkurlschemehandler
// https://developer.apple.com/documentation/webkit/wkurlschemetask
class USchemeHandler: NSObject, WKURLSchemeHandler {

	func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
		// wrapper of didFailWithError
		func failHandler(_ errmsg: String) {
			logger?.error("\(#function) - \(errmsg, privacy: .public)")
			// redirect to a customized error page
//			DispatchQueue.main.async {
//				webView.load(URLRequest(url: URL(string: "\(AppWebViewUrlScheme):///")!))
//			}
			urlSchemeTask.didFailWithError(NSError(domain: "USchemeHandler", code: 0, userInfo: nil))
		}

		// https://developer.apple.com/documentation/dispatch/dispatchqueue
		DispatchQueue.global(qos: .userInteractive).async {
			guard let url = urlSchemeTask.request.url else {
				failHandler("failed to get request url")
				return
			}
			guard url.scheme == AppWebViewUrlScheme else {
				failHandler("unexpected url scheme: \(url)")
				return
			}
			var name: String
			if #available(macOS 13.0, iOS 16.0, *) {
				name = url.path(percentEncoded: false)
			} else {
				name = url.path
			}
			if ["", "/"].contains(name) {
				name = AppWebViewEntryPage
			}
			guard let file = Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "dist") else {
				failHandler("file not found: \(url)")
				return
			}
			guard let data = try? Data(contentsOf: file) else {
				failHandler("faild to get data from: \(url)")
				return
			}

			// https://developer.apple.com/documentation/uniformtypeidentifiers
			// let mime = UTType.init(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
			let mime = UTTypeReference.init(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"

			let response = URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: nil)
			urlSchemeTask.didReceive(response)
			urlSchemeTask.didReceive(data)
			urlSchemeTask.didFinish()
		}
	}

	func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {

	}

}
