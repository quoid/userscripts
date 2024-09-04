async function setValue(key, value) {
	if (typeof key !== "string" || !key.length) {
		return Promise.reject(new Error("setValue invalid key arg"));
	}
	const sid = this.US_filename;
	if (typeof sid !== "string" || !sid.length) {
		return Promise.reject(new Error("setValue invalid call"));
	}
	const item = {};
	item[`${sid}---${key}`] = value;
	return browser.storage.local.set(item);
}

async function getValue(key, defaultValue) {
	if (typeof key !== "string" || !key.length) {
		return Promise.reject(new Error("getValue invalid key arg"));
	}
	const sid = this.US_filename;
	if (typeof sid !== "string" || !sid.length) {
		return Promise.reject(new Error("getValue invalid call"));
	}
	const prefixedKey = `${sid}---${key}`;
	const results = await browser.storage.local.get(prefixedKey);
	if (prefixedKey in results) return results[prefixedKey];
	if (defaultValue !== undefined) return defaultValue;
	return undefined;
}

async function deleteValue(key) {
	if (typeof key !== "string" || !key.length) {
		return Promise.reject(new Error("deleteValue missing key arg"));
	}
	const sid = this.US_filename;
	if (typeof sid !== "string" || !sid.length) {
		return Promise.reject(new Error("deleteValue invalid call"));
	}
	const prefixedKey = `${sid}---${key}`;
	return browser.storage.local.remove(prefixedKey);
}

async function listValues() {
	const sid = this.US_filename;
	if (typeof sid !== "string" || !sid.length) {
		return Promise.reject(new Error("listValues invalid call"));
	}
	const prefix = `${sid}---`;
	const results = await browser.storage.local.get();
	const keys = [];
	for (const key in results) {
		key.startsWith(prefix) && keys.push(key.slice(prefix.length));
	}
	return keys;
}

async function sendMessageProxy(message) {
	try {
		/** @type {{status: "fulfilled"|"rejected", result: any}} */
		const response = await browser.runtime.sendMessage(message);
		if (response.status === "fulfilled") {
			return response.result;
		} else {
			return Promise.reject(response.result);
		}
	} catch (error) {
		console.error(error);
		return Promise.reject(error);
	}
}

async function openInTab(url, openInBackground = false) {
	try {
		new URL(url);
	} catch (error) {
		return Promise.reject(error);
	}
	return sendMessageProxy({
		name: "API_OPEN_TAB",
		url,
		active: !openInBackground,
	});
}

async function closeTab(tabId) {
	return sendMessageProxy({ name: "API_CLOSE_TAB", tabId });
}

async function getTab() {
	return sendMessageProxy({ name: "API_GET_TAB" });
}

async function saveTab(tabObj) {
	if (tabObj == null) return Promise.reject(new Error("saveTab invalid arg"));
	return sendMessageProxy({ name: "API_SAVE_TAB", tabObj });
}

async function addStyle(css) {
	if (typeof css !== "string" || !css.length) {
		return Promise.reject(new Error("addStyle invalid css arg"));
	}
	return sendMessageProxy({ name: "API_ADD_STYLE", css });
}

async function setClipboard(clipboardData, type) {
	return sendMessageProxy({
		name: "API_SET_CLIPBOARD",
		clipboardData,
		type,
	});
}

function xhr(details) {
	if (details == null) return console.error("xhr invalid details arg");
	if (!details.url) return console.error("xhr details missing url key");
	// generate random port name for single xhr
	const xhrPortName = Math.random().toString(36).substring(1, 9);
	// strip out functions from details
	const detailsParsed = JSON.parse(JSON.stringify(details));
	// get all the "on" events from XMLHttpRequest object
	const events = [];
	for (const k in XMLHttpRequest.prototype) {
		if (k.slice(0, 2) === "on") events.push(k);
	}
	// check which functions are included in the original details object
	// add a bool to indicate if event listeners should be attached
	for (const e of events) {
		if (typeof details[e] === "function") detailsParsed[e] = true;
	}
	// define return method, will be populated after port is established
	const response = {
		abort: () => console.error("xhr has not yet been initialized"),
	};
	// port listener, most of the messaging logic goes here
	const listener = (port) => {
		if (port.name !== xhrPortName) return;
		port.onMessage.addListener(async (msg) => {
			if (
				events.includes(msg.name) &&
				typeof details[msg.name] === "function"
			) {
				// process xhr response
				const r = msg.response;
				// only include responseText when needed
				if (["", "text"].includes(r.responseType)) {
					r.responseText = r.response;
				}
				/**
				 * only include responseXML when needed
				 * NOTE: Only add implementation at this time, not enable, to avoid
				 * unnecessary calculations, and this legacy default behavior is not
				 * recommended, users should explicitly use `responseType: "document"`
				 * to obtain it.
				if (r.responseType === "") {
					const mimeTypes = [
						"text/xml",
						"application/xml",
						"application/xhtml+xml",
						"image/svg+xml",
					];
					for (const mimeType of mimeTypes) {
						if (r.contentType.includes(mimeType)) {
							const parser = new DOMParser();
							r.responseXML = parser.parseFromString(r.response, "text/xml");
							break;
						}
					}
				}
				 */
				// only process when xhr is complete and data exist
				if (r.readyState === 4 && r.response !== null) {
					if (r.responseType === "arraybuffer") {
						// arraybuffer responses had their data converted in background
						// convert it back to arraybuffer
						try {
							r.response = new Uint8Array(r.response).buffer;
						} catch (err) {
							console.error("error parsing xhr arraybuffer", err);
						}
					}
					if (r.responseType === "blob") {
						// blob responses had their data converted in background
						// convert it back to blob
						try {
							const typedArray = new Uint8Array(r.response);
							const type = r.contentType ?? "";
							r.response = new Blob([typedArray], { type });
						} catch (err) {
							console.error("error parsing xhr blob", err);
						}
					}
					if (r.responseType === "document") {
						// document responses had their data converted in background
						// convert it back to document
						try {
							const parser = new DOMParser();
							const mimeType = r.contentType.includes("text/html")
								? "text/html"
								: "text/xml";
							r.response = parser.parseFromString(r.response, mimeType);
							r.responseXML = r.response;
						} catch (err) {
							console.error("error parsing xhr document", err);
						}
					}
				}
				// call userscript method
				details[msg.name](msg.response);
			}
			// all messages received
			// tell background it's safe to close port
			if (msg.name === "onloadend") {
				port.postMessage({ name: "DISCONNECT" });
			}
		});

		// handle port disconnect and clean tasks
		port.onDisconnect.addListener((p) => {
			if (p?.error) {
				console.error(`port disconnected due to an error: ${p.error.message}`);
			}
			browser.runtime.onConnect.removeListener(listener);
		});
		// fill the method returned to the user script
		response.abort = () => port.postMessage({ name: "ABORT" });
	};
	// wait for the background to establish a port connection
	browser.runtime.onConnect.addListener(listener);
	// pass the basic information to the background through a common message
	const message = {
		name: "API_XHR",
		details: detailsParsed,
		xhrPortName,
		events,
	};
	sendMessageProxy(message);
	return response;
}

export default {
	setValue,
	getValue,
	listValues,
	deleteValue,
	openInTab,
	getTab,
	saveTab,
	closeTab,
	addStyle,
	setClipboard,
	// notification,
	// registerMenuCommand,
	// getResourceUrl,
	xmlHttpRequest: xhr,
	GM_xmlhttpRequest: xhr,
};
