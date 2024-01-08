import "../shared/reset.css";
import "../shared/variables.css";
import "./app.css";
import App from "./App.svelte";
import Appios from "./Appios.svelte";

// vite feat that only import in dev mode
if (import.meta.env.MODE === "development") {
	const modules = import.meta.glob("../shared/dev.js", { eager: true });
	const browser = modules["../shared/dev.js"]["browser"];
	console.debug("DEV-ENV", import.meta.env, modules, browser);
	if (!window?.browser?.extension) {
		// assign to window simulation WebExtension APIs
		window.browser = browser;
	}
}

let app;
const target = document.getElementById("app");
if (import.meta.env.MODE === "development") {
	const platform = await browser.runtime.getPlatformInfo();
	// @ts-ignore -- incomplete polyfill types
	if (platform.os === "ios") {
		app = new Appios({ target });
	} else {
		app = new App({ target });
	}
} else {
	if (import.meta.env.SAFARI_PLATFORM === "ios") {
		app = new Appios({ target });
	} else {
		app = new App({ target });
	}
}

// const app = new App({
// 	target: document.getElementById("app"),
// });

export default app;
