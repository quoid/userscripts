import "./reset.css";
import "@shared/variables.css";
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

if (import.meta.env.MODE === "development") {
	// Simulation in non-WkWebView dev environment
	if (import.meta.env.SAFARI_PLATFORM === undefined) {
		console.warn("Simulation webkit...");
		window.webkit = {
			messageHandlers: {
				controller: {
					postMessage: async (message) => {
						switch (message) {
							case "INIT":
								return {
									build: "2",
									directory: "Userscripts App Documents",
									enableLogger: true,
									extStatus: "unknown",
									firstRunTime: 1,
									maxLogFileSize: 500_000_000,
									platform: "mac",
									promptLogger: true,
									useSettingsInsteadOfPreferences: true,
									version: "2.0.0",
								};
							default:
								console.debug("Simulation.webkit.messageHandler:", message);
								break;
						}
					},
				},
			},
		};
	}
}

const app = mount(App, { target: document.getElementById("app") });

export default app;
