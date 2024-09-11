import Foundation

extension CharacterSet {
	// https://developer.apple.com/documentation/foundation/characterset#2902136
	public static let urlAllowed_ = CharacterSet(charactersIn: "#")
		.union(.urlFragmentAllowed)
		.union(.urlHostAllowed)
		.union(.urlPasswordAllowed)
		.union(.urlPathAllowed)
		.union(.urlQueryAllowed)
		.union(.urlUserAllowed)
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
func encodeURI(_ uri: String) -> String {
	// https://developer.apple.com/documentation/foundation/characterset#2902136
//	var urlAllowed = CharacterSet(charactersIn: "#")
//	urlAllowed.formUnion(.urlFragmentAllowed)
//	urlAllowed.formUnion(.urlHostAllowed)
//	urlAllowed.formUnion(.urlPasswordAllowed)
//	urlAllowed.formUnion(.urlPathAllowed)
//	urlAllowed.formUnion(.urlQueryAllowed)
//	urlAllowed.formUnion(.urlUserAllowed)
	return uri.addingPercentEncoding(withAllowedCharacters: .urlAllowed_) ?? uri
}

func fixedURL(string urlString: String) -> URL? {
	let rawUrlString = urlString.removingPercentEncoding ?? urlString
	var url: URL?
	if #available(macOS 14.0, iOS 17.0, *) {
		url = URL(string: rawUrlString, encodingInvalidCharacters: true)
	} else {
		url = URL(string: encodeURI(rawUrlString))
	}
	return url
}

// https://developer.mozilla.org/en-US/docs/Web/API/URL
func jsLikeURL(_ urlString: String, baseString: String? = nil) -> [String: String]? {
	var _url: URL?
	if let baseString = baseString {
		guard let baseUrl = fixedURL(string: baseString) else {
			return nil
		}
		_url = URL(string: urlString, relativeTo: baseUrl)
	} else {
		_url = fixedURL(string: urlString)
	}
	guard let url = _url else {
		return nil
	}
	guard let scheme = url.scheme else {
		return nil
	}
	/*
	 The issue still exists as of macOS 14.4, iOS 17.0
	 https://stackoverflow.com/questions/74445926/url-host-deprecated-but-replacement-crashes
	 https://forums.swift.org/t/does-url-query-percentencoded-calls-url-host-percentencoded-under-the-hood/70452
	 https://forums.developer.apple.com/forums/thread/722451
	 */
	guard let hostname = url.host else {
		return nil
	}
	var port = (url.port == nil) ? "" : String(url.port!)
	if (scheme == "http" && port == "80") { port = "" }
	if (scheme == "https" && port == "443") { port = "" }
	if #available(macOS 13.0, iOS 16.0, *) {
//		let hostname = url.host(percentEncoded: true) ?? ""
		let host = (port == "") ? hostname : "\(hostname):\(port)"
		let query = url.query(percentEncoded: true) ?? ""
		let fragment = url.fragment(percentEncoded: true) ?? ""
		return [
			"hash": fragment == "" ? "" : "#\(fragment)",
			"host": host,
			"hostname": hostname,
			// "href": url.absoluteString,
			"origin": "\(scheme)://\(host)",
			"password": url.password(percentEncoded: true) ?? "",
			"pathname": url.path(percentEncoded: true),
			"port": port,
			"protocol": "\(scheme):",
			"search": query == "" ? "" : "?\(query)",
			"username": url.user(percentEncoded: true) ?? ""
		]
	} else {
		let host = (port == "") ? hostname : "\(hostname):\(port)"
		let query = url.query ?? ""
		let fragment = url.fragment ?? ""
		/// If the path has a trailing slash, it is stripped. https://developer.apple.com/documentation/foundation/nsurl/1408809-path
		let strippedPath = url.path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? url.path
		let pathname = (strippedPath != "/" && url.hasDirectoryPath) ? "\(strippedPath)/" : strippedPath
		return [
			"hash": fragment == "" ? "" : "#\(fragment)",
			"host": host,
			"hostname": hostname,
			// "href": url.absoluteString,
			"origin": "\(scheme)://\(host)",
			"password": url.password ?? "",
			"pathname": pathname,
			"port": port,
			"protocol": "\(scheme):",
			"search": query == "" ? "" : "?\(query)",
			"username": url.user?.addingPercentEncoding(withAllowedCharacters: .urlUserAllowed) ?? ""
		]
	}
}
