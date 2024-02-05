let url;

async function injection() {
	const links = document.querySelectorAll("#install-area a.install-link");
	for (const link of links) {
		if (!url) url = link["href"];
		console.debug(link);
		link.addEventListener(
			"click",
			(e) => {
				url = link["href"];
				e.stopImmediatePropagation();
				e.preventDefault();
				browser.runtime.sendMessage({ name: "WEB_USERJS_POPUP" });
			},
			true,
		);
	}
}

async function listeners() {
	browser.runtime.onMessage.addListener(async (message) => {
		if (import.meta.env.MODE === "development") {
			console.debug(message, url);
		}
		if (message === "USERJS") return url;
	});
}

async function initialize() {
	// avoid duplicate injection of content scripts
	if (window["CS_ENTRY_GREASYFORK"]) return;
	window["CS_ENTRY_GREASYFORK"] = 1;
	// check user settings
	const key = "US_AUGMENTED_USERJS_INSTALL";
	if ((await browser.storage.local.get(key))[key] === false) return;
	// actual execution content
	injection();
	listeners();
}

initialize();
