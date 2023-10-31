function setValue(key, value) {
	if (typeof key !== "string" || !key.length) {
		return console.error("setValue invalid key arg");
	}
	if (value == null) {
		return console.error("setValue invalid value arg");
	}
	return new Promise((resolve) => {
		const item = {};
		item[`${this.US_filename}---${key}`] = value;
		browser.storage.local.set(item, () => resolve({ success: 1 }));
	});
}

function getValue(key, defaultValue) {
	if (typeof key !== "string" || !key.length) {
		return console.error("getValue invalid key arg");
	}
	const prefixedKey = `${this.US_filename}---${key}`;
	return new Promise((resolve) => {
		browser.storage.local.get(prefixedKey, (item) => {
			if (Object.keys(item).length === 0) {
				if (defaultValue != null) {
					resolve(defaultValue);
				} else {
					resolve(undefined);
				}
			} else {
				resolve(Object.values(item)[0]);
			}
		});
	});
}

function deleteValue(key) {
	if (typeof key !== "string" || !key.length) {
		return console.error("deleteValue missing key arg");
	}
	return new Promise((resolve) => {
		const prefixedKey = `${this.US_filename}---${key}`;
		browser.storage.local.remove(prefixedKey, () => {
			resolve({ success: 1 });
		});
	});
}

function listValues() {
	return new Promise((resolve) => {
		const prefix = `${this.US_filename}---`;
		const keys = [];
		browser.storage.local.get().then((items) => {
			for (const key in items) {
				if (key.startsWith(prefix)) {
					const k = key.replace(prefix, "");
					keys.push(k);
				}
			}
			resolve(keys);
		});
	});
}

function openInTab(url, openInBackground = false) {
	if (!url) return console.error("openInTab missing url arg");
	return new Promise((resolve) => {
		const message = {
			name: "API_OPEN_TAB",
			url,
			active: !openInBackground,
		};
		browser.runtime.sendMessage(message, (response) => resolve(response));
	});
}

function getTab() {
	return new Promise((resolve) => {
		const message = { name: "API_GET_TAB" };
		browser.runtime.sendMessage(message, (response) => {
			resolve(response);
		});
	});
}

function saveTab(tab) {
	if (tab == null) return console.error("saveTab invalid arg");
	return new Promise((resolve) => {
		const message = {
			name: "API_SAVE_TAB",
			tab,
		};
		browser.runtime.sendMessage(message, (response) => {
			resolve(response);
		});
	});
}

function closeTab(tabId) {
	return new Promise((resolve) => {
		const message = {
			name: "API_CLOSE_TAB",
			tabId,
		};
		browser.runtime.sendMessage(message, (response) => resolve(response));
	});
}

function addStyle(css) {
	if (typeof css !== "string") {
		return console.error("addStyle invalid css arg");
	}
	return new Promise((resolve) => {
		const message = {
			name: "API_ADD_STYLE",
			css,
		};
		browser.runtime.sendMessage(message, (response) => resolve(response));
	});
}

function setClipboard(clipboardData, type) {
	return new Promise((resolve) => {
		const message = {
			name: "API_SET_CLIPBOARD",
			clipboardData,
			type,
		};
		browser.runtime.sendMessage(message, (response) => {
			resolve(response);
		});
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
				// only process when xhr is complete and data exist
				if (r.readyState === 4 && r.response !== null) {
					if (r.responseType === "arraybuffer") {
						// arraybuffer responses had their data converted in background
						// convert it back to arraybuffer
						try {
							const buffer = new Uint8Array(r.response).buffer;
							r.response = buffer;
						} catch (err) {
							console.error("error parsing xhr arraybuffer", err);
						}
					} else if (r.responseType === "blob" && r.response.data) {
						// blob responses had their data converted in background
						// convert it back to blob
						const resp = await fetch(r.response.data);
						const b = await resp.blob();
						r.response = b;
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
	browser.runtime.sendMessage(message);
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
