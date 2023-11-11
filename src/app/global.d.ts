// https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html

/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
	interface Window {
		APP: {
			show: (
				platform: "ios" | "mac",
				enabled: boolean,
				useSettingsInsteadOfPreferences: boolean,
			) => void;
			printVersion: (v: string, b: string) => void;
			printDirectory: (d: string) => void;
		};
		webkit: {
			messageHandlers: {
				controller: {
					postMessage: function;
				};
			};
		};
	}
}

export {};
