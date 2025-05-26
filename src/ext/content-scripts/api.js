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

/**
 * Restore `response.response` to required `responseType`
 * @param {TypeExtMessages.XHRTransportableResponse} msgResponse
 * @param {TypeExtMessages.XHRResponse} response
 */
function xhrResponseProcessor(msgResponse, response) {
	const res = msgResponse;
	/**
	 * only include responseXML when needed
	 * NOTE: Only add implementation at this time, not enable, to avoid
	 * unnecessary calculations, and this legacy default behavior is not
	 * recommended, users should explicitly use `responseType: "document"`
	 * to obtain it.
	if (res.responseType === "" && typeof res.response === "string") {
		const mimeTypes = [
			"text/xml",
			"application/xml",
			"application/xhtml+xml",
			"image/svg+xml",
		];
		for (const mimeType of mimeTypes) {
			if (res.contentType.includes(mimeType)) {
				const parser = new DOMParser();
				res.responseXML = parser.parseFromString(res.response, "text/xml");
				break;
			}
		}
	}
	*/
	if (res.responseType === "arraybuffer" && Array.isArray(res.response)) {
		// arraybuffer responses had their data converted in background
		// convert it back to arraybuffer
		try {
			response.response = new Uint8Array(res.response).buffer;
		} catch (err) {
			console.error("error parsing xhr arraybuffer", err);
		}
	}
	if (res.responseType === "blob" && Array.isArray(res.response)) {
		// blob responses had their data converted in background
		// convert it back to blob
		try {
			const typedArray = new Uint8Array(res.response);
			const type = res.contentType ?? "";
			response.response = new Blob([typedArray], { type });
		} catch (err) {
			console.error("error parsing xhr blob", err);
		}
	}
	if (res.responseType === "document" && typeof res.response === "string") {
		// document responses had their data converted in background
		// convert it back to document
		try {
			const parser = new DOMParser();
			const mimeType = res.contentType.includes("text/html")
				? "text/html"
				: "text/xml";
			response.response = parser.parseFromString(res.response, mimeType);
			response.responseXML = response.response;
		} catch (err) {
			console.error("error parsing xhr document", err);
		}
	}
}

/**
 * Process data into a transportable object
 * @param {Parameters<XMLHttpRequest["send"]>[0]} data
 * @returns {Promise<TypeExtMessages.XHRProcessedData>}
 */
async function xhrDataProcessor(data) {
	if (typeof data === "undefined") return undefined;
	if (typeof data === "string") {
		return { data, type: "Text" };
	}
	if (data instanceof Document) {
		if (data instanceof XMLDocument) {
			try {
				return {
					data: new XMLSerializer().serializeToString(data),
					type: "Document",
					mime: data.contentType || "text/xml",
				};
			} catch (error) {
				console.error(
					"XML serialization failed, the data will be omitted",
					error,
				);
			}
		} else {
			let html = data.documentElement.outerHTML;
			if (data.doctype) {
				html = `<!doctype ${data.doctype.name}>` + html;
			}
			return {
				data: html,
				type: "Document",
				mime: data.contentType || "text/html",
			};
		}
	}
	if (data instanceof Blob) {
		try {
			const buffer = await data.arrayBuffer();
			return {
				data: Array.from(new Uint8Array(buffer)),
				type: "Blob",
				mime: data.type,
			};
		} catch (error) {
			throw Error("Document serialization failed, the data will be omitted", {
				cause: error,
			});
		}
	}
	if (data instanceof ArrayBuffer) {
		return {
			data: Array.from(new Uint8Array(data)),
			type: "ArrayBuffer",
		};
	}
	if (ArrayBuffer.isView(data)) {
		return {
			data: Array.from(new Uint8Array(data.buffer)),
			type: "ArrayBufferView",
		};
	}
	if (data instanceof FormData) {
		/** @type {TypeExtMessages.XHRProcessedFormData} */
		const entries = [];
		for (const [k, v] of data.entries()) {
			if (typeof v === "string") {
				entries.push([k, v]);
				continue;
			} else {
				const buffer = await v.arrayBuffer();
				entries.push([
					k,
					{
						data: Array.from(new Uint8Array(buffer)),
						lastModified: v.lastModified,
						name: v.name,
						mime: v.type,
					},
				]);
			}
		}
		return { data: entries, type: "FormData" };
	}
	if (data instanceof URLSearchParams) {
		return { data: data.toString(), type: "URLSearchParams" };
	}
	throw Error("Unexpected data type, the data will be omitted");
}

/**
 * @param {Object} details
 * @param {Object} control
 * @param {{resolve: Function, reject: Function}=} promise
 * @returns {Promise<void>}
 */
async function xhr(details, control, promise) {
	if (details == null) return console.error("xhr invalid details arg");
	if (!details.url) return console.error("xhr details missing url key");
	// define control method, will be replaced after port is established
	control.abort = () => console.error("xhr has not yet been initialized");
	// depreciation notice
	if (details.binary) {
		console.warn(
			"Please make sure your xhr `data` is a binary-string since you have set the `binary` true, however this legacy format is no longer recommended.",
			"The `binary` key is deprecated and will be removed in the future, use binary data objects such as `Blob`, `ArrayBuffer`, `TypedArray`, etc. instead.",
		);
	}
	// can not send details (func, blob, etc.) through message
	// construct a new processed object send to background page
	/** @type {TypeExtMessages.XHRTransportableDetails} */
	const detailsParsed = {
		binary: Boolean(details.binary),
		data: undefined,
		headers: {},
		method: String(details.method),
		overrideMimeType: String(details.overrideMimeType),
		password: String(details.password),
		responseType: details.responseType,
		timeout: Number(details.timeout),
		url: String(details.url),
		user: String(details.user),
		hasHandlers: {},
		hasUploadHandlers: {},
	};
	// preprocess data key
	try {
		detailsParsed.data = await xhrDataProcessor(details.data);
	} catch (error) {
		console.error(error);
	}
	// preprocess headers key
	if (typeof details.headers === "object") {
		for (const [k, v] of Object.entries(details.headers)) {
			detailsParsed.headers[k.toLowerCase()] = v;
		}
	}
	// preprocess handlers
	/**
	 * Record the handlers existing in details to a new object
	 * to avoid modifying the original object, and to prevent
	 * the original object from being changed by user scripts
	 * @type {TypeExtMessages.XHRHandlersObj}
	 */
	const handlers = {};
	/** @type {TypeExtMessages.XHRHandlers} */
	const XHRHandlers = [
		"onreadystatechange",
		"onloadstart",
		"onprogress",
		"onabort",
		"onerror",
		"onload",
		"ontimeout",
		"onloadend",
	];
	for (const handler of XHRHandlers) {
		// check which handlers are included in the original details object
		if (
			handler in XMLHttpRequest.prototype &&
			typeof details[handler] === "function"
		) {
			// add a bool to indicate if event listeners should be attached
			detailsParsed.hasHandlers[handler] = true;
			// record to the new object
			handlers[handler] = details[handler];
		}
	}
	// preprocess upload handlers
	/** @type {TypeExtMessages.XHRUploadHandlersObj} */
	const uploadHandlers = {};
	/** @type {TypeExtMessages.XHRUploadHandlers} */
	const XHRUploadHandlers = [
		"onabort",
		"onerror",
		"onload",
		"onloadend",
		"onloadstart",
		"onprogress",
		"ontimeout",
	];
	if (typeof details.upload === "object") {
		for (const handler of XHRUploadHandlers) {
			if (
				handler in XMLHttpRequestEventTarget.prototype &&
				typeof details.upload[handler] === "function"
			) {
				detailsParsed.hasUploadHandlers[handler] = true;
				uploadHandlers[handler] = details.upload[handler];
			}
		}
	}
	// resolving asynchronous xmlHttpRequest
	if (promise) {
		detailsParsed.hasHandlers.onloadend = true;
		const _onloadend = handlers.onloadend;
		handlers.onloadend = (response) => {
			promise.resolve(response);
			_onloadend?.(response);
		};
	}
	// make sure to listen to XHR.DONE events only once, to avoid processing
	// and transmitting the same response data multiple times
	if (detailsParsed.hasHandlers.onreadystatechange) {
		delete detailsParsed.hasHandlers.onload;
		delete detailsParsed.hasHandlers.onloadend;
	}
	if (detailsParsed.hasHandlers.onload) {
		delete detailsParsed.hasHandlers.onloadend;
	}
	// generate random port name for single xhr
	const xhrPortName = Math.random().toString(36).substring(1, 9);
	/**
	 * port listener, most of the messaging logic goes here
	 * @type {Parameters<typeof browser.runtime.onConnect.addListener>[0]}
	 * @param {import("../global.d.ts").TypeContentScripts.XHRPort} port
	 */
	const listener = (port) => {
		if (port.name !== xhrPortName) return;
		// handle port messages
		port.onMessage.addListener(async (msg) => {
			const handler = msg.handler;
			// handle upload progress
			if (
				"progress" in msg &&
				detailsParsed.hasUploadHandlers[handler] &&
				typeof uploadHandlers[handler] === "function"
			) {
				// call userscript handler
				uploadHandlers[handler](msg.progress);
				return;
			}
			// handle download events
			if (
				"response" in msg &&
				detailsParsed.hasHandlers[handler] &&
				typeof handlers[handler] === "function"
			) {
				// process xhr response
				/** @type {TypeExtMessages.XHRTransportableResponse} */
				const msgResponse = msg.response;
				/** @type {TypeExtMessages.XHRResponse} */
				const response = msgResponse;
				// only include responseText when needed
				if (["", "text"].includes(response.responseType)) {
					response.responseText = response.response;
				}
				// only process when xhr is complete and data exist
				if (response.readyState === 4 && response.response !== null) {
					xhrResponseProcessor(msgResponse, response);
				}
				// call userscript handler
				handlers[handler](response);
				// call the deleted XHR.DONE handlers above
				if (response.readyState === 4) {
					if (handler === "onreadystatechange") {
						if (typeof handlers.onload === "function") {
							handlers.onload(response);
						}
						if (typeof handlers.onloadend === "function") {
							handlers.onloadend(response);
						}
					} else if (handler === "onload") {
						if (typeof handlers.onloadend === "function") {
							handlers.onloadend(response);
						}
					}
				}
			}
			// all messages received
			if (handler === "onloadend") {
				// tell background it's safe to close port
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
		control.abort = () => port.postMessage({ name: "ABORT" });
	};
	// wait for the background to establish a port connection
	browser.runtime.onConnect.addListener(listener);
	// pass the basic information to the background through a common message
	const message = {
		name: "API_XHR",
		details: detailsParsed,
		xhrPortName,
	};
	sendMessageProxy(message);
}

function xmlHttpRequest(details) {
	let promise;
	const control = new Promise((resolve, reject) => {
		promise = { resolve, reject };
	});
	xhr(details, control, promise);
	return control;
}

function GM_xmlhttpRequest(details) {
	const control = {};
	xhr(details, control);
	return control;
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
	xmlHttpRequest,
	GM_xmlhttpRequest,
};
