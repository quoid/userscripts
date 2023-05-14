import {Browser} from "webextension-polyfill";

export {};

declare global {
	var browser: Browser;
	const webkit: any;
	interface Window {
		show: (
			platform: "ios" | "mac",
			enabled: boolean,
			useSettingsInsteadOfPreferences: boolean
		) => void;
	}
}
