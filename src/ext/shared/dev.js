import { parse, uniqueId, wait } from "./utils";

/**
 *
 * @param {("css"|"js")} type
 * @param {boolean?} updates
 * @param {boolean?} longName
 * @returns
 */
function generateFile(
	type,
	updates = false,
	longName = false,
	request = false,
) {
	let canUpdate = updates;
	const uid = uniqueId();
	let name = request ? `${uid}-request-${type}` : `${uid}-example-${type}`;
	if (longName) name = `${uid}${uid}${uid}-example-${type}`;
	const randomDate = +(
		Number(new Date()) - Math.floor(Math.random() * 10000000000)
	);
	let content =
		"// ==UserScript==" +
		`\n// @name         ${name}` +
		`\n// @description  Custom description for userscript with name "${name}"` +
		"\n// @match        *://*.*" +
		"\n// @exclude-match https://github.com/quoid/userscripts" +
		"\n// @version       1.0" +
		"\n// @noframes" +
		"\n// ==/UserScript==" +
		`\n\nconsole.log("I am ${name}");`;
	if (type === "css") {
		content = content.replace("// ==UserScript==", "/* ==UserStyle==");
		content = content.replace("// ==/UserScript==", "==/UserStyle== */");
		content = content.replaceAll("// @", "@");
		content = content.replace(
			`console.log("I am ${name}");`,
			"#id,\n.class\n.pseudo-element::after {\n    color: red\n}",
		);
		canUpdate = false;
	}
	if (request) {
		content = content.replace(
			"// @noframes",
			"// @noframes\n// @run-at request",
		);
	}
	if (canUpdate) {
		content = content.replace(
			"1.0",
			"1.0\n// @updateURL     https://www.k21p.com/example.user.js",
		);
		content = content.replace(
			`console.log("I am ${name}");`,
			`console.log("I am ${name} and you can update me!");`,
		);
	}
	return {
		content,
		filename: `${name}.${type}`,
		lastModified: randomDate,
		name,
		request,
		type,
	};
}

/**
 * @typedef {Object} File
 * @property {string} content - ...
 * @property {string} filename - ...
 * @property {number} lastModified - ...
 * @property {string} [name] - ...
 * @property {boolean} [request] - ...
 * @property {"css" | "js"} [type] - ...
 */
/** @type {File[]} */
const files = [
	generateFile("js", true, true),
	generateFile("css"),
	generateFile("js", false, false, true),
	...Array.from({ length: 7 }, () => generateFile("js")),
];

/** @type {"ios"|"macos"} */
const platform = "macos";

const _browser = {
	delay: 200,
	platform,
	runtime: {
		getURL() {
			return "https://www.example.com/";
		},
		async getPlatformInfo() {
			return { os: platform };
		},
		async sendMessage(message, responseCallback) {
			const name = message.name;
			console.info(`Got message: ${name}`);
			let response = {};
			if (name === "REFRESH_SESSION_RULES") {
				response = { success: true };
			}
			if (!responseCallback) {
				return new Promise((resolve) => {
					setTimeout(() => resolve(response), _browser.delay);
				});
			}
			setTimeout(() => responseCallback(response), _browser.delay);
		},
		async sendNativeMessage(application, message, responseCallback) {
			const name = message.name;
			console.info(`Got message: ${name}`);
			/** @type {any} */
			let response = {};
			if (name === "PAGE_INIT_DATA") {
				response = {
					saveLocation: "/Users/someone/Library/Directory",
					version: "5.0.0",
					build: "55",
				};
			} else if (name === "PAGE_LEGACY_IMPORT") {
				response = {
					active: "true",
					autoCloseBrackets: "true",
					autoHint: "true",
					blacklist: [],
					descriptions: "true",
					languageCode: "en",
					lint: "true",
					log: "false",
					showCount: "true",
					showInvisibles: "true",
					sortOrder: "lastModifiedDesc",
					tabSize: "4",
				};
			} else if (name === "PAGE_ALL_FILES") {
				response = [];
				files.forEach((file) => {
					const content = file.content;
					const parsed = parse(content);
					const metadata = parsed.metadata;
					const canUpdate = !!(metadata.version && metadata.updateURL);
					const scriptData = {
						canUpdate,
						content,
						description: metadata.description ? metadata.description[0] : "",
						disabled: false,
						filename: file.filename,
						lastModified: file.lastModified,
						metadata,
						name: metadata.name[0],
						request: file.request,
						// type: file.filename.substring(file.filename.lastIndexOf(".") + 1)
						type: file.type,
					};
					response.push(scriptData);
				});
			} else if (name === "TOGGLE_ITEM") {
				response = { success: true };
				// response = {error: true};
			} else if (name === "PAGE_UPDATE_SETTINGS") {
				response = { success: true };
			} else if (name === "PAGE_UPDATE_BLACKLIST") {
				response = { success: true };
			} else if (name === "PAGE_NEW_REMOTE") {
				const result = await getRemoteFileContents(message.url);
				response = result;
			} else if (name === "PAGE_SAVE") {
				const newContent = message.content;
				const oldFilename = message.item.filename;
				const parsed = parse(newContent);
				const lastModified = Date.now();
				let canUpdate = false;
				// script failed to parse
				if (!parsed) {
					return { error: "save failed, file has invalid metadata" };
				}
				const metaName = parsed.metadata.name[0];
				const newFilename = `${metaName}.${message.item.type}`;
				// filename length too long
				if (newFilename.length > 255) {
					return { error: "save failed, filename too long!" };
				}

				// check if file can be remotely updated
				if (parsed.metadata.version && parsed.metadata.updateURL) {
					canUpdate = true;
				}

				const success = {
					canUpdate,
					content: newContent,
					filename: newFilename,
					lastModified,
					name,
				};

				// add description if in file metadata
				if (parsed.metadata.description) {
					// const foo = parsed.metadata;
					success.description = parsed.metadata.description[0];
				}
				// check if declarative network request
				if (
					parsed.metadata["run-at"] &&
					parsed.metadata["run-at"][0] === "request"
				) {
					success.request = true;
				}
				// overwriting
				if (newFilename.toLowerCase() === oldFilename.toLowerCase()) {
					saveFile(newContent, lastModified, newFilename, oldFilename);
					return success;
				}

				// not overwriting, check if filename for that type is taken
				if (
					files.find(
						(a) => a.filename.toLowerCase() === newFilename.toLowerCase(),
					)
				) {
					return { error: "save failed, name already taken!" };
				}

				// not overwriting but all validation passed
				saveFile(newContent, lastModified, newFilename, oldFilename);
				return success;
			} else if (name === "PAGE_UPDATE") {
				const url = parse(message.content).metadata.updateURL;
				await wait(500);
				const result = await getRemoteFileContents(url);
				response = result;
				// response.error = "Something went wrong!";
				// response.info = "No updates found";
			} else if (name === "TOGGLE_EXTENSION") {
				// response = {error: "Failed toggle extension"};
				response = { success: true };
			} else if (
				name === "POPUP_UPDATE_ALL" ||
				name === "POPUP_UPDATE_SINGLE"
			) {
				// response = {error: "Failed refresh scripts"};
				response = {
					items: [
						{
							name: "Google Images Restored",
							filename: "Google Images Restored.js",
							disabled: false,
							type: "js",
						},
						{
							name: "Wikipedia Mobile Redirect",
							filename: "Wikipedia Mobile Redirect.js",
							disabled: true,
							type: "js",
						},
						{
							name: "A Special Userscript",
							filename: "A Special Userscript.js",
							disabled: false,
							type: "js",
						},
						{
							name: "CSS Adblock",
							filename: "CSS Adblock.css",
							disabled: false,
							type: "css",
						},
						{
							name: "New Userscript With a Really Really Long Name",
							filename: "New Userscript With a Really Really Long Name.css",
							disabled: true,
							type: "css",
						},
						{
							name: "Subframe Script Managerial Staffing Company",
							filename: "Subframe Script.js",
							disabled: false,
							subframe: true,
							type: "css",
						},
					],
					updates: [],
				};
			} else if (name === "POPUP_CHECK_UPDATES") {
				response = {
					updates: [
						{
							filename: "Google Images Restored.js",
							name: "Google Images Restored",
							url: "https://www.k21p.com",
						},
						{
							filename: "New Userscript With a Really Really Long Name.js",
							name: "New Userscript With a Really Really Long Name",
							url: "https://www.filmgarb.com",
						},
					],
				};
			} else if (name === "POPUP_MATCHES") {
				response = {
					matches: [
						...files,
						{
							name: "Subframe Script Managerial Staffing Company",
							filename: "Subframe Script.js",
							disabled: false,
							subframe: true,
							type: "js",
						},
					],
				};
			} else if (name === "POPUP_UPDATES") {
				response = {
					updates: [
						{
							filename: "Google Images Restored.js",
							name: "Google Images Restored",
							url: "https://www.k21p.com",
						},
						{
							filename: "New Userscript With a Really Really Long Name.js",
							name: "New Userscript With a Really Really Long Name",
							url: "https://www.filmgarb.com",
						},
					],
				};
				response.updates = [];
			} else if (name === "REQ_PLATFORM") {
				response = { platform: _browser.platform };
			} else if (name === "POPUP_OPEN_EXTENSION_PAGE") {
				response = { error: "Failed to get page url" };
				window.open("https://github.com/quoid/userscripts");
			} else if (name === "OPEN_SAVE_LOCATION") {
				if (_browser.platform === "macos") {
					response = { success: true };
				} else {
					response = {
						items: [
							{
								name: "Google Images Restored",
								filename: "Google Images Restored.js",
								disabled: false,
								type: "js",
								metadata: [],
							},
							{
								name: "Subframe Script Managerial Staffing Company",
								filename: "Subframe Script.js",
								disabled: false,
								type: "css",
								metadata: [],
							},
							{
								name: "Another Script from Managerial Staffing Company",
								filename: "Cool Script.js",
								disabled: false,
								type: "js",
								metadata: [],
							},
						],
					};
				}
			} else if (name === "POPUP_INSTALL_CHECK") {
				response = random([
					{ success: "Click to install", installed: false },
					{ success: "Click to re-install", installed: true },
				]);
				response.metadata = {
					description:
						'This userscript re-implements the "View Image" and "Search by image" buttons into google images.',
					grant: ["GM.getValue", "GM.setValue", "GM.xmlHttpRequest"],
					match: [
						"https://www.example.com/*",
						"https://www.example.com/somethingReallylong/goesRightHere",
					],
					name: "Test Install Userscript",
					require: [
						"https://code.jquery.com/jquery-3.5.1.min.js",
						"https://code.jquery.com/jquery-1.7.1.min.js",
					],
					source:
						"https://greasyforx.org/scripts/00000-something-something-long-name/code/Something%20something%20long20name.user.js",
				};
				// response.error = "something went wrong (dev)";
			}
			if (!responseCallback) {
				return new Promise((resolve) => {
					setTimeout(() => resolve(response), _browser.delay);
				});
			}
			setTimeout(() => responseCallback(response), _browser.delay);
		},
		connectNative: () => ({
			onMessage: {
				addListener: () => console.info("connectNative - addListener"),
			},
		}),
	},
	tabs: {
		getCurrent(/* responseCallback */) {
			const response = random([
				{ url: "https://www.filmgarb.com/foo.user.js", id: 101 },
				{
					url: `${window.location.origin}/src/ext/shared/dev/DEMO.Alert-URL.user.js`,
					id: 102,
				},
				// increase probability
				{
					url: `${window.location.origin}/src/ext/shared/dev/DEMO.Alert-URL.user.js`,
					id: 103,
				},
				{ url: window.location.href, id: 10 },
			]);
			console.info("browser.tabs.getCurrent", response);
			return new Promise((resolve) => {
				setTimeout(() => resolve(response), _browser.delay);
			});
		},
		query(message, responseCallback) {
			const response = [
				{ url: "https://www.filmgarb.com/foo.user.js", id: 101 },
			];
			if (!responseCallback) {
				return new Promise((resolve) => {
					setTimeout(() => resolve(response), _browser.delay);
				});
			}
			setTimeout(() => responseCallback(response), _browser.delay);
		},
		sendMessage(tabId, message, responseCallback) {
			let response = {};
			if (message.name === "DEMO_MSG") {
				response = {};
				// response.error = "something went wrong (dev)";
			}
			if (!responseCallback) {
				return new Promise((resolve) => {
					setTimeout(() => resolve(response), _browser.delay);
				});
			}
			setTimeout(() => responseCallback(response), _browser.delay);
		},
	},
	webNavigation: {
		getAllFrames(message, responseCallback) {
			const response = [];
			if (!responseCallback) {
				return new Promise((resolve) => {
					setTimeout(() => resolve(response), _browser.delay);
				});
			}
			setTimeout(() => responseCallback(response), _browser.delay);
		},
	},
	storage: {
		local: {
			get(items, responseCallback) {
				const response = {};
				if (!responseCallback) {
					return new Promise((resolve) => {
						setTimeout(() => resolve(response), _browser.delay);
					});
				}
				setTimeout(() => responseCallback(response), _browser.delay);
			},
			set() {
				return new Promise((resolve) => {
					setTimeout(() => resolve(), _browser.delay);
				});
			},
			remove: () =>
				new Promise((resolve) => {
					setTimeout(() => resolve(), _browser.delay);
				}),
		},
		onChanged: {
			addListener: () => undefined,
		},
	},
	i18n: {
		getMessage(n, s = undefined) {
			if (!window["i18nMessages"]) return;
			return window["i18nMessages"]?.[n]?.message.replace("$1", s);
		},
	},
};

async function getRemoteFileContents(url) {
	const result = {};
	await fetch(url)
		.then((response) => {
			if (!response.ok) throw Error(response.statusText);
			return response.text();
		})
		.then((text) => {
			result.content = text;
		})
		.catch((error) => {
			console.error(error);
			result.error = "Remote url bad response!";
		});
	return result;
}

function saveFile(content, lastMod, newFilename, oldName) {
	const ind = files.findIndex((f) => f.filename === oldName);
	const s = {
		content,
		filename: newFilename,
		lastModified: lastMod,
	};
	if (ind !== -1) {
		// overwrite at index
		files[ind] = s;
	} else {
		// add to beginning of array
		files.unshift(s);
	}
}

function random(array) {
	return array[Math.floor(Math.random() * array.length)];
}

export const browser = _browser;

export default {
	browser: _browser,
};
