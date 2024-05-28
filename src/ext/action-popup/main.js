import "../shared/reset.css";
import "../shared/variables.css";
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

// vite feat that only import in dev mode
if (import.meta.env.MODE === "development") {
	const modules = import.meta.glob("../shared/dev.js", { eager: true });
	const browser = modules["../shared/dev.js"]["browser"];
	console.debug("DEV-ENV", import.meta.env, modules, browser);
	if (!window?.browser?.extension) {
		// assign to window simulation WebExtension APIs
		window.browser = browser;
		// macos popup simulation
		const style = document.createElement("style");
		style.textContent = `
body {
	top: 20px;
	left: 20px;
	box-sizing: content-box;
	border: 2px solid #0c0e0f;
	border-radius: 10px;
	box-shadow: 2px 2px 20px rgba(0, 0, 0, 0.2);
}
body:before {
	content: "";
	position: absolute;
	top: -1px;
	left: -1px;
	right: -1px;
	bottom: -1px;
	border: 1px solid #54575a;
	border-radius: 9px;
}
`;
		browser.platform === "macos" && document.head.append(style);
	}
}

const app = mount(App, { target: document.getElementById("app") });

export default app;
