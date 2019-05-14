//
//  ViewController.swift
//  Userscripts
//
//  Created by Justin Wasack on 4/25/19.
//  Copyright © 2019 Justin Wasack. All rights reserved.
//

import Cocoa
import SafariServices.SFSafariApplication

class ViewController: NSViewController {

    @IBOutlet var appNameLabel: NSTextField!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        let appVersion = Bundle.main.infoDictionary!["CFBundleShortVersionString"] as! String
        self.appNameLabel.stringValue = "Userscripts - Version \(appVersion)";
    }
    
    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.userscripts.macos.Userscripts-Extension") { error in
            if let _ = error {
                // Insert code to inform the user that something went wrong.
            }
        }
    }
}
