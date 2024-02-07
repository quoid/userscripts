async function initialize() {
	// avoid duplicate injection of content scripts
	if (window["CS_ENTRY_DOT_USER_JS"]) return;
	window["CS_ENTRY_DOT_USER_JS"] = 1;
	// check user settings
	const key = "US_AUGMENTED_USERJS_INSTALL";
	if ((await browser.storage.local.get(key))[key] === false) return;
	// actual execution content
	browser.runtime.sendMessage({ name: "WEB_USERJS_POPUP" });
}

initialize();
