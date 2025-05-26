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

declare namespace TypeBackground {
	interface XHRMessage {
		handler: string;
		progress?: TypeExtMessages.XHRProgress;
		response?: TypeExtMessages.XHRTransportableResponse;
	}

	interface XHRPort extends Browser.Runtime.Port {
		onMessage: Browser.Events.Event<
			(message: TypeContentScripts.XHRMessage, port: XHRPort) => void
		>;
		postMessage: (message: XHRMessage) => void;
	}
}

declare namespace TypeContentScripts {
	interface XHRMessage {
		name: string;
	}

	interface XHRPort extends Browser.Runtime.Port {
		onMessage: Browser.Events.Event<
			(message: TypeBackground.XHRMessage, port: XHRPort) => void
		>;
		postMessage(message: XHRMessage): void;
	}
}
