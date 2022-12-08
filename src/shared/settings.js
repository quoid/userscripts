// wrap a relatively independent settings storage with its own functions

const storagePrefix = "US_";
const storageKey = key => storagePrefix + key.toUpperCase();
// const storageRef = async area => { // dynamic storage reference
//     browser.storage.sync.area = "sync";
//     browser.storage.local.area = "local";
//     if (area === "sync") return browser.storage.sync;
//     if (area === "local") return browser.storage.local;
//     const key = storageKey("settings_sync");
//     const result = await browser.storage.local.get(key);
//     if (result?.[key] === true) {
//         return browser.storage.sync;
//     } else {
//         return browser.storage.local;
//     }
// };

// https://developer.apple.com/documentation/safariservices/safari_web_extensions/assessing_your_safari_web_extension_s_browser_compatibility#3584139
// since storage sync is not implemented in Safari, currently only returns using local storage
const storageRef = async () => {
    browser.storage.local.area = "local";
    return browser.storage.local;
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
    nodeClass: {}
});

export const settingsDefine = deepFreeze([
    {
        name: "legacy_imported",
        type: "number",
        local: true,
        default: 0,
        protect: true,
        platforms: ["macos"],
        group: "Internal"
    },
    {
        name: "language_code",
        type: "string",
        default: "en",
        platforms: ["macos", "ipados", "ios"],
        group: "Internal",
        legacy: "languageCode"
    },
    {
        name: "scripts_settings",
        type: "object",
        default: {},
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Scripts update check active",
            zh_hans: "脚本更新检查激活"
        },
        langTitle: {
            en: "Whether to enable each single script update check",
            zh_hans: "是否开启单个脚本更新检查"
        },
        group: "Internal",
        nodeType: "Subpage"
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
            zh_hans: "工具栏图标显示计数徽章"
        },
        langTitle: {
            en: "displays a badge on the toolbar icon with a number that represents how many enabled scripts match the url for the page you are on",
            zh_hans: "简体中文描述"
        },
        group: "General",
        legacy: "showCount",
        nodeType: "Toggle"
    },
    {
        name: "global_active",
        type: "boolean",
        local: true,
        default: true,
        platforms: ["macos"],
        langLabel: {
            en: "Enable Injection",
            zh_hans: "启用注入"
        },
        langTitle: {
            en: "toggle on/off script injection for the pages you visit",
            zh_hans: "简体中文描述"
        },
        group: "General",
        legacy: "active",
        nodeType: "Toggle",
        nodeClass: {red: false}
    },
    {
        name: "global_scripts_update_check",
        type: "boolean",
        default: true,
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Global scripts update check",
            zh_hans: "全局脚本更新检查"
        },
        langTitle: {
            en: "Whether to enable global periodic script update check",
            zh_hans: "是否开启全局定期脚本更新检查"
        },
        group: "General",
        nodeType: "Toggle"
    },
    {
        name: "scripts_update_check_interval",
        type: "number",
        default: 86400000,
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Scripts update check interval",
            zh_hans: "脚本更新检查间隔"
        },
        langTitle: {
            en: "The interval for script update check in background",
            zh_hans: "脚本更新检查的间隔时间"
        },
        group: "General",
        nodeType: "Toggle"
    },
    {
        name: "scripts_update_check_lasttime",
        type: "number",
        default: 0,
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Scripts update check lasttime",
            zh_hans: "脚本更新上次检查时间"
        },
        langTitle: {
            en: "The lasttime for script update check in background",
            zh_hans: "后台脚本更新上次检查时间"
        },
        group: "Internal",
        nodeType: "Toggle"
    },
    {
        name: "scripts_auto_update",
        type: "boolean",
        default: false,
        confirm: true,
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Scripts silent auto update",
            zh_hans: "脚本后台静默自动更新"
        },
        langTitle: {
            en: "Script silently auto-updates in the background, which is dangerous and may introduce unconfirmed malicious code",
            zh_hans: "脚本在后台静默自动更新，这是危险的，可能引入未经确认的恶意代码"
        },
        group: "General",
        nodeType: "Toggle",
        nodeClass: {warn: true}
    },
    {
        name: "global_exclude_match",
        type: "object",
        default: [],
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Global exclude match patterns",
            zh_hans: "全局排除匹配模式列表"
        },
        langTitle: {
            en: "this input accepts a comma separated list of @match patterns, a page url that matches against a pattern in this list will be ignored for script injection",
            zh_hans: "简体中文描述"
        },
        group: "General",
        legacy: "blacklist",
        nodeType: "textarea",
        nodeClass: {red: "blacklistError"}
    },
    {
        name: "editor_close_brackets",
        type: "boolean",
        default: true,
        platforms: ["macos"],
        langLabel: {
            en: "Auto Close Brackets",
            zh_hans: "自动关闭括号"
        },
        langTitle: {
            en: "toggles on/off auto closing of brackets in the editor, this affects the following characters: () [] {} \"\" ''",
            zh_hans: "简体中文描述"
        },
        group: "Editor",
        legacy: "autoCloseBrackets",
        nodeType: "Toggle"
    },
    {
        name: "editor_auto_hint",
        type: "boolean",
        default: true,
        platforms: ["macos"],
        langLabel: {
            en: "Auto Hint",
            zh_hans: "自动提示(Hint)"
        },
        langTitle: {
            en: "automatically shows completion hints while editing",
            zh_hans: "简体中文描述"
        },
        group: "Editor",
        legacy: "autoHint",
        nodeType: "Toggle"
    },
    {
        name: "editor_list_sort",
        type: "string",
        values: ["nameAsc", "nameDesc", "lastModifiedAsc", "lastModifiedDesc"],
        default: "lastModifiedDesc",
        platforms: ["macos"],
        langLabel: {
            en: "Sort order",
            zh_hans: "排序顺序"
        },
        langTitle: {
            en: "Display order of items in sidebar",
            zh_hans: "侧栏中项目的显示顺序"
        },
        group: "Editor",
        legacy: "sortOrder",
        nodeType: "Dropdown"
    },
    {
        name: "editor_list_descriptions",
        type: "boolean",
        default: true,
        platforms: ["macos"],
        langLabel: {
            en: "Show List Descriptions",
            zh_hans: "显示列表项目描述"
        },
        langTitle: {
            en: "show or hides the item descriptions in the sidebar",
            zh_hans: "简体中文描述"
        },
        group: "Editor",
        legacy: "descriptions",
        nodeType: "Toggle"
    },
    {
        name: "editor_javascript_lint",
        type: "boolean",
        default: false,
        platforms: ["macos"],
        langLabel: {
            en: "Javascript Linter",
            zh_hans: "Javascript Linter"
        },
        langTitle: {
            en: "toggles basic Javascript linting within the editor",
            zh_hans: "简体中文描述"
        },
        group: "Editor",
        legacy: "lint",
        nodeType: "Toggle"
    },
    {
        name: "editor_show_whitespace",
        type: "boolean",
        default: true,
        platforms: ["macos"],
        langLabel: {
            en: "Show whitespace characters",
            zh_hans: "显示空白字符"
        },
        langTitle: {
            en: "toggles the display of invisible characters in the editor",
            zh_hans: "简体中文描述"
        },
        group: "Editor",
        legacy: "showInvisibles",
        nodeType: "Toggle"
    },
    {
        name: "editor_tab_size",
        type: "number",
        values: [2, 4],
        default: 4,
        platforms: ["macos"],
        langLabel: {
            en: "Tab Size",
            zh_hans: "制表符大小"
        },
        langTitle: {
            en: "the number of spaces a tab is equal to while editing",
            zh_hans: "简体中文描述"
        },
        group: "Editor",
        legacy: "tabSize",
        nodeType: "select"
    }
].reduce(settingsDefineReduceCallback, {}));

// populate the settingsDefine with settingDefault
// and convert settingsDefine to storageKey object
function settingsDefineReduceCallback(settings, setting) {
    setting.key = storageKey(setting.name);
    settings[setting.key] = {...settingDefault, ...setting};
    return settings;
}

// prevent settings define from being modified in any case
// otherwise user settings may be lost in the worst case
function deepFreeze(object) {
    for (const p in object) {
        if (typeof object[p] == "object") {
            deepFreeze(object[p]);
        }
    }
    return Object.freeze(object);
}

// export and define the operation method of settings storage
// they are similar to browser.storage but slightly different

export async function get(keys, area) {
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
            console.warn(`Unexpected ${key} value type '${typeof val}' should '${type}', fix to default`);
            return def;
        }
        // check if value conforms to settingsDefine
        const values = settingsDefine[key].values;
        if (values.length && !values.includes(val)) {
            console.warn(`Unexpected ${key} value '${val}' should one of '${values}', fix to default`);
            return def;
        }
        // verified, pass original value
        return val;
    };
    if (typeof keys == "string") { // [single setting]
        const key = storageKey(keys);
        // check if key exist in settingsDefine
        if (!Object.hasOwn(settingsDefine, key)) {
            return console.error("unexpected settings key:", key);
        }
        // check if only locally stored setting
        // eslint-disable-next-line no-param-reassign -- change the area is expected
        settingsDefine[key].local === true && (area = "local");
        const storage = await storageRef(area);
        const result = await storage.get(key);
        if (Object.hasOwn(result, key)) return valueFix(key, result[key]);
        return settingsDefine[key].default;
    }
    const complexGet = async (settingsDefault, areaKeys) => {
        const storage = await storageRef(area);
        let local = {}, sync = {};
        if (storage.area === "sync") {
            if (areaKeys.sync.length) {
                sync = await storage.get(areaKeys.sync);
            }
            if (areaKeys.local.length) {
                const storageLocal = await storageRef("local");
                local = await storageLocal.get(areaKeys.local);
            }
        } else {
            local = await storage.get(areaKeys.all);
        }
        const result = Object.assign(settingsDefault, local, sync);
        // revert settings object property name
        return Object.entries(result).reduce((p, c) => {
            p[settingsDefine[c[0]].name] = valueFix(...c);
            return p;
        }, {});
    };
    if (Array.isArray(keys)) { // [muilt settings]
        if (!keys.length) {
            return console.error("Settings keys empty:", keys);
        }
        const settingsDefault = {};
        const areaKeys = {local: [], sync: [], all: []};
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
    if (typeof keys == "undefined" || keys === null) { // [all settings]
        const settingsDefault = {};
        const areaKeys = {local: [], sync: [], all: []};
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

export async function set(keys, area) {
    if (![undefined, "local", "sync"].includes(area)) {
        return console.error("unexpected storage area:", area);
    }
    if (typeof keys != "object") {
        return console.error("Unexpected keys type:", keys);
    }
    if (!Object.keys(keys).length) {
        return console.error("Settings object empty:", keys);
    }
    const areaKeys = {local: {}, sync: {}, all: {}};
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
            if (type === "number" && !Number.isNaN(Number(keys[k]))) { // compatible with string numbers
                keys[k] = Number(keys[k]); // still store it as a number type
            } else {
                return console.error(`Unexpected ${k} value type '${typeof keys[k]}' should '${type}'`);
            }
        }
        // check if value conforms to settingsDefine
        const values = settingsDefine[key].values;
        if (values.length && !values.includes(keys[k])) {
            return console.error(`Unexpected ${k} value '${keys[k]}' should one of '${values}'`);
        }
        // detach only locally stored settings
        settingsDefine[key].local === true
            ? areaKeys.local[key] = keys[k]
            : areaKeys.sync[key] = keys[k];
        // record all keys in case sync storage is not enabled
        areaKeys.all[key] = keys[k];
    }
    const storage = await storageRef(area);
    // complexSet
    try {
        if (storage.area === "sync") {
            if (Object.keys(areaKeys.sync).length) {
                await storage.set(areaKeys.sync);
            }
            if (Object.keys(areaKeys.local).length) {
                const storageLocal = await storageRef("local");
                await storageLocal.set(areaKeys.local);
            }
        } else {
            await storage.set(areaKeys.all);
        }
        return true;
    } catch (error) {
        return console.error(error);
    }
}

export async function reset(keys, area) { // reset to default
    if (![undefined, "local", "sync"].includes(area)) {
        return console.error("unexpected storage area:", area);
    }
    if (typeof keys == "string") { // [single setting]
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
        return storage.remove(key);
    }
    const complexRemove = async areaKeys => {
        const storage = await storageRef(area);
        try {
            if (storage.area === "sync") {
                if (areaKeys.sync.length) {
                    await storage.remove(areaKeys.sync);
                }
                if (areaKeys.local.length) {
                    const storageLocal = await storageRef("local");
                    await storageLocal.remove(areaKeys.local);
                }
            } else {
                await storage.remove(areaKeys.all);
            }
            return true;
        } catch (error) {
            return console.error(error);
        }
    };
    if (Array.isArray(keys)) { // [muilt settings]
        if (!keys.length) {
            return console.error("Settings keys empty:", keys);
        }
        const areaKeys = {local: [], sync: [], all: []};
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
    if (typeof keys == "undefined" || keys === null) { // [all settings]
        const areaKeys = {local: [], sync: [], all: []};
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

// this function is convenient for the svelte store to update the state
export function onChanged(callback) { // complex onChanged
    if (typeof callback != "function") {
        return console.error("Unexpected callback:", callback);
    }
    console.info("storage onChanged addListener");
    const handle = (changes, area) => {
        // console.log(`storage.${area}.onChanged`, changes);
        try {
            const settings = {};
            for (const key in changes) {
                if (!Object.hasOwn(settingsDefine, key)) continue;
                settings[settingsDefine[key].name] = changes[key].newValue;
            }
            callback(settings, area);
        } catch (error) {
            console.error("onChanged callback:", error);
        }
    };
    // comment for now same reason as `storageRef` function
    // browser.storage.sync.onChanged.addListener(c => handle(c, "sync"));
    browser.storage.local.onChanged.addListener(c => handle(c, "local"));
}

// the following functions are used only for compatibility transition periods
// these functions will be removed in the future, perhaps in version 5.0

export async function legacyGet(keys) {
    const result = await get(keys);
    // console.log("legacy_get", keys, result);
    for (const key of Object.keys(result)) {
        const legacy = settingsDefine[storageKey(key)]?.legacy;
        if (legacy) result[legacy] = result[key];
    }
    return result;
}

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
    const result = await browser.runtime.sendNativeMessage({name: "PAGE_LEGACY_IMPORT"});
    if (result.error) return console.error(result.error);
    console.info("Import settings data from legacy manifest file");
    const settings = {};
    for (const key of Object.keys(settingsDefine)) {
        const legacy = settingsDefine[key].legacy;
        if (legacy in result) {
            let value = result[legacy];
            switch (settingsDefine[key].type) {
                case "boolean": value = JSON.parse(value); break;
                case "number": value = Number(value); break;
            }
            console.info(`Importing legacy setting: ${legacy}`, value);
            settings[settingsDefine[key].name] = value;
        }
    }
    // import complete tag, to ensure will only be import once
    Object.assign(settings, {legacy_imported: Date.now()});
    if (await set(settings, "local")) {
        console.info("Import legacy settings complete");
        // send a message to the Swift layer to safely clean up legacy data
        // browser.runtime.sendNativeMessage({name: "PAGE_LEGACY_IMPORTED"});
        return true;
    }
    return console.error("Import legacy settings abort");
}
