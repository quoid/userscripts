//
//  PopoverView.swift
//  Userscripts Extension
//
//  Created by Justin Wasack on 3/6/21.
//  Copyright © 2021 Justin Wasack. All rights reserved.
//

import SafariServices

class PopoverView: SFSafariExtensionViewController {

    @IBOutlet weak var label01: NSTextField!
    @IBOutlet weak var activeCheckbox: NSButton!
    
    @IBAction func openButton(_ sender: Any) {
        SFSafariExtension.getBaseURI { baseURI in
            guard let baseURI = baseURI else { return }
            SFSafariApplication.getActiveWindow { (window) in
                window?.openTab(with: baseURI.appendingPathComponent("index.html"), makeActiveIfPossible: true) { (tab) in
                    //print(baseURI)
                }
            }
            self.dismissPopover()
        }
    }
    
    @IBAction func disableInjection(_ sender: Any) {
        guard var settings = getManifestKeys()?.settings else { return }
        if activeCheckbox.state == .on {
            // when the checkbox is not ticked
            // enable injection
            settings.updateValue("true", forKey: "active")
        } else {
            // when the checkbox is ticked
            // disable injection
            settings.updateValue("false", forKey: "active")
        }
        if !updateSettings(settings) {
            err("disable injection from popover failed!")
        }
    }
    
    static let shared: PopoverView = {
        let shared = PopoverView()
        shared.preferredContentSize = NSSize(width:320, height:88)
        return shared
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
    }
    
    override func viewWillAppear() {
        super.viewWillAppear()
        if let manifestKeys = getManifestKeys() {
            if let active = manifestKeys.settings["active"] {
                if active == "true" {
                    activeCheckbox.state = .on
                } else {
                    activeCheckbox.state = .off
                }
            }
        }
    }
    
}
