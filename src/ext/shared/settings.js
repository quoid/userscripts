/**
 * @file wrap a relatively independent settings storage with its own functions
 */

/** @type {string} */
const storagePrefix = "US_";

/**
 * Convert name to storage key
 * @param {string} name
 * @returns {string} prefixed storage key
 */
const storageKey = (name) => storagePrefix + name.toUpperCase();

/**
 * Dynamic storage reference
 * @param {"sync"|"local"|undefined} area
 * @returns {Promise}
 */
const storageRef = async (area) => {
	const storages = {
		sync: {
			area: "sync",
			ref: browser.storage.sync,
		},
		local: {
			area: "local",
			ref: browser.storage.local,
		},
	};
	// https://developer.apple.com/documentation/safariservices/safari_web_extensions/assessing_your_safari_web_extension_s_browser_compatibility#3584139
	// since storage sync is not implemented in Safari, currently only returns using local storage
	if (import.meta.env.BROWSER === "safari") {
		return storages.local;
	}
	if (area in storages) {
		return storages[area];
	} else if (area === undefined) {
		const key = storageKey("settings_sync");
		const result = await browser.storage.local.get(key);
		return result?.[key] ? storages.sync : storages.local;
	} else {
		return Promise.reject(new Error(`invalid area ${area}`));
	}
};

const settingDefault = deepFreeze({
	name: "setting_default",
	type: undefined,
	local: false,
	values: [],
	default: undefined,
	protect: false,
	confirm: false,
	platforms: ["macos", "ipados", "ios"],
	langLabel: {},
	langTitle: {},
	group: "",
	legacy: "",
	nodeType: "",
	nodeClass: {},
});

export const settingsDefine = deepFreeze(
	[
		{
			name: "error_native",
			type: "object",
			local: true,
			default: { error: undefined },
			platforms: ["macos", "ipados", "ios"],
			group: "Internal",
		},
		{
			name: "legacy_imported",
			type: "number",
			local: true,
			default: 0,
			protect: true,
			platforms: ["macos"],
			group: "Internal",
		},
		{
			name: "language_code",
			type: "string",
			default: "en",
			platforms: ["macos", "ipados", "ios"],
			group: "Internal",
			legacy: "languageCode",
		},
		{
			name: "scripts_settings",
			type: "object",
			default: {},
			platforms: ["macos", "ipados", "ios"],
			langLabel: {
				en: "Scripts update check active",
				zh_hans: "脚本更新检查激活",
			},
			langTitle: {
				en: "Whether to enable each single script update check",
				zh_hans: "是否开启单个脚本更新检查",
			},
			group: "Internal",
			nodeType: "Subpage",
		},
		// {
		//     name: "settings_sync",
		//     type: "boolean",
		//     local: true,
		//     default: false,
		//     protect: true,
		//     platforms: ["macos", "ipados", "ios"],
		//     langLabel: {
		//         en: "Sync settings",
		//         zh_hans: "同步设置"
		//     },
		//     langTitle: {
		//         en: "Sync settings across devices",
		//         zh_hans: "跨设备同步设置"
		//     },
		//     group: "General",
		//     nodeType: "Toggle"
		// },
		{
			name: "toolbar_badge_count",
			type: "boolean",
			default: true,
			platforms: ["macos", "ipados"],
			langLabel: {
				en: "Show Toolbar Count",
				zh_hans: "工具栏图标显示计数徽章",
			},
			langTitle: {
				en: "displays a badge on the toolbar icon with a number that represents how many enabled scripts match the url for the page you are on",
				zh_hans: "简体中文描述",
			},
			group: "General",
			legacy: "showCount",
			nodeType: "Toggle",
		},
		{
			name: "global_active",
			type: "boolean",
			local: true,
			default: true,
			platforms: ["macos"],
			langLabel: {
				en: "Enable Injection",
				zh_hans: "启用注入",
			},
			langTitle: {
				en: "toggle on/off script injection for the pages you visit",
				zh_hans: "简体中文描述",
			},
			group: "General",
			legacy: "active",
			nodeType: "Toggle",
			nodeClass: { red: false },
		},
		{
			name: "global_scripts_update_check",
			type: "boolean",
			default: true,
			platforms: ["macos", "ipados", "ios"],
			langLabel: {
				en: "Global scripts update check",
				zh_hans: "全局脚本更新检查",
			},
			langTitle: {
				en: "Whether to enable global periodic script update check",
				zh_hans: "是否开启全局定期脚本更新检查",
			},
			group: "General",
			nodeType: "Toggle",
		},
		{
			name: "scripts_update_check_interval",
			type: "number",
			default: 86400000,
			platforms: ["macos", "ipados", "ios"],
			langLabel: {
				en: "Scripts update check interval",
				zh_hans: "脚本更新检查间隔",
			},
			langTitle: {
				en: "The interval for script update check in background",
				zh_hans: "脚本更新检查的间隔时间",
			},
			group: "General",
			nodeType: "Toggle",
		},
		{
			name: "scripts_update_check_lasttime",
			type: "number",
			default: 0,
			platforms: ["macos", "ipados", "ios"],
			langLabel: {
				en: "Scripts update check lasttime",
				zh_hans: "脚本更新上次检查时间",
			},
			langTitle: {
				en: "The lasttime for script update check in background",
				zh_hans: "后台脚本更新上次检查时间",
			},
			group: "Internal",
		},
		{
			name: "scripts_auto_update",
			type: "boolean",
			default: false,
			confirm: true,
			platforms: ["macos", "ipados", "ios"],
			langLabel: {
				en: "Scripts silent auto update",
				zh_hans: "脚本后台静默自动更新",
			},
			langTitle: {
				en: "Script silently auto-updates in the background, which is dangerous and may introduce unconfirmed malicious code",
				zh_hans:
					"脚本在后台静默自动更新，这是危险的，可能引入未经确认的恶意代码",
			},
			group: "General",
			nodeType: "Toggle",
			nodeClass: { warn: true },
		},
		{
			name: "global_exclude_match",
			type: "object",
			default: [],
			platforms: ["macos", "ipados", "ios"],
			langLabel: {
				en: "Global exclude match patterns",
				zh_hans: "全局排除匹配模式列表",
			},
			langTitle: {
				en: "this input accepts a comma separated list of @match patterns, a page url that matches against a pattern in this list will be ignored for script injection",
				zh_hans: "简体中文描述",
			},
			group: "General",
			legacy: "blacklist",
			nodeType: "textarea",
			nodeClass: { red: "blacklistError" },
		},
		{
			name: "editor_close_brackets",
			type: "boolean",
			default: true,
			platforms: ["macos"],
			langLabel: {
				en: "Auto Close Brackets",
				zh_hans: "自动关闭括号",
			},
			langTitle: {
				en: "toggles on/off auto closing of brackets in the editor, this affects the following characters: () [] {} \"\" ''",
				zh_hans: "简体中文描述",
			},
			group: "Editor",
			legacy: "autoCloseBrackets",
			nodeType: "Toggle",
		},
		{
			name: "editor_auto_hint",
			type: "boolean",
			default: true,
			platforms: ["macos"],
			langLabel: {
				en: "Auto Hint",
				zh_hans: "自动提示(Hint)",
			},
			langTitle: {
				en: "automatically shows completion hints while editing",
				zh_hans: "简体中文描述",
			},
			group: "Editor",
			legacy: "autoHint",
			nodeType: "Toggle",
		},
		{
			name: "editor_list_sort",
			type: "string",
			values: ["nameAsc", "nameDesc", "lastModifiedAsc", "lastModifiedDesc"],
			default: "lastModifiedDesc",
			platforms: ["macos"],
			langLabel: {
				en: "Sort order",
				zh_hans: "排序顺序",
			},
			langTitle: {
				en: "Display order of items in sidebar",
				zh_hans: "侧栏中项目的显示顺序",
			},
			group: "Editor",
			legacy: "sortOrder",
			nodeType: "Dropdown",
		},
		{
			name: "editor_list_descriptions",
			type: "boolean",
			default: true,
			platforms: ["macos"],
			langLabel: {
				en: "Show List Descriptions",
				zh_hans: "显示列表项目描述",
			},
			langTitle: {
				en: "show or hides the item descriptions in the sidebar",
				zh_hans: "简体中文描述",
			},
			group: "Editor",
			legacy: "descriptions",
			nodeType: "Toggle",
		},
		{
			name: "editor_javascript_lint",
			type: "boolean",
			default: false,
			platforms: ["macos"],
			langLabel: {
				en: "Javascript Linter",
				zh_hans: "Javascript Linter",
			},
			langTitle: {
				en: "toggles basic Javascript linting within the editor",
				zh_hans: "简体中文描述",
			},
			group: "Editor",
			legacy: "lint",
			nodeType: "Toggle",
		},
		{
			name: "editor_show_whitespace",
			type: "boolean",
			default: true,
			platforms: ["macos"],
			langLabel: {
				en: "Show whitespace characters",
				zh_hans: "显示空白字符",
			},
			langTitle: {
				en: "toggles the display of invisible characters in the editor",
				zh_hans: "简体中文描述",
			},
			group: "Editor",
			legacy: "showInvisibles",
			nodeType: "Toggle",
		},
		{
			name: "editor_tab_size",
			type: "number",
			values: [2, 4],
			default: 4,
			platforms: ["macos"],
			langLabel: {
				en: "Tab Size",
				zh_hans: "制表符大小",
			},
			langTitle: {
				en: "the number of spaces a tab is equal to while editing",
				zh_hans: "简体中文描述",
			},
			group: "Editor",
			legacy: "tabSize",
			nodeType: "select",
		},
	].reduce(settingsDefineReduceCallback, {}),
);

/**
 * populate the settingsDefine with settingDefault
 * and convert settingsDefine to storageKey object
 * @param {object} settings new settings object
 * @param {object} setting each setting define
 * @returns {object} {US_GLOBAL_ACTIVE: {key: US_GLOBAL_ACTIVE, name: global_active, ... }, ...}
 */
function settingsDefineReduceCallback(settings, setting) {
	setting.key = storageKey(setting.name);
	settings[setting.key] = { ...settingDefault, ...setting };
	return settings;
}

/**
 * prevent settings define from being modified in any case
 * otherwise user settings may be lost in the worst case
 * @param {object} object any object
 * @returns {object} deep frozen object
 */
function deepFreeze(object) {
	for (const p in object) {
		if (typeof object[p] == "object") {
			deepFreeze(object[p]);
		}
	}
	return Object.freeze(object);
}

/**
 * compatibility polyfill for Safari < 15.4
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn#browser_compatibility}
 * @todo remove this polyfill when set safari strict_min_version 15.4
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#safari_properties}
 */
if (Object.hasOwn === undefined) {
	Object.hasOwn = (obj, prop) =>
		Object.prototype.hasOwnProperty.call(obj, prop);
}

// export and define the operation method of settings storage
// they are similar to browser.storage but slightly different

/**
 * settings.get
 * @param {string|Array<string>} keys key | array of keys | undefined for all
 * @param {"local"|"sync"} area
 * @returns {Promise} settings object
 */
export async function get(keys = undefined, area = undefined) {
	if (![undefined, "local", "sync"].includes(area)) {
		return console.error("Unexpected storage area:", area);
	}
	// validate setting value and fix surprises to default
	const valueFix = (key, val) => {
		if (!key || !Object.hasOwn(settingsDefine, key)) return;
		const def = settingsDefine[key].default;
		// check if value type conforms to settingsDefine
		const type = settingsDefine[key].type;
		// eslint-disable-next-line valid-typeof -- type known to be valid string literal
		if (typeof val != type) {
			console.warn(
				`Unexpected ${key} value type '${typeof val}' should '${type}', fix to default`,
			);
			return def;
		}
		// check if value conforms to settingsDefine
		const values = settingsDefine[key].values;
		if (values.length && !values.includes(val)) {
			console.warn(
				`Unexpected ${key} value '${val}' should one of '${values}', fix to default`,
			);
			return def;
		}
		// verified, pass original value
		return val;
	};
	// [single setting]
	if (typeof keys == "string") {
		const key = storageKey(keys);
		// check if key exist in settingsDefine
		if (!Object.hasOwn(settingsDefine, key)) {
			return console.error("unexpected settings key:", key);
		}
		// check if only locally stored setting
		// eslint-disable-next-line no-param-reassign -- change the area is expected
		settingsDefine[key].local === true && (area = "local");
		const storage = await storageRef(area);
		const result = await storage.ref.get(key);
		if (Object.hasOwn(result, key)) return valueFix(key, result[key]);
		return settingsDefine[key].default;
	}
	const complexGet = async (settingsDefault, areaKeys) => {
		const storage = await storageRef(area);
		let local = {},
			sync = {};
		if (storage.area === "sync") {
			if (areaKeys.sync.length) {
				sync = await storage.ref.get(areaKeys.sync);
			}
			if (areaKeys.local.length) {
				local = await browser.storage.local.get(areaKeys.local);
			}
		} else {
			local = await storage.ref.get(areaKeys.all);
		}
		const result = Object.assign(settingsDefault, local, sync);
		// revert settings object property name
		return Object.entries(result).reduce((p, c) => {
			p[settingsDefine[c[0]].name] = valueFix(...c);
			return p;
		}, {});
	};
	// [muilt settings]
	if (Array.isArray(keys)) {
		if (!keys.length) {
			return console.error("Settings keys empty:", keys);
		}
		const settingsDefault = {};
		const areaKeys = { local: [], sync: [], all: [] };
		for (const k of keys) {
			const key = storageKey(k);
			// check if key exist in settingsDefine
			if (!Object.hasOwn(settingsDefine, key)) {
				return console.error("unexpected settings key:", key);
			}
			settingsDefault[key] = settingsDefine[key].default;
			// detach only locally stored settings
			settingsDefine[key].local === true
				? areaKeys.local.push(key)
				: areaKeys.sync.push(key);
			// record all keys in case sync storage is not enabled
			areaKeys.all.push(key);
		}
		return complexGet(settingsDefault, areaKeys);
	}
	// [all settings]
	if (typeof keys == "undefined" || keys === null) {
		const settingsDefault = {};
		const areaKeys = { local: [], sync: [], all: [] };
		for (const key of Object.keys(settingsDefine)) {
			settingsDefault[key] = settingsDefine[key].default;
			// detach only locally stored settings
			settingsDefine[key].local === true
				? areaKeys.local.push(key)
				: areaKeys.sync.push(key);
			// record all keys in case sync storage is not enabled
			areaKeys.all.push(key);
		}
		return complexGet(settingsDefault, areaKeys);
	}
	return console.error("Unexpected keys type:", keys);
}

/**
 * settings.set
 * @param {object} keys settings object
 * @param {"local"|"sync"} area
 * @returns {Promise}
 */
export async function set(keys, area = undefined) {
	if (![undefined, "local", "sync"].includes(area)) {
		return console.error("unexpected storage area:", area);
	}
	if (typeof keys != "object") {
		return console.error("Unexpected keys type:", keys);
	}
	if (!Object.keys(keys).length) {
		return console.error("Settings object empty:", keys);
	}
	const areaKeys = { local: {}, sync: {}, all: {} };
	for (const k of Object.keys(keys)) {
		const key = storageKey(k);
		// check if key exist in settingsDefine
		if (!Object.hasOwn(settingsDefine, key)) {
			return console.error("Unexpected settings keys:", key);
		}
		// check if value type conforms to settingsDefine
		const type = settingsDefine[key].type;
		// eslint-disable-next-line valid-typeof -- type known to be valid string literal
		if (typeof keys[k] != type) {
			if (type === "number" && !Number.isNaN(Number(keys[k]))) {
				// compatible with string numbers
				keys[k] = Number(keys[k]); // still store it as a number type
			} else {
				return console.error(
					`Unexpected ${k} value type '${typeof keys[k]}' should '${type}'`,
				);
			}
		}
		// check if value conforms to settingsDefine
		const values = settingsDefine[key].values;
		if (values.length && !values.includes(keys[k])) {
			return console.error(
				`Unexpected ${k} value '${keys[k]}' should one of '${values}'`,
			);
		}
		// detach only locally stored settings
		settingsDefine[key].local === true
			? (areaKeys.local[key] = keys[k])
			: (areaKeys.sync[key] = keys[k]);
		// record all keys in case sync storage is not enabled
		areaKeys.all[key] = keys[k];
	}
	const storage = await storageRef(area);
	// complexSet
	try {
		if (storage.area === "sync") {
			if (Object.keys(areaKeys.sync).length) {
				await storage.ref.set(areaKeys.sync);
			}
			if (Object.keys(areaKeys.local).length) {
				await browser.storage.local.set(areaKeys.local);
			}
		} else {
			await storage.ref.set(areaKeys.all);
		}
		return true;
	} catch (error) {
		return console.error(error);
	}
}

/**
 * settings.reset
 * reset to default
 * @param {string|Array<string>} keys key | array of keys | undefined for all
 * @param {"local"|"sync"} area
 * @returns {Promise}
 */
export async function reset(keys = undefined, area = undefined) {
	if (![undefined, "local", "sync"].includes(area)) {
		return console.error("unexpected storage area:", area);
	}
	// [single setting]
	if (typeof keys == "string") {
		const key = storageKey(keys);
		// check if key exist in settingsDefine
		if (!Object.hasOwn(settingsDefine, key)) {
			return console.error("unexpected settings key:", key);
		}
		// check if key is protected
		if (settingsDefine[key].protect === true) {
			return console.error("protected settings key:", key);
		}
		// eslint-disable-next-line no-param-reassign -- change the area is expected
		settingsDefine[key].local === true && (area = "local");
		const storage = await storageRef(area);
		return storage.ref.remove(key);
	}
	const complexRemove = async (areaKeys) => {
		const storage = await storageRef(area);
		try {
			if (storage.area === "sync") {
				if (areaKeys.sync.length) {
					await storage.ref.remove(areaKeys.sync);
				}
				if (areaKeys.local.length) {
					await browser.storage.local.remove(areaKeys.local);
				}
			} else {
				await storage.ref.remove(areaKeys.all);
			}
			return true;
		} catch (error) {
			return console.error(error);
		}
	};
	// [muilt settings]
	if (Array.isArray(keys)) {
		if (!keys.length) {
			return console.error("Settings keys empty:", keys);
		}
		const areaKeys = { local: [], sync: [], all: [] };
		for (const k of keys) {
			const key = storageKey(k);
			// check if key exist in settingsDefine
			if (!Object.hasOwn(settingsDefine, key)) {
				return console.error("unexpected settings key:", key);
			}
			// check if key is protected
			if (settingsDefine[key].protect === true) {
				return console.error("protected settings key:", key);
			}
			// detach only locally stored settings
			settingsDefine[key].local === true
				? areaKeys.local.push(key)
				: areaKeys.sync.push(key);
			// record all keys in case sync storage is not enabled
			areaKeys.all.push(key);
		}
		return complexRemove(areaKeys);
	}
	// [all settings]
	if (typeof keys == "undefined" || keys === null) {
		const areaKeys = { local: [], sync: [], all: [] };
		for (const key in settingsDefine) {
			// skip protected keys
			if (settingsDefine[key].protect === true) continue;
			// detach only locally stored settings
			settingsDefine[key].local === true
				? areaKeys.local.push(key)
				: areaKeys.sync.push(key);
			// record all keys in case sync storage is not enabled
			areaKeys.all.push(key);
		}
		return complexRemove(areaKeys);
	}
	return console.error("Unexpected keys type:", keys);
}

/**
 * complex onChanged
 * this function is convenient for the svelte store to update the state
 * @param {Function} callback
 * @returns {void}
 */
export function onChangedSettings(callback) {
	if (typeof callback != "function") {
		return console.error("Unexpected callback:", callback);
	}
	console.info("storage onChanged addListener");
	/**
	 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged#listener}
	 * @param {object} changes
	 * @param {"sync"|"local"} area
	 */
	const listener = (changes, area) => {
		// console.log(`storage.${area}.onChanged`, changes); // DEBUG
		const settings = {};
		for (const key in changes) {
			if (!Object.hasOwn(settingsDefine, key)) continue;
			settings[settingsDefine[key].name] = changes[key].newValue;
		}
		try {
			callback(settings, area);
		} catch (error) {
			console.error("onChanged callback:", error);
		}
	};
	browser.storage.onChanged.addListener(listener);
}

// the following functions are used only for compatibility transition periods
// these functions will be removed in the future, perhaps in version 5.0

/**
 * settings.legacyGet
 * @param {string|Array.<string>} keys
 * @returns {Promise} settings object with legacy keys
 */
export async function legacyGet(keys = undefined) {
	const result = await get(keys);
	// console.log("legacy_get", keys, result);
	for (const key of Object.keys(result)) {
		const legacy = settingsDefine[storageKey(key)]?.legacy;
		if (legacy) result[legacy] = result[key];
	}
	return result;
}

/**
 * settings.legacySet
 * @param {object} keys legacy keys
 * @returns {Promise}
 */
export async function legacySet(keys) {
	if (typeof keys != "object") {
		return console.error("Unexpected arg type:", keys);
	}
	if (!Object.keys(keys).length) {
		return console.error("Settings object empty:", keys);
	}
	const settings = {};
	for (const key of Object.keys(settingsDefine)) {
		const setting = settingsDefine[key];
		if (!setting.legacy) continue;
		if (setting.legacy in keys) {
			settings[setting.name] = keys[setting.legacy];
		}
	}
	// console.log("legacy_set", keys, settings);
	return set(settings);
}

export async function legacyImport() {
	// if legacy data has already been imported, skip this process
	const imported = await get("legacy_imported");
	if (imported) return console.info("Legacy settings has already imported");
	// start the one-time import process
	const result = await browser.runtime.sendNativeMessage("app", {
		name: "PAGE_LEGACY_IMPORT",
	});
	if (result.error) return console.error(result.error);
	console.info("Import settings data from legacy manifest file");
	const settings = {};
	for (const key of Object.keys(settingsDefine)) {
		const legacy = settingsDefine[key].legacy;
		if (legacy in result) {
			let value = result[legacy];
			switch (settingsDefine[key].type) {
				case "boolean":
					value = JSON.parse(value);
					break;
				case "number":
					value = Number(value);
					break;
			}
			console.info(`Importing legacy setting: ${legacy}`, value);
			settings[settingsDefine[key].name] = value;
		}
	}
	// import complete tag, to ensure will only be import once
	Object.assign(settings, { legacy_imported: Date.now() });
	if (await set(settings, "local")) {
		console.info("Import legacy settings complete");
		// send a message to the Swift layer to safely clean up legacy data
		// browser.runtime.sendNativeMessage({name: "PAGE_LEGACY_IMPORTED"});
		return true;
	}
	return console.error("Import legacy settings abort");
}
