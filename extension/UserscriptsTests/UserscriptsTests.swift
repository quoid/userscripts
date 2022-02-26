//
//  UserscriptsTests.swift
//  UserscriptsTests
//
//  Created by Justin Wasack on 1/23/22.
//  Copyright © 2022 Justin Wasack. All rights reserved.
//

import XCTest
@testable import Userscripts_Extension

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
        let urls = [
            "https://greasyfork.org/scripts/416338-redirect-外链跳转/code/redirect%20外链跳转.user.js",
            "https://greasyfork.org/scripts/416338-redirect-外链跳转/code/redirect 外链跳转.user.js",
            "https://raw.githubusercontent.com/Anarios/return-youtube-dislike/main/Extensions/UserScript/Return%20Youtube%20Dislike.user.js",
            "https://cdn.frankerfacez.com/static/ffz_injector.user.js",
            "http://www.k21p.com/example.user.js" // add http protocol
        ]
        var result = [String]()
        for url in urls {
            if let contents = getRemoteFileContents(url) {
                result.append(contents)
            }
        }
        XCTAssert(result.count == urls.count)
    }

    func testPerformanceExample() throws {
        // This is an example of a performance test case.
        measure {
            // Put the code you want to measure the time of here.
        }
    }

}
