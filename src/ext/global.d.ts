// https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html

/// <reference types="svelte" />
/// <reference types="vite/client" />

import type Browser from "webextension-polyfill";

declare global {
	const browser: Browser.Browser;
	interface Window {
		browser: Browser.Browser;
	}
}
