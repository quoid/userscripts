let url;

async function injection() {
	const tabUrl = new URL(location.href);
	let links;
	if (tabUrl.hostname.endsWith("greasyfork.org")) {
		links = document.querySelectorAll(
			'#install-area a.install-link[data-install-format="js"]',
		);
	}
	for (const link of links) {
		if (link["href"]) url = link["href"];
		link.addEventListener(
			"click",
			(e) => {
				e.stopImmediatePropagation();
				e.preventDefault();
				browser.runtime.sendMessage({ name: "WEB_USERJS_POPUP" });
			},
			true,
		);
	}
}

async function listeners() {
	/**
	 * handle messages from background, popup, etc...
	 * @type {import("webextension-polyfill").Runtime.OnMessageListener}
	 */
	const handleMessage = async (message) => {
		if (import.meta.env.MODE === "development") {
			console.debug(message, url);
		}
		if (message === "TAB_CLICK_USERJS") {
			return url;
		}
	};
	/** Dynamically remove listeners to avoid memory leaks */
	if (document.visibilityState === "visible") {
		browser.runtime.onMessage.addListener(handleMessage);
	}
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			browser.runtime.onMessage.removeListener(handleMessage);
		} else {
			browser.runtime.onMessage.addListener(handleMessage);
		}
	});
}

async function initialize() {
	// avoid duplicate injection of content scripts
	if (window["CS_ENTRY_SCRIPT_MARKET"]) return;
	window["CS_ENTRY_SCRIPT_MARKET"] = 1;
	// check user settings
	const key = "US_AUGMENTED_USERJS_INSTALL";
	if ((await browser.storage.local.get(key))[key] === false) return;
	// actual execution content
	injection();
	listeners();
}

initialize();
