import "../shared/reset.css";
import "../shared/variables.css";
import "./app.css";
import App from "./App.svelte";

// vite feat that only import in dev mode
if (import.meta.env.MODE === "development") {
	const modules = import.meta.glob("../shared/dev.js", { eager: true });
	window.browser = modules["../shared/dev.js"].browser;
	console.info("DEV-ENV", import.meta.env, modules, browser);
}

const app = new App({
	target: document.getElementById("app"),
});

export default app;
