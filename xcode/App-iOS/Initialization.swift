import Foundation

private let logger = USLogger(#fileID)

private func createDemoScript() {
    let demoScript = """
// ==UserScript==
// @name         Demo user script
// @description  I am a demo user script that you can safely delete (add any files to this folder and I will no longer automatically generate)
// @author       Userscripts
// @version      0.0.1
// @match        *://*/*
// @grant        none
// @inject-into  content
// ==/UserScript==

(function () {
    'use strict';
    // here is your code
})();
"""
    let url = getDocumentsDirectory()
    // get a list of non-hidden files
    guard let contents = try? FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: [], options: .skipsHiddenFiles) else {
        logger?.error("\(#function, privacy: .public) - failed get contentsOfDirectory")
        return
    }
    if contents.isEmpty {
        let fileURL = url.appendingPathComponent("Demo_user_script.user.js")
        do {
            logger?.info("\(#function, privacy: .public) - try to write demo user script")
            try demoScript.write(to: fileURL, atomically: true, encoding: .utf8)
        } catch {
            logger?.error("\(#function, privacy: .public) - failed to write demo user script")
        }
    }
}

func initializeFirstStart() {
    // set the scripts directory to the app document on first use
    if isCurrentDefaultScriptsDirectory() {
        logger?.info("\(#function, privacy: .public) - Initialize default directory")
        Preferences.scriptsDirectoryUrl = getDocumentsDirectory()
    }
    // put a visible file to display the documents directory in files app
    if isCurrentInitialScriptsDirectory() {
        createDemoScript()
    }
}
