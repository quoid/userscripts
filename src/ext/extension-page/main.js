import "../shared/reset.css";
import "../shared/variables.css";
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import Appios from "./Appios.svelte";

// vite feat that only import in dev mode
if (import.meta.env.MODE === "development") {
	const modules = import.meta.glob("../shared/dev.js", { eager: true });
	const browser = modules["../shared/dev.js"]["browser"];
	console.debug("DEV-ENV", import.meta.env, modules, browser);
	// basic dev mode relies on extension environment simulation
	if (!window?.browser?.extension) {
		// assign to window simulation WebExtension APIs
		window.browser = browser;
		// pre-fetch i18n resource registration to window
		const lang = window.navigator.language.replace("-", "_");
		let url = "/public/ext/shared/_locales/en/messages.json";
		if (lang.startsWith("zh")) {
			url = "/public/ext/shared/_locales/zh/messages.json";
		}
		// demo build for non-extension environment (gh-pages)
		if (import.meta.env.EXT_DEMO_BUILD) {
			url = "/_locales/en/messages.json";
			if (["zh_HK", "zh_MO", "zh_TW"].includes(lang)) {
				url = `/_locales/${lang}/messages.json`;
			} else if (lang.startsWith("zh")) {
				url = `/_locales/zh/messages.json`;
			}
		}
		try {
			const response = await fetch(url);
			const messages = await response.json();
			window["i18nMessages"] = messages;
		} catch (error) {
			console.error("Fetch i18n faild", error);
		}
	}
}

let app;
const target = document.getElementById("app");
if (import.meta.env.MODE === "development") {
	const platform = await browser.runtime.getPlatformInfo();
	// @ts-ignore -- incomplete polyfill types
	if (platform.os === "ios") {
		app = mount(Appios, { target });
	} else {
		app = mount(App, { target });
	}
} else {
	if (import.meta.env.SAFARI_PLATFORM === "ios") {
		app = mount(Appios, { target });
	} else {
		app = mount(App, { target });
	}
}

export default app;
