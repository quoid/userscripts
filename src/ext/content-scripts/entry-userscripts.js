import USAPI from "./api.js";

// code received from background page will be stored in this variable
// code referenced again when strict CSPs block initial injection attempt
let data;
// determines whether strict csp injection has already run (JS only)
let cspFallbackAttempted = false;

// label used to distinguish frames in console
const label = randomLabel();
const usTag = window.self === window.top ? "" : `(${label})`;

function randomLabel() {
	const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const r = Math.random();
	return a[Math.floor(r * a.length)] + r.toString().slice(5, 6);
}

function triageJS(userscript) {
	const runAt = userscript.scriptObject["run-at"];
	if (runAt === "document-start") {
		injectJS(userscript);
	} else if (runAt === "document-end") {
		if (document.readyState !== "loading") {
			injectJS(userscript);
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				injectJS(userscript);
			});
		}
	} else if (runAt === "document-idle") {
		if (document.readyState === "complete") {
			injectJS(userscript);
		} else {
			document.addEventListener("readystatechange", () => {
				if (document.readyState === "complete") {
					injectJS(userscript);
				}
			});
		}
	}
}

function injectJS(userscript) {
	const filename = userscript.scriptObject.filename;
	const name = userscript.scriptObject.name;
	const code = `${userscript.code} //# sourceURL=${
		filename.replace(/\s/g, "-") + usTag
	}`;
	let injectInto = userscript.scriptObject["inject-into"];
	// change scope to content since strict CSP event detected
	if (injectInto === "auto" && (userscript.fallback || cspFallbackAttempted)) {
		injectInto = "content";
		console.warn(`Attempting fallback injection for ${name}`);
	}
	const world = injectInto === "content" ? "content" : "page";
	if (window.self === window.top) {
		console.info(`Injecting: ${name} %c(js/${world})`, "color: #fff600");
	} else {
		console.info(
			`Injecting: ${name} %c(js/${world})%c - %cframe(${label})(${window.location})`,
			"color: #fff600",
			"color: inherit",
			"color: #006fff",
		);
	}
	if (world === "page") {
		const div = document.createElement("div");
		div.style.display = "none";
		const shadowRoot = div.attachShadow({ mode: "closed" });
		const tag = document.createElement("script");
		tag.textContent = code;
		shadowRoot.append(tag);
		(document.body ?? document.head ?? document.documentElement).append(div);
	} else {
		try {
			// eslint-disable-next-line no-new-func
			return Function(
				`{${Object.keys(userscript.apis).join(",")}}`,
				code,
			)(userscript.apis);
		} catch (error) {
			console.error(`"${filename}" error:`, error);
		}
	}
}

function injectCSS(name, code) {
	if (window.self === window.top) {
		console.info(`Injecting ${name} %c(css)`, "color: #60f36c");
	} else {
		console.info(
			`Injecting ${name} %c(css)%c - %cframe(${label})(${window.location})`,
			"color: #60f36c",
			"color: inherit",
			"color: #006fff",
		);
	}
	// Safari lacks full support for tabs.insertCSS
	// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/insertCSS
	// specifically frameId and cssOrigin
	// if support for those details keys arrives, the method below can be used
	// NOTE: manifest V3 does support frameId, but not origin
	// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/insertCSS

	// write the css code to head of the document
	const tag = document.createElement("style");
	tag.textContent = code;
	document.head.appendChild(tag);
}

function cspFallback(e) {
	// if a security policy violation event has occurred
	// and the directive is script-src or script-src-elem
	// it's fair to assume that there is a strict CSP for javascript
	// and that injection was blocked for all userscripts
	// when any script-src violation is detected, re-attempt injection
	if (
		e.effectiveDirective === "script-src" ||
		e.effectiveDirective === "script-src-elem"
	) {
		// get all "auto" code
		// since other code can trigger a security policy violation event
		// make sure data var is not undefined before attempting fallback
		if (!data || cspFallbackAttempted) return;
		// update global that tracks security policy violations
		cspFallbackAttempted = true;
		// for all userscripts with @inject-into: auto, attempt re-injection
		for (let i = 0; i < data.files.js.length; i++) {
			const userscript = data.files.js[i];
			if (userscript.scriptObject["inject-into"] !== "auto") continue;
			userscript.fallback = 1;
			triageJS(userscript);
		}
	}
}

async function injection() {
	const response = await browser.runtime.sendMessage({
		name: "REQ_USERSCRIPTS",
	});
	if (import.meta.env.MODE === "development") {
		console.debug("REQ_USERSCRIPTS", response);
	}
	// cancel injection if errors detected
	if (!response || response.error) {
		console.error(response?.error || "REQ_USERSCRIPTS returned undefined");
		return;
	}
	// save response locally in case CSP events occur
	data = response;
	// combine regular and context-menu scripts
	const scripts = [...data.files.js, ...data.files.menu];
	// loop through each userscript and prepare for processing
	for (let i = 0; i < scripts.length; i++) {
		const userscript = scripts[i];
		const filename = userscript.scriptObject.filename;
		const grants = userscript.scriptObject.grant;
		const injectInto = userscript.scriptObject["inject-into"];
		// create GM.info object, all userscripts get access to GM.info
		userscript.apis = { GM: {} };
		userscript.apis.GM.info = {
			script: userscript.scriptObject,
			scriptHandler: data.scriptHandler,
			scriptHandlerVersion: data.scriptHandlerVersion,
			scriptMetaStr: userscript.scriptMetaStr,
		};
		// add GM_info
		userscript.apis.GM_info = userscript.apis.GM.info;
		// if @grant explicitly set to none, empty grants array
		if (grants.includes("none")) grants.length = 0;
		// @grant values exist for page scoped userscript
		if (grants.length && injectInto === "page") {
			// remove grants
			grants.length = 0;
			// log warning
			console.warn(
				`${filename} @grant values removed due to @inject-into value: ${injectInto} - https://github.com/quoid/userscripts/issues/265#issuecomment-1213462394`,
			);
		}
		// @grant exist for auto scoped userscript
		if (grants.length && injectInto === "auto") {
			// change scope
			userscript.scriptObject["inject-into"] = "content";
			// log warning
			console.warn(
				`${filename} @inject-into value set to 'content' due to @grant values: ${grants} - https://github.com/quoid/userscripts/issues/265#issuecomment-1213462394`,
			);
		}
		// loop through each userscript @grant value, add methods as needed
		for (let j = 0; j < grants.length; j++) {
			const grant = grants[j];
			const method = grant.split(".")[1] || grant.split(".")[0];
			// ensure API method exists in USAPI object
			if (!Object.keys(USAPI).includes(method)) continue;
			// add granted methods
			switch (method) {
				case "info":
				case "GM_info":
					continue;
				case "getValue":
				case "setValue":
				case "deleteValue":
				case "listValues":
					userscript.apis.GM[method] = USAPI[method].bind({
						US_filename: filename,
					});
					break;
				case "GM_xmlhttpRequest":
					userscript.apis[method] = USAPI[method];
					break;
				default:
					userscript.apis.GM[method] = USAPI[method];
			}
		}
		// triage userjs item for injection
		triageJS(userscript);
	}
	// loop through each usercss and inject
	for (let i = 0; i < data.files.css.length; i++) {
		const userstyle = data.files.css[i];
		injectCSS(userstyle.name, userstyle.code);
	}
}

function listeners() {
	// listens for messages from background, popup, etc...
	browser.runtime.onMessage.addListener((request) => {
		const name = request.name;
		if (name === "CONTEXT_RUN") {
			// from bg script when context-menu item is clicked
			// double check to ensure context-menu scripts only run in top windows
			if (window !== window.top) return;

			// loop through context-menu scripts saved to data object and find match
			// if no match found, nothing will execute and error will log
			const filename = request.menuItemId;
			for (let i = 0; i < data.files.menu.length; i++) {
				const item = data.files.menu[i];
				if (item.scriptObject.filename === filename) {
					console.info(`Injecting ${filename} %c(js)`, "color: #fff600");
					injectJS(item);
					return;
				}
			}
			console.error(`Couldn't find ${filename} code!`);
		}
	});
	// listen for CSP violations
	document.addEventListener("securitypolicyviolation", cspFallback);
}

async function initialize() {
	// avoid duplicate injection of content scripts
	if (window["CS_ENTRY_USERSCRIPTS"]) return;
	window["CS_ENTRY_USERSCRIPTS"] = 1;
	// check user settings
	const key = "US_GLOBAL_ACTIVE";
	const results = await browser.storage.local.get(key);
	if (results[key] === false) return console.info("Userscripts off");
	// start the injection process and add the listeners
	injection();
	listeners();
}

initialize();
