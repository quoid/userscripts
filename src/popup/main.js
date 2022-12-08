import "./app.css";
import "../shared/reset.css";
import "../shared/variables.css";
import App from "./App.svelte";

if (import.meta.env.DEV) { // vite feat that only import in dev mode
    const modules = import.meta.glob("../shared/dev.js", {eager: true});
    // eslint-disable-next-line no-global-assign
    browser = modules["../shared/dev.js"].browser;
    console.log(import.meta.env, modules, browser);
}

const app = new App({
    target: document.getElementById("app")
});

export default app;
