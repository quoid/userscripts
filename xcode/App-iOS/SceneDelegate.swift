//
//  SceneDelegate.swift
//  Userscripts-iOS
//
//  Created by Justin Wasack on 10/3/21.
//  Copyright © 2021 Justin Wasack. All rights reserved.
//

import UIKit

// https://developer.apple.com/documentation/uikit/app_and_environment/managing_your_app_s_life_cycle
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

	var window: UIWindow?

	func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
		guard let _ = (scene as? UIWindowScene) else { return }
	}

	func sceneWillResignActive(_ scene: UIScene) {
		USLogStoreToFile()
	}

	func sceneWillEnterForeground(_ scene: UIScene) {
		if let viewController = window?.rootViewController as? ViewController {
			viewController.updateEnableLoggerState()
		}
	}

}
