import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as? NSExtensionItem
        let message = item?.userInfo?[SFExtensionMessageKey] as? [String: Any]
        guard
            let name = message?["name"] as? String,
            let data = message?["data"] as? [String: Any],
            let tabId = data["tabId"] as? Int
        else {
            // log error
            return
        }
        let response = NSExtensionItem()
        if name == "MESSAGE_01" {
            response.userInfo = [ SFExtensionMessageKey: ["name": "RESPONSE_01", "tabId": tabId] ]
        } else {
            response.userInfo = [ SFExtensionMessageKey: ["name": "RESPONSE_02", "tabId": tabId] ]
        }
        // emulate some delay/async
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            context.completeRequest(returningItems: [response], completionHandler: nil)
        }
    }
}
