async function initialize() {
	const key = "US_AUGMENTED_USERJS_INSTALL";
	if ((await browser.storage.local.get(key))[key] === false) return;

	browser.runtime.sendMessage({ name: "WEB_USERJS_POPUP" });
}

initialize();
