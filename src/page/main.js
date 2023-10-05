import "./app.css";
import "../shared/reset.css";
import "../shared/variables.css";
import App from "./App.svelte";
import "./cm.css";

if (import.meta.env.MODE === "development") { // vite feat that only import in dev mode
    const modules = import.meta.glob("../shared/dev.js", {eager: true});
    window.browser = modules["../shared/dev.js"].browser;
    console.info("DEV-ENV", import.meta.env, modules, browser);
}

const app = new App({
    target: document.getElementById("app")
});

export default app;
