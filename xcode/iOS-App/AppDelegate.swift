//
//  AppDelegate.swift
//  Userscripts-iOS
//
//  Created by Justin Wasack on 10/3/21.
//  Copyright © 2021 Justin Wasack. All rights reserved.
//

import UIKit
import os

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        let logger = USLogger(#fileID)
        // set the scripts directory to the app document on first use
        if Preferences.scriptsDirectoryUrl == getDefaultScriptsDirectoryUrl() {
            logger?.info("\(#function, privacy: .public) - Initialize default directory")
            Preferences.scriptsDirectoryUrl = getDocumentsDirectory()
        }
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

}
