//
//  UserscriptsTests.swift
//  UserscriptsTests
//
//  Created by Justin Wasack on 1/23/22.
//  Copyright © 2022 Justin Wasack. All rights reserved.
//

import XCTest
@testable import Userscripts_Mac_Safari_Extension

class UserscriptsTests: XCTestCase {

	override func setUpWithError() throws {
		// Put setup code here. This method is called before the invocation of each test method in the class.
	}

	override func tearDownWithError() throws {
		// Put teardown code here. This method is called after the invocation of each test method in the class.
	}


	func testExample() throws {
		// This is an example of a functional test case.
		// Use XCTAssert and related functions to verify your tests produce the correct results.
		// Any test you write for XCTest can be annotated as throws and async.
		// Mark your test throws to produce an unexpected failure when your test encounters an uncaught error.
		// Mark your test async to allow awaiting for asynchronous code to complete. Check the results with assertions afterwards.
	}

	func testStringSanitization() throws {
		// given
		let strs = [
			"String",
			"https://something.com/?foo=12",
			"I have backslashes \\\\",
			".....ok",
			":Akneh.,><>dkie:lm",
			"..解锁B站大会员番剧、",
			"解锁B站大会员番剧、B站视频解析下载；全网VIP视频免费破解去广告；全网音乐直接下载；油管、Facebook等国外视频解析下载；网盘搜索引擎破解无限下载等",
			"5CLksm3AAbb2F2F2f----___--+87363&^#%o%3O3",
			"Example Userscript Name"
		]

		// when
		var result = [String]()
		for str in strs {
			let sanitizedString = sanitize(str)
			let unsanitizedString = unsanitize(sanitizedString)
			result.append(unsanitizedString)
		}

		// then
		XCTAssert(result.elementsEqual(strs))
	}

	func testEncodedCheck() throws {
		let urls = [
			"https://greasyfork.org/scripts/416338-redirect-外链跳转/code/redirect%20外链跳转.user.js",
			"https://raw.githubusercontent.com/Anarios/return-youtube-dislike/main/Extensions/UserScript/Return%20Youtube%20Dislike.user.js",
			"https://cdn.frankerfacez.com/static/ffz_injector.user.js",
			"http://www.k21p.com/example.user.js", // add http protocol
			"https://example.test/%%%test.user.js", // removingPercentEncoding -> nil
			"https://greasyfork.org/scripts/416338-redirect-外链跳转/code/redirect 外链跳转.user.js"
		]
		var result = [String]()
		for url in urls {
			if isEncoded(url) {
				result.append(url)
			}
		}
		// 2 urls already percent encoded
		XCTAssert(result.count == 2)
	}

	func testGetRemoteFileContents() throws {
		var urls:[String] = [
			"https://greasyfork.org/scripts/416338-redirect-外链跳转/code/redirect%20外链跳转.user.js",
			"https://greasyfork.org/scripts/416338-redirect-外链跳转/code/redirect 外链跳转.user.js",
			"https://update.greasyfork.org/scripts/460897/1277476/gbCookies.js#sha256-Sv+EuBerch8z/6LvAU0m/ufvjmqB1Q/kbQrX7zAvOPk=",
			"https://raw.githubusercontent.com/Anarios/return-youtube-dislike/main/Extensions/UserScript/Return%20Youtube%20Dislike.user.js",
			"https://cdn.frankerfacez.com/static/ffz_injector.user.js",
			"http://www.k21p.com/example.user.js" // add http protocol
		]
		if #available(macOS 14.0, iOS 17.0, *) {
			urls += [
				"https://☁️.com/", // IDN / Non-Punycode-encoded domain name
			]
		}
		for url in urls {
			if getRemoteFileContents(url) == nil {
				print(#function, url)
				XCTAssert(false)
			}
		}
	}

	func testFileRemoteUpdate() throws {
		let urls = [
			"https://www.k21p.com/example.user.js",
			"https://www.k21p.com/example.user.js?foo=bar", // query string
			"http://www.k21p.com/example.user.js", // http protocol
			"https://greasyfork.org/scripts/416338-redirect-外链跳转/code/redirect 外链跳转.user.js", // non latin chars
			"https://www.k21p.com/example.user.jsx" // should fail

		]
		var result = [Int]()
		for url in urls {
			let content = """
			// ==UserScript==
			// @name test
			// @match       *://*/*
			// @version 0.1
			// @updateURL http://www.k21p.com/example.user.js
			// @downloadURL \(url)
			// ==/UserScript==
			""";
			let response = getFileRemoteUpdate(content)
			if !response.keys.contains("error") {
				result.append(1)
			}
		}
		XCTAssert(result.count == (urls.count - 1))
	}

	func testMatching() throws {
		/// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#examples
		let patternDict = [
			"<all_urls>": [
				"http://example.org/",
				"https://a.org/some/path/"
			],
			"*://*/*": [
				"http://example.org/",
				"https://a.org/some/path/",
				"https://www.example.com/",
				"https://example.org/foo/bar.html",
				"https://☁️.com/",
				"https://🙂.☁️/",
			],
			"*://*.mozilla.org/*": [
				"http://mozilla.org/",
				"https://mozilla.org/",
				"http://a.mozilla.org/",
				"http://a.b.mozilla.org/",
				"https://b.mozilla.org/path/",
			],
			"*://mozilla.org/": [
				"http://mozilla.org/",
				"https://mozilla.org/",
			],
			"https://*/path": [
				"https://mozilla.org/path",
				"https://a.mozilla.org/path",
				"https://something.com/path",
			],
			"https://*/path/": [
				"https://mozilla.org/path/",
				"https://a.mozilla.org/path/",
				"https://something.com/path/",
			],
			"https://mozilla.org/*": [
				"https://mozilla.org/",
				"https://mozilla.org/path",
				"https://mozilla.org/another",
				"https://mozilla.org/path/to/doc",
				"https://mozilla.org/path/to/doc?foo=1",
			],
			"https://mozilla.org/a/b/c/": [
				"https://mozilla.org/a/b/c/",
				"https://mozilla.org/a/b/c/#section1",
			],
			"https://mozilla.org/*/b/*/": [
				"https://mozilla.org/a/b/c/",
				"https://mozilla.org/d/b/f/",
				"https://mozilla.org/a/b/c/d/",
				"https://mozilla.org/a/b/c/d/#section1",
				"https://mozilla.org/a/b/c/d/?foo=/",
				"https://mozilla.org/a?foo=21314&bar=/b/&extra=c/",
			],
			"*://www.google.com/*": [
				"https://www.google.com/://aa",
				"https://www.google.com/preferences?prev=https://www.google.com/",
				"https://www.google.com/preferences?prev=",
				"https://www.google.com/",
			],
			"*://localhost/*": [
				"http://localhost:8000/",
				"https://localhost:3000/foo.html",
			],
			"http://127.0.0.1/*": [
				"http://127.0.0.1/",
				"http://127.0.0.1/foo/bar.html",
				"http://127.0.0.1/?bar=1",
				"http://127.0.0.1/foo?bar=1",
			],
			"*://*.example.com/*?a=1*": [
				"http://example.com/?a=1",
				"https://www.example.com/index?a=1&b=2",
			],
			"*://*.example.com/path/": [
				"http://example.com/path/",
				"http://a.example.com/path/",
				"https://example.com/path/",
				"https://a.b.example.com/path/",
				"https://☁️.example.com/path/",
			],
			"*://*.example.com/path/*": [
				"https://example.com/path/",
				"https://example.com/path/foo",
				"https://example.com/path/foo?bar",
				"https://example.com/path/?foo=bar",
				"https://example.com/path/☁️?☁️=🙂",
			],
		]
		let patternDictFails = [
			"*://*/*": [
				"ftp://ftp.example.org/", // unmatched scheme)
				"file:///a/", // unmatched scheme
			],
			"*://*.mozilla.org/*": [
				"ftp://mozilla.org/", // unmatched scheme
				"http://mozilla.com/", // unmatched host
				"http://firefox.org/", // unmatched host
			],
			"*://mozilla.org/": [
				"ftp://mozilla.org/", // unmatched scheme
				"http://a.mozilla.org/", // unmatched host
				"http://mozilla.org/a", // unmatched path
			],
			"https://*/path": [
				"http://mozilla.org/path", // unmatched scheme
				"https://mozilla.org/path/", // unmatched path
				"https://mozilla.org/a", // unmatched path
				"https://mozilla.org/", // unmatched path
				"https://mozilla.org/path?foo=1", // unmatched path due to URL query string
			],
			"https://*/path/": [
				"http://mozilla.org/path/", // unmatched scheme
				"https://mozilla.org/path", // unmatched path
				"https://mozilla.org/a", // unmatched path
				"https://mozilla.org/", // unmatched path
				"https://mozilla.org/path/?foo=1", // unmatched path due to URL query string
			],
			"https://mozilla.org/*": [
				"http://mozilla.org/path", // unmatched scheme
				"https://mozilla.com/path", // unmatched host
			],
			"https://mozilla.org/*/b/*/": [
				"https://mozilla.org/b/*/", // unmatched path
				"https://mozilla.org/a/b/", // unmatched path
				"https://mozilla.org/a/b/c/d/?foo=bar", // unmatched path due to URL query string
			],
			"https://www.example.com/*": [
				"file://www.example.com/",
				"ftp://www.example.com/",
				"ws://www.example.com/",
				"http://www.example.com/",
			],
			"http://www.example.com/index.html": [
				"http://www.example.com/",
				"https://www.example.com/index.html",
			],
			"*://localhost/*": [
				"https://localhost.com/",
				"ftp://localhost:8080/",
			],
			"https://www.example*/*": [
				"https://www.example.com/",
			],
			"*://*.example.com/*?a=1*": [
				"http://example.com/",
				"https://www.example.com/?a=2",
			],
			"*://*.example.com/foo/": [
				"https://example.com/foo",
				"https://example.com/foo?bar",
				"https://example.com/foo/bar",
				"https://example.com/foo/?bar",
			],
		]
		for (pattern, urls) in patternDict {
			for url in urls {
				if !match(url, pattern) {
					print(#function, "patternDict", url, pattern)
					XCTAssert(false)
				}
			}
		}
		for (pattern, urls) in patternDictFails {
			for url in urls {
				if match(url, pattern) {
					print(#function, "patternDictFails", url, pattern)
					XCTAssert(false)
				}
			}
		}
	}

	func testPerformanceExample() throws {
		// This is an example of a performance test case.
		measure {
			// Put the code you want to measure the time of here.
		}
	}

}
