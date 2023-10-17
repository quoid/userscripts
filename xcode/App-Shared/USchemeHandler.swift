import WebKit
import UniformTypeIdentifiers

private let logger = USLogger(#fileID)
let AppWebViewUrlScheme = "userscriptsapp"
let AppWebViewEntryPage = "entry-app-webview.html"

// https://developer.apple.com/documentation/webkit/wkurlschemehandler
// https://developer.apple.com/documentation/webkit/wkurlschemetask
class USchemeHandler: NSObject, WKURLSchemeHandler {
    
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        // https://developer.apple.com/documentation/dispatch/dispatchqueue
        DispatchQueue.global(qos: .userInteractive).async {
            guard let url = urlSchemeTask.request.url else {
                logger?.error("\(#function, privacy: .public) - failed to get request url")
                return
            }
            guard url.scheme == AppWebViewUrlScheme else {
                logger?.error("\(#function, privacy: .public) - unexpected url scheme: \(url, privacy: .public)")
                return
            }
            print(url)
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
                logger?.error("\(#function, privacy: .public) - file not found: \(url, privacy: .public)")
                return
            }
            guard let data = try? Data(contentsOf: file) else {
                logger?.error("\(#function, privacy: .public) - faild to get data from: \(url, privacy: .public)")
                return
            }

            // https://developer.apple.com/documentation/uniformtypeidentifiers
            //let mime = UTType.init(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
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
