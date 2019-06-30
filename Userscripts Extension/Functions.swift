//
//  Functions.swift
//  Userscripts Extension
//
//  Created by Justin Wasack on 4/26/19.
//  Copyright © 2019 Justin Wasack. All rights reserved.
//

import SafariServices

struct EditorData {
    static var code:String = ""
    static var lastEdited:String = ""
}

func saveToJSON() -> String? {
    let props = ["code": EditorData.code, "lastEdited": EditorData.lastEdited]
    do {
        let jsonData = try JSONSerialization.data(withJSONObject: props, options: .prettyPrinted)
        return String(data: jsonData, encoding: String.Encoding.utf8)
    } catch let error {
        print("error converting to json: \(error)")
        return nil
    }
}


func getCurrentDateTime() -> String {
    let date = Date()
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = .medium
    dateFormatter.timeStyle = .short
    return dateFormatter.string(from: date)
}

func openExtensionHomepage() {
    let url = URL(string: "https://github.com/quoid/userscripts")!
    SFSafariApplication.getActiveWindow { (activeWindow) in
        activeWindow?.openTab(with: url, makeActiveIfPossible: true, completionHandler: {_ in
            //print("loaded \(url)")
        })
    }
}

func downloadScript() {
    SFSafariApplication.getActiveWindow { (window) in
        window?.getActiveTab { (tab) in
            tab?.getActivePage { (page) in
                page?.dispatchMessageToScript(withName: "DOWNLOAD_SCRIPT", userInfo: ["code": EditorData.code])
            }
        }
    }
}

func saveData(code: String) {
    EditorData.code = code
    EditorData.lastEdited = getCurrentDateTime()
    let documentDirectory = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0] as String
    let path = documentDirectory.appending("/data.json")
    let fileContent:String = saveToJSON()!
    let fileURL = URL(fileURLWithPath: path)
    
    do {
        try fileContent.write(to: fileURL, atomically: false, encoding: .utf8)
    }
    catch {
        print("Error saving code file")
    }
    
}

func loadSavedData() {
    let fileManager = FileManager.default
    let documentDirectory = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0] as String
    let path = documentDirectory.appending("/data.json")
    let fileURL = URL(fileURLWithPath: path)
    if (fileManager.fileExists(atPath: path)) {
        do {
            let savedCode = try String(contentsOf: fileURL, encoding: .utf8)
            let data = Data(savedCode.utf8)
            if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                if let lastEdited = json["lastEdited"] as? String {
                    EditorData.lastEdited = lastEdited
                }
                if let code = json["code"] as? String {
                    EditorData.code = code
                }
            }
        }
        catch {
            print(error)
        }
    }
}

func setToggleStatus(status: String) {
    UserDefaults.standard.set(status, forKey: "ToggleStatus")
}
