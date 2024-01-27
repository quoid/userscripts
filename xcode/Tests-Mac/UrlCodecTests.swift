import XCTest

final class UrlCodecTests: XCTestCase {

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

    func testPerformanceExample() throws {
        // This is an example of a performance test case.
        self.measure {
            // Put the code you want to measure the time of here.
        }
    }
    
    func testEncodeURI() throws {
        
        func check(_ urlString: String, _ res: String) -> Bool {
            let url = encodeURI(urlString)
            if (url != res) {
                print(urlString, url)
                return false
            }
            return true
        }
        
        XCTAssert(check("http://user:password@host:80/path?q=1#id",
                        "http://user:password@host:80/path?q=1#id"))

        XCTAssert(check("https://用户名:密码@中.文:80/path/中文/?a=中文#中文",
                        "https://%E7%94%A8%E6%88%B7%E5%90%8D:%E5%AF%86%E7%A0%81@%E4%B8%AD.%E6%96%87:80/path/%E4%B8%AD%E6%96%87/?a=%E4%B8%AD%E6%96%87#%E4%B8%AD%E6%96%87"))

        XCTAssert(check("https://用户名:密码@中.文:80/path/中%E6%96%87/?a=中&b=%E6%96%87&c#中文",
                        "https://%E7%94%A8%E6%88%B7%E5%90%8D:%E5%AF%86%E7%A0%81@%E4%B8%AD.%E6%96%87:80/path/%E4%B8%AD%25E6%2596%2587/?a=%E4%B8%AD&b=%25E6%2596%2587&c#%E4%B8%AD%E6%96%87"))

    }
    
    func testJsLikeURL() throws {
        
        func diffPrint(_ dA: Dictionary<String, String>?, _ dB: Dictionary<String, String>) {
            guard let dA = dA else {
                return print("dA is nil")
            }
            for k in dA.keys {
                if dA[k] != dB[k] {
                    print(k, dA[k] ?? "nil", dB[k] ?? "nil")
                }
            }
        }
        
        func check(_ urlString: String, _ res: Dictionary<String, String>) -> Bool {
            let url = jsLikeURL(urlString)
            if (url != res) {
                print(urlString)
                diffPrint(url, res)
                return false
            }
            return true
        }
        
        /** javascript get res
         url = new URL("http://user:password@host:80/path?q=1#id")
         res = {}
         for(let k of ["hash","host","hostname","href","origin","password","pathname","port","protocol","search","username"]){
           res[k] = url[k];
         }
         JSON.stringify(res)
         */
        
        XCTAssert(check("http://user:password@host:80/path?q=1#id", [
            "hash": "#id",
            "host": "host",
            "hostname": "host",
            // "href": "http://user:password@host/path?q=1#id",
            "origin": "http://host",
            "password": "password",
            "pathname": "/path",
            "port": "",
            "protocol": "http:",
            "search": "?q=1",
            "username": "user"
        ]))
        
        XCTAssert(check("http://host.test:8080/path?#id", [
            "hash": "#id",
            "host": "host.test:8080",
            "hostname": "host.test",
            // "href": "http://host.test:8080/path?#id",
            "origin": "http://host.test:8080",
            "password": "",
            "pathname": "/path",
            "port": "8080",
            "protocol": "http:",
            "search": "",
            "username": ""
        ]))
        
        XCTAssert(check("http://host.test:8080/path?", [
            "hash": "",
            "host": "host.test:8080",
            "hostname": "host.test",
            // "href": "http://host.test:8080/path?",
            "origin": "http://host.test:8080",
            "password": "",
            "pathname": "/path",
            "port": "8080",
            "protocol": "http:",
            "search": "",
            "username": ""
        ]))
        
        XCTAssert(check("http://host.test/path#id", [
            "hash": "#id",
            "host": "host.test",
            "hostname": "host.test",
            // "href": "http://host.test/path#id",
            "origin": "http://host.test",
            "password": "",
            "pathname": "/path",
            "port": "",
            "protocol": "http:",
            "search": "",
            "username": ""
        ]))
        
        XCTAssert(check("http://host.test/path", [
            "hash": "",
            "host": "host.test",
            "hostname": "host.test",
            // "href": "http://host.test/path",
            "origin": "http://host.test",
            "password": "",
            "pathname": "/path",
            "port": "",
            "protocol": "http:",
            "search": "",
            "username": ""
        ]))
        
        XCTAssert(check("http://host.test/", [
            "hash": "",
            "host": "host.test",
            "hostname": "host.test",
            // "href": "http://host.test/",
            "origin": "http://host.test",
            "password": "",
            "pathname": "/",
            "port": "",
            "protocol": "http:",
            "search": "",
            "username": ""
        ]))
        
        XCTAssert(check("https://用户名:密码@host.test:80/path/中%E6%96%87/?a=中&b=%E6%96%87&c#中文", [
            "hash": "#%E4%B8%AD%E6%96%87",
            "host": "host.test:80",
            "hostname": "host.test",
            // "href": "https://%E7%94%A8%E6%88%B7%E5%90%8D:%E5%AF%86%E7%A0%81@host.test:80/path/%E4%B8%AD%E6%96%87/?a=%E4%B8%AD&b=%E6%96%87&c#%E4%B8%AD%E6%96%87",
            "origin": "https://host.test:80",
            "password": "%E5%AF%86%E7%A0%81",
            "pathname": "/path/%E4%B8%AD%E6%96%87/",
            "port": "80",
            "protocol": "https:",
            "search": "?a=%E4%B8%AD&b=%E6%96%87&c",
            "username": "%E7%94%A8%E6%88%B7%E5%90%8D"
        ]))
        
        if #available(macOS 14.0, iOS 17.0, *) {
            XCTAssert(check("https://用户名:密码@中.文:80/path/中%E6%96%87/?a=中&b=%E6%96%87&c#中文", [
                "hash": "#%E4%B8%AD%E6%96%87",
                "host": "xn--fiq.xn--7dv:80",
                "hostname": "xn--fiq.xn--7dv",
                // "href": "https://%E7%94%A8%E6%88%B7%E5%90%8D:%E5%AF%86%E7%A0%81@xn--fiq.xn--7dv:80/path/%E4%B8%AD%E6%96%87/?a=%E4%B8%AD&b=%E6%96%87&c#%E4%B8%AD%E6%96%87",
                "origin": "https://xn--fiq.xn--7dv:80",
                "password": "%E5%AF%86%E7%A0%81",
                "pathname": "/path/%E4%B8%AD%E6%96%87/",
                "port": "80",
                "protocol": "https:",
                "search": "?a=%E4%B8%AD&b=%E6%96%87&c",
                "username": "%E7%94%A8%E6%88%B7%E5%90%8D"
            ]))
        }

    } // testJsLikeURL() -> END

}
