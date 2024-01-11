/**
 * @file wrap a relatively independent settings storage with its own functions
 */

/** @type {string} */
const storagePrefix = "US_";

/**
 * Convert name to storage key
 * @param {string} name
 * @returns prefixed storage key
 */
const storageKey = (name) => storagePrefix + name.toUpperCase();

/**
 * @typedef {"sync"|"local"|"managed"|"session"} Areas
 *
 * @param {"sync"|"local"=} area - storage area
 * @returns Dynamic storage reference
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
	if (import.meta.env.BROWSER === "Safari") {
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

/**
 * @typedef {Object} Platforms platform availability
 * @property {any=} macos - overriding defaults
 * @property {any=} ipados - overriding defaults
 * @property {any=} ios - overriding defaults
 *
 * @typedef {Object} Setting The setting item
 * @property {string} name - setting's name
 * @property {"string"|"number"|"boolean"|"object"|"array"} type - setting's value type
 * @property {boolean=} local - local settings will not be synced
 * @property {Array=} values - setting's values list
 * @property {any} default - setting's default value
 * @property {boolean=} disable - disabled settings not be displayed
 * @property {boolean=} protect - protected settings cannot be reset
 * @property {boolean=} confirm - double confirmation is required when change
 * @property {Platforms=} platforms - platform availability and overriding defaults
 * @property {"INTERNAL"|"general"|"editor"} group - setting's group name
 * @property {string=} legacy - setting's legacy name
 * @property {"Toggle"|"select"|"textarea"=} nodeType - setting's node type
 * @property {Object=} nodeClass - node class name with setting's value
 *
 * @typedef {Setting & {key: string}} SettingWithKey The setting item with storage key
 */

/** @type {Readonly<Setting>} - Read-only setting template and fallback defaults */
const settingDefault = deepFreeze({
	name: "setting_default",
	type: undefined,
	local: false,
	values: [],
	default: undefined,
	disable: false,
	protect: false,
	confirm: false,
	platforms: { macos: undefined, ipados: undefined, ios: undefined },
	group: "INTERNAL",
	legacy: "",
	nodeType: undefined,
	nodeClass: {},
});

/** @type {Readonly<Setting[]>} - Read-only settings definition */
const settingsDefinition = [
	{
		name: "error_native",
		type: "object",
		local: true,
		default: { error: undefined },
		group: "INTERNAL",
	},
	{
		name: "legacy_imported",
		type: "number",
		local: true,
		default: 0,
		protect: true,
		platforms: { macos: undefined },
		group: "INTERNAL",
	},
	{
		name: "language_code",
		type: "string",
		default: "en",
		group: "INTERNAL",
		legacy: "languageCode",
	},
	{
		name: "settings_sync",
		type: "boolean",
		local: true,
		default: false,
		disable: true,
		protect: true,
		group: "general",
		nodeType: "Toggle",
	},
	{
		name: "toolbar_badge_count",
		type: "boolean",
		default: true,
		platforms: { macos: true, ipados: true, ios: false },
		group: "general",
		legacy: "showCount",
		nodeType: "Toggle",
	},
	{
		name: "global_active",
		type: "boolean",
		local: true,
		default: true,
		group: "general",
		legacy: "active",
		nodeType: "Toggle",
		nodeClass: { warn: false },
	},
	{
		name: "global_scripts_update_check",
		type: "boolean",
		default: true,
		group: "general",
		nodeType: "Toggle",
	},
	{
		name: "scripts_settings",
		type: "object",
		default: {},
		disable: true,
		group: "INTERNAL",
	},
	{
		name: "scripts_update_check_interval",
		type: "number",
		values: [0, 1, 3, 7, 15, 30],
		default: 0,
		group: "general",
		nodeType: "select",
	},
	{
		name: "scripts_update_check_lasttime",
		type: "number",
		default: 0,
		group: "INTERNAL",
	},
	{
		name: "scripts_update_automation",
		type: "boolean",
		default: false,
		disable: true,
		confirm: true,
		group: "general",
		nodeType: "Toggle",
		nodeClass: { warn: true },
	},
	{
		name: "global_exclude_match",
		type: "object",
		default: [],
		group: "general",
		legacy: "blacklist",
		nodeType: "textarea",
	},
	{
		name: "editor_close_brackets",
		type: "boolean",
		default: true,
		platforms: { macos: undefined },
		group: "editor",
		legacy: "autoCloseBrackets",
		nodeType: "Toggle",
	},
	{
		name: "editor_auto_hint",
		type: "boolean",
		default: true,
		platforms: { macos: undefined },
		group: "editor",
		legacy: "autoHint",
		nodeType: "Toggle",
	},
	{
		name: "editor_list_sort",
		type: "string",
		values: ["nameAsc", "nameDesc", "lastModifiedAsc", "lastModifiedDesc"],
		default: "lastModifiedDesc",
		platforms: { macos: undefined },
		group: "editor",
		legacy: "sortOrder",
		nodeType: "select",
	},
	{
		name: "editor_list_descriptions",
		type: "boolean",
		default: true,
		platforms: { macos: undefined },
		group: "editor",
		legacy: "descriptions",
		nodeType: "Toggle",
	},
	{
		name: "editor_javascript_lint",
		type: "boolean",
		default: false,
		platforms: { macos: undefined },
		group: "editor",
		legacy: "lint",
		nodeType: "Toggle",
	},
	{
		name: "editor_show_whitespace",
		type: "boolean",
		default: true,
		platforms: { macos: undefined },
		group: "editor",
		legacy: "showInvisibles",
		nodeType: "Toggle",
	},
	{
		name: "editor_tab_size",
		type: "number",
		values: [1, 2, 3, 4, 5, 6, 8, 10, 12],
		default: 4,
		platforms: { macos: undefined },
		group: "editor",
		legacy: "tabSize",
		nodeType: "select",
	},
];

/** @type {Readonly<{[key: string]: SettingWithKey}>} - Read-only settings dictionary */
export const settingsDictionary = deepFreeze(
	settingsDefinition.reduce(settingsDefinitionReduceCallbackFn, {}),
);

/**
 * populate the settings-define with setting-default
 * and convert settings-define to storage-key object
 * @param {{[key: string]: SettingWithKey}} settings settings dictionary
 * @param {Setting} setting each setting define
 * @returns // {US_GLOBAL_ACTIVE: {key: US_GLOBAL_ACTIVE, name: global_active, ... }, ...}
 */
function settingsDefinitionReduceCallbackFn(settings, setting) {
	const key = storageKey(setting.name);
	settings[key] = { ...settingDefault, ...setting, key };
	return settings;
}

/**
 * prevent settings define from being modified in any case
 * otherwise user settings may be lost in the worst case
 * @type {<T>(o: T) => Readonly<T>}
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
 * @param {string|string[]} keys key | array of keys | undefined for all
 * @param {"local"|"sync"} area
 * @returns settings object
 */
export async function get(keys = undefined, area = undefined) {
	if (![undefined, "local", "sync"].includes(area)) {
		return console.error("Unexpected storage area:", area);
	}
	// validate setting value and fix surprises to default
	/** @param {string} key @param {any} val  */
	const valueFix = (key, val) => {
		if (!key || !Object.hasOwn(settingsDictionary, key)) return;
		const def = settingsDictionary[key].default;
		// check if value type conforms to settings-dictionary
		const type = settingsDictionary[key].type;
		// eslint-disable-next-line valid-typeof -- type known to be valid string literal
		if (typeof val != type) {
			console.warn(
				`Unexpected ${key} value type '${typeof val}' should '${type}', fix to default`,
			);
			return def;
		}
		// check if value conforms to settings-dictionary
		const values = settingsDictionary[key].values;
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
		// check if key exist in settings-dictionary
		if (!Object.hasOwn(settingsDictionary, key)) {
			return console.error("unexpected settings key:", key);
		}
		// check if only locally stored setting
		// eslint-disable-next-line no-param-reassign -- change the area is expected
		settingsDictionary[key].local === true && (area = "local");
		const storage = await storageRef(area);
		const result = await storage.ref.get(key);
		if (Object.hasOwn(result, key)) return valueFix(key, result[key]);
		return settingsDictionary[key].default;
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
			p[settingsDictionary[c[0]].name] = valueFix(...c);
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
			// check if key exist in settings-dictionary
			if (!Object.hasOwn(settingsDictionary, key)) {
				return console.error("unexpected settings key:", key);
			}
			settingsDefault[key] = settingsDictionary[key].default;
			// detach only locally stored settings
			settingsDictionary[key].local === true
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
		for (const key of Object.keys(settingsDictionary)) {
			settingsDefault[key] = settingsDictionary[key].default;
			// detach only locally stored settings
			settingsDictionary[key].local === true
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
		// check if key exist in settings-dictionary
		if (!Object.hasOwn(settingsDictionary, key)) {
			return console.error("Unexpected settings keys:", key);
		}
		// check if value type conforms to settings-dictionary
		const type = settingsDictionary[key].type;
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
		// check if value conforms to settings-dictionary
		const values = settingsDictionary[key].values;
		if (values.length && !values.includes(keys[k])) {
			return console.error(
				`Unexpected ${k} value '${keys[k]}' should one of '${values}'`,
			);
		}
		// detach only locally stored settings
		settingsDictionary[key].local === true
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
 * @param {string|string[]} keys key | array of keys | undefined for all
 * @param {"local"|"sync"} area
 */
export async function reset(keys = undefined, area = undefined) {
	if (![undefined, "local", "sync"].includes(area)) {
		return console.error("unexpected storage area:", area);
	}
	// [single setting]
	if (typeof keys == "string") {
		const key = storageKey(keys);
		// check if key exist in settings-dictionary
		if (!Object.hasOwn(settingsDictionary, key)) {
			return console.error("unexpected settings key:", key);
		}
		// check if key is protected
		if (settingsDictionary[key].protect === true) {
			return console.error("protected settings key:", key);
		}
		// eslint-disable-next-line no-param-reassign -- change the area is expected
		settingsDictionary[key].local === true && (area = "local");
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
			// check if key exist in settings-dictionary
			if (!Object.hasOwn(settingsDictionary, key)) {
				return console.error("unexpected settings key:", key);
			}
			// check if key is protected
			if (settingsDictionary[key].protect === true) {
				return console.error("protected settings key:", key);
			}
			// detach only locally stored settings
			settingsDictionary[key].local === true
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
		for (const key in settingsDictionary) {
			// skip protected keys
			if (settingsDictionary[key].protect === true) continue;
			// detach only locally stored settings
			settingsDictionary[key].local === true
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
 * @callback onChangedSettingsCallback
 * @param {{[key: string]: any}} settings - changed settings
 * @param {Areas} area - storage area
 * @returns {void}
 * @param {onChangedSettingsCallback} callback
 */
export function onChangedSettings(callback) {
	if (typeof callback != "function") {
		return console.error("Unexpected callback:", callback);
	}
	console.info("storage onChanged addListener");
	/**
	 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged#listener}
	 * @param {object} changes
	 * @param {Areas} area
	 */
	const listener = (changes, area) => {
		// console.log(`storage.${area}.onChanged`, changes); // DEBUG
		const settings = {};
		for (const key in changes) {
			if (!Object.hasOwn(settingsDictionary, key)) continue;
			settings[settingsDictionary[key].name] = changes[key].newValue;
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

export async function legacyImport() {
	// if legacy data has already been imported, skip this process
	const imported = await get("legacy_imported");
	if (imported) return console.info("Legacy settings has already imported");
	// start the one-time import process
	const result = await browser.runtime.sendNativeMessage("app", {
		name: "PAGE_LEGACY_IMPORT",
	});
	if (!result) return console.error("PAGE_LEGACY_IMPORT not response");
	if (result.error) return console.error(result.error);
	console.info("Import settings data from legacy manifest file");
	const settings = {};
	for (const key of Object.keys(settingsDictionary)) {
		const legacy = settingsDictionary[key].legacy;
		if (legacy in result) {
			let value = result[legacy];
			switch (settingsDictionary[key].type) {
				case "boolean":
					value = JSON.parse(value);
					break;
				case "number":
					value = Number(value);
					break;
			}
			console.info(`Importing legacy setting: ${legacy}`, value);
			settings[settingsDictionary[key].name] = value;
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
