/**
 * @param {number} ms millisecond timestamp
 * @returns {string}
 */
export function formatDate(ms) {
	const d = new Date(ms);
	const yr = new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
	const mo = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
	const dd = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);
	const hr = d.getHours();
	const mn = d.getMinutes();
	return `${mo} ${dd}, ${yr} at ${hr}:${mn}`;
}

export function uniqueId() {
	return Math.random().toString(36).substring(2, 10);
}

/**
 * awaitable function for waiting an arbitrary amount of time
 * @param {number} ms the amount of time to wait in milliseconds
 * @returns {Promise<void>}
 */
export function wait(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

// TODO: describe the items array that should get passed to this function
/**
 * @param {Array} array
 * @param {("lastModifiedAsc"|"lastModifiedDesc"|"nameAsc"|"nameDesc")} order
 * @returns
 */
export function sortBy(array, order) {
	if (order === "nameAsc") {
		array.sort((a, b) => a.name.localeCompare(b.name));
	} else if (order === "nameDesc") {
		array.sort((a, b) => b.name.localeCompare(a.name));
	} else if (order === "lastModifiedAsc") {
		array.sort((a, b) => (a.lastModified < b.lastModified ? -1 : 1));
	} else if (order === "lastModifiedDesc") {
		array.sort((a, b) => (a.lastModified > b.lastModified ? -1 : 1));
	}
	// always keep temp file pinned to the top, should only ever have one temp script
	// if (array.find(f => f.temp)) array.sort((a, b) => a.temp ? -1 : b.temp ? 1 : 0);
	return array;
}

/**
 *
 * @param {string} description
 * @param {string} name
 * @param {("css"|"js")} type
 * @returns {string}
 */
export function newScriptDefault(description, name, type) {
	if (type === "css") {
		return `/* ==UserStyle==\n@name        ${name}\n@description ${description}\n@match       <all_urls>\n==/UserStyle== */`;
	}
	return `// ==UserScript==\n// @name        ${name}\n// @description ${description}\n// @match       *://*/*\n// ==/UserScript==`;
}

/**
 * @param {string} str
 * @returns {?{code: string, content: str, metablock: string, metadata: object}}
 */
export function parse(str) {
	if (typeof str != "string") return null;
	const blocksReg =
		/(?:(\/\/ ==UserScript==[ \t]*?\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)|(\/\* ==UserStyle==[ \t]*?\r?\n([\S\s]*?)\r?\n==\/UserStyle== \*\/)([\S\s]*))/;
	const blocks = str.match(blocksReg);

	if (!blocks) return null;

	const metablock = blocks[1] != null ? blocks[1] : blocks[4];
	const metas = blocks[2] != null ? blocks[2] : blocks[5];
	const code = blocks[3] != null ? blocks[3].trim() : blocks[6].trim();

	const metadata = {};
	const metaArray = metas.split("\n");
	metaArray.forEach((m) => {
		const parts = m
			.trim()
			.match(/^(?:[ \t]*(?:\/\/)?[ \t]*@)([\w-]+)[ \t]+([^\s]+[^\r\n\t\v\f]*)/);
		const parts2 = m
			.trim()
			.match(/^(?:[ \t]*(?:\/\/)?[ \t]*@)(noframes)[ \t]*$/);
		if (parts) {
			metadata[parts[1]] = metadata[parts[1]] || [];
			metadata[parts[1]].push(parts[2]);
		} else if (parts2) {
			metadata[parts2[1]] = metadata[parts2[1]] || [];
			metadata[parts2[1]].push(true);
		}
	});
	// fail if @name is missing or name is empty
	if (!metadata.name || metadata.name[0].length < 2) return;

	return {
		code,
		content: str,
		metablock,
		metadata,
	};
}

/**
 * @param {string} text editor code
 * @returns {{match: boolean, meta: boolean} | {key: string, value: string, text: string}[]}
 */
export function parseMetadata(text) {
	const groupsRe =
		/(\/\/ ==UserScript==[ \t]*?\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)/;
	const groups = text.match(groupsRe);
	// userscript code doesn't match the regex expression
	// could be missing opening/closing tags, malformed
	// or missing metadata between opening/closing tags (group 2 in regex exp)
	if (!groups) {
		return { match: false, meta: false };
	}

	// userscript code matches but content between opening/closing tag missing
	// ex. opening/closing tags present, but newline characters between the tags
	const metas = groups[2];
	if (!metas) return { match: true, meta: false };

	const metadata = [];
	const metaArray = metas.split("\n");

	for (let i = 0; i < metaArray.length; i++) {
		const metaRegex =
			/^(?:[ \t]*(?:\/\/)?[ \t]*@)([\w-]+)[ \t]*([^\s]+[^\r\n\t\v\f]*)?/;
		const meta = metaArray[i];
		const parts = meta.match(metaRegex);
		if (parts)
			metadata.push({ key: parts[1], value: parts[2], text: parts[0] });
	}

	// if there is content between the opening/closing tags, match will be found
	// this additionally checks that there's at least one properly formed key
	// if not keys found, assume metadata is missing
	// checking that required keys are present will happen elsewhere
	if (!Object.keys(metadata).length) return { match: true, meta: false };

	return metadata;
}

/**
 * @param {string} input a match pattern
 * @typedef {string} value - the match pattern
 * @typedef {Object} MatchGroups - regexp match groups
 * @property {string} start - leading whitespace
 * @property {string} separ - separator whitespace
 * @property {value} value - the match pattern
 * @typedef {MatchGroups & CheckedItem} ParsedItem - parsed result
 * @returns {{warn: boolean, error: boolean, items: ParsedItem[], values: value[]}}
 */
export function parseMatchPatterns(input) {
	const result = {
		warn: false, // global warn
		error: false, // global error
		items: [],
		values: [],
	};
	if (typeof input !== "string") return result;
	// match the separated values from input string
	const matches = input.matchAll(
		/(?<start>^\s*|)(?<value>\S+?)(?<separ>\s+|$)/g,
	);
	for (const match of matches) {
		const item = checkMatchPatterns(match.groups.value);
		// setting the global error indicator
		if (item.warn === true) result.warn = true;
		if (item.error === true) result.error = true;
		result.items.push({ ...match.groups, ...item });
		result.values.push(match.groups.value.toLowerCase());
	}
	return result;
}

/**
 * @param {string} input whitespace separated list of match patterns
 * @typedef {Object} CheckedItem - checked result
 * @property {boolean} warn - the match pattern has warning
 * @property {boolean} error - the match pattern valid or not
 * @property {string} point - invalid point or error message
 * @returns {CheckedItem}
 */
export function checkMatchPatterns(input) {
	if (typeof input !== "string") return;
	const result = {
		warn: false,
		error: true,
		point: "",
	};
	if (["<all_urls>", "*://*/*"].includes(input)) {
		result.warn = true;
		result.error = false;
		result.point = gl("utils_check_match_patterns_0");
		return result;
	}
	let scheme, host, path;
	/** check scheme component */
	if (input.slice(0, 5).toLowerCase() === "https") {
		scheme = input.slice(0, 5);
	} else if (input.slice(0, 4).toLowerCase() === "http") {
		scheme = input.slice(0, 4);
	} else if (input.startsWith("*")) {
		scheme = "*";
	} else {
		// The scheme component should one of *, https, http
		result.point = gl("utils_check_match_patterns_1");
		return result;
	}
	/** check :// separator */
	if (input.slice(scheme.length, scheme.length + 3) !== "://") {
		// The scheme and host should separated by `://`
		result.point = gl("utils_check_match_patterns_2");
		return result;
	}
	// separate host and path
	const array = input.slice(scheme.length + 3).split("/");
	if (array.length < 2) {
		// The match pattern has no path component
		result.point = gl("utils_check_match_patterns_3");
		return result;
	}
	host = array[0];
	path = "/" + array.slice(1).join("/");
	/** check host component */
	if (host === "*.") {
		// The `*.` should followed by part of the hostname
		result.point = gl("utils_check_match_patterns_4");
		return result;
	}
	// allow fully qualified domain name (FQDN)
	if (host.at(-1) === ".") host = host.slice(0, -1);
	if (host.length < 1 || 255 - 1 < host.length) {
		// The host component length should be 1-255
		result.point = gl("utils_check_match_patterns_5");
		return result;
	}
	let labels = []; // domain labels
	let hostPart = ""; // rest part that exclude wildcard
	if (host.startsWith("*.")) {
		hostPart = host.slice(2);
		labels = hostPart.split(".");
	} else if (host !== "*") {
		hostPart = host;
		labels = host.split(".");
	}
	if (hostPart.includes("*")) {
		// The `*` should be independent or `*.` at the start
		result.point = gl("utils_check_match_patterns_6");
		return result;
	}
	for (const label of labels) {
		if (label.length === 0) {
			// The host component contains empty label(s)
			result.point = gl("utils_check_match_patterns_7");
			return result;
		}
		if (label.startsWith("-") || label.endsWith("-")) {
			// The label cannot start or end with `-` character
			result.point = gl("utils_check_match_patterns_8");
			return result;
		}
		if (label.length > 63) {
			// The maximum length of the label cannot exceed 63
			result.point = gl("utils_check_match_patterns_9");
			return result;
		}
	}
	// allowed character set of host component
	const hostInvalidMatches = hostPart.match(/[^A-Za-z0-9.-]/g);
	if (hostInvalidMatches) {
		const characters = hostInvalidMatches.join("");
		// The host component contains invalid character(s): ${c}
		result.point = gl("utils_check_match_patterns_10", characters);
		return result;
	}
	/** check path component */
	// allowed character set of path component
	const pathInvalidMatches = path.match(
		/[^\w\]\\!$%&'()*+,./:;=?@[^`{|}~-]/g, // toolsGetValidPathCharacters
	);
	if (pathInvalidMatches) {
		const characters = pathInvalidMatches.join("");
		// The path component contains invalid character(s): ${c}
		result.point = gl("utils_check_match_patterns_11", characters);
		return result;
	}
	result.error = false;
	return result;
}

/** Generate valid path characters in browser js runtime */
export function toolsGetValidPathCharacters() {
	const set = new Set();
	for (let i = 32; i < 128; i++) set.add(String.fromCharCode(i));
	set.delete("?");
	set.delete("#");
	const p = [...set].join("");
	set.delete("=");
	set.delete("&");
	const s = [...set].join("");
	const url = new URL(`https://host/${p}?1=${s}&${s}=2`);
	const possibles = [...url.pathname, ...url.search];
	const characters = [...new Set(possibles)].sort().join("");
	const symbols = characters.match(/[^\w]/g).join("");
	return {
		characters,
		symbols,
		restr: `/\\w${symbols.replace(/[\^[\]-]/g, "\\$&")}]/`,
	};
}

/**
 * get lang
 * @param {string} n messageName
 * @param {string | string[]} s substitutions
 * const gl = browser.i18n.getMessage; // issue: safari return `undefined`
 */
export const gl = (n, s = undefined) => browser.i18n.getMessage(n, s);

export const validGrants = new Set([
	"GM.info",
	"GM_info",
	"GM.addStyle",
	"GM.openInTab",
	"GM.closeTab",
	"GM.setValue",
	"GM.getValue",
	"GM.deleteValue",
	"GM.listValues",
	"GM.setClipboard",
	"GM.getTab",
	"GM.saveTab",
	"GM_xmlhttpRequest",
	"GM.xmlHttpRequest",
	"none",
]);

export const validMetaKeys = new Set([
	"author",
	"description",
	"downloadURL",
	"exclude",
	"exclude-match",
	"grant",
	"icon",
	"include",
	"inject-into",
	"match",
	"name",
	"noframes",
	"require",
	"run-at",
	"updateURL",
	"version",
	"weight",
]);

export const extensionPaths = {
	popup: "/dist/entry-ext-action-popup.html",
	page: "/dist/entry-ext-extension-page.html",
};

export async function openExtensionPage() {
	const url = browser.runtime.getURL(extensionPaths.page);
	const tabs = await browser.tabs.query({ url });
	const tab = tabs.find((e) => e.url.startsWith(url));
	if (!tab) return browser.tabs.create({ url });
	browser.tabs.update(tab.id, { active: true });
	browser.windows.update(tab.windowId, { focused: true });
}

// Safari currently does not honor the target attribute of <a> elements in extension contexts
export async function openInBlank(url) {
	browser.tabs.create({ url });
}

// Safari currently does not honor the download attribute of <a> elements in extension contexts
// Also not support https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/download
export async function downloadToFile(filename, content, type = "text/plain") {
	const url = "https://quoid.github.io/userscripts/serve/download.html";
	const tab = await browser.tabs.create({ url });
	const exchange = { filename, content, type };
	const exscript = (o) => {
		// make sure executed only once
		// @ts-ignore
		if (window.US_DOWNLOAD === 1) return;
		// @ts-ignore
		window.US_DOWNLOAD = 1;
		window.stop();
		document.body.textContent = "Download is starting...";
		const a = document.createElement("a");
		a.download = o.filename;
		a.href = URL.createObjectURL(new Blob([o.content], { type: o.type }));
		a.click();
		document.body.innerHTML += "<br>The download should have started.<br>";
		a.textContent = o.filename;
		document.body.append(a);
	};
	// Safari currently unable to stably executeScript on tab loading status
	try {
		await browser.tabs.executeScript(tab.id, {
			code: `(${exscript})(${JSON.stringify(exchange)});`,
		});
	} catch {
		const handleUpdated = async (tabId) => {
			if (tabId !== tab.id) return;
			try {
				await browser.tabs.executeScript(tabId, {
					code: `(${exscript})(${JSON.stringify(exchange)});`,
				});
				console.info(`[${filename}] Download is starting...`);
			} catch {
				console.info(`[${filename}] Start download failed, retrying...`);
			}
		};
		browser.tabs.onUpdated.addListener(handleUpdated);
		// Remove the listener when tab closing
		const handleRemoved = (tabId) => {
			if (tabId !== tab.id) return;
			browser.tabs.onUpdated.removeListener(handleUpdated);
			browser.tabs.onRemoved.removeListener(handleRemoved);
		};
		browser.tabs.onRemoved.addListener(handleRemoved);
	}
}
