function deepFreeze(object) {
    for (const p in object) {
        if (typeof object[p] == "object") {
            deepFreeze(object[p]);
        }
    }
    return Object.freeze(object);
}

const settingDefault = deepFreeze({
    name: "setting_default",
    type: undefined,
    local: false,
    default: undefined,
    confirm: false,
    writable: true,
    platforms: ["macos", "ipados", "ios"],
    langLabel: {},
    langTitle: {},
    group: "",
    nodeType: "",
    nodeClass: {}
});

const settingsDefine = [
    {
        name: "legacy_imported",
        type: "boolean",
        local: true,
        default: false,
        platforms: ["macos"],
        group: "Internal"
    },
    {
        name: "settings_sync",
        type: "boolean",
        local: true,
        default: false,
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Sync settings",
            zh_hans: "同步设置"
        },
        langTitle: {
            en: "Sync settings across devices",
            zh_hans: "跨设备同步设置"
        },
        group: "General",
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
        type: "boolean",
        default: true,
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Scripts update check interval",
            zh_hans: "脚本更新检查间隔"
        },
        langTitle: {
            en: "The interval for script update check in background",
            zh_hans: "后台脚本更新检查的间隔时间"
        },
        group: "General",
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
        name: "location_path",
        type: "string",
        local: true,
        default: true,
        writable: false,
        platforms: ["macos", "ipados", "ios"],
        langLabel: {
            en: "Save Location",
            zh_hans: "脚本存储路径"
        },
        langTitle: {
            en: "where your file are currently located and being saved to (clic to open)",
            zh_hans: "简体中文描述"
        },
        group: "General",
        legacy: "saveLocation",
        nodeType: "IconButton"
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
        name: "editor_list_descriptions",
        type: "boolean",
        default: false,
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
];

const storagePrefix = "US_";
const storageKey = key => storagePrefix + key.toUpperCase();
const storageRef = async area => { // storage reference
    browser.storage.sync.area = "sync";
    browser.storage.local.area = "local";
    if (area === "sync") return browser.storage.sync;
    if (area === "local") return browser.storage.local;
    const key = storageKey("settings_sync");
    const result = await browser.storage.local.get(key);
    if (result?.[key] === true) {
        return browser.storage.sync;
    } else {
        return browser.storage.local;
    }
};

export const settingsConfig = settingsDefine.reduce((arr, val) => {
    val.key = storageKey(val.name);
    arr[val.key] = Object.assign({}, settingDefault, val);
    return arr;
}, {});

deepFreeze(settingsConfig);
deepFreeze(settingsDefine);

export const settingsKeys = deepFreeze(Object.keys(settingsConfig));

export async function get(keys, area) {
    if (![undefined, "local", "sync"].includes(area)) {
        return console.error("unexpected storage area:", area);
    }
    if (typeof keys == "string") { // single setting
        const key = storageKey(keys);
        if (!settingsKeys.includes(key)) {
            return console.error("unexpected settings key:", key);
        }
        settingsConfig[key].local === true && (area = "local");
        const storage = await storageRef(area);
        const result = await storage.get(key);
        return result[key] ?? settingsConfig[key].default;
    }
    const complexGet = async areaKeys => {
        const storage = await storageRef(area);
        const results = {local: {}, sync: {}};
        if (storage.area === "sync") {
            if (areaKeys.sync.length) {
                results.sync = await storage.get(areaKeys.sync);
            }
            if (areaKeys.local.length) {
                const storage = await storageRef("local");
                results.local = await storage.get(areaKeys.local);
            }
        } else {
            results.local = await storage.get(areaKeys.all);
        }
        return results;
    };
    if (Array.isArray(keys)) { // muilt settings
        if (!keys.length) {
            return console.error("Settings keys empty:", keys);
        }
        const areaKeys = {local: [], sync: [], all: []};
        const settingsDefault = {};
        for (const k of keys) {
            const key = storageKey(k);
            if (!settingsKeys.includes(key)) {
                return console.error("unexpected settings key:", key);
            }
            settingsDefault[key] = settingsConfig[key].default;
            settingsConfig[key].local === true
                ? areaKeys.local.push(key)
                : areaKeys.sync.push(key);
            areaKeys.all.push(key);
        }
        const {local, sync} = complexGet(areaKeys);
        return Object.assign(settingsDefault, local, sync);
    }
    if (typeof keys == "undefined" || keys === null) { // all settings
        const areaKeys = {local: [], sync: [], all: []};
        const settingsDefault = {};
        for (const key in settingsConfig) {
            settingsDefault[key] = settingsConfig[key].default;
            settingsConfig[key].local === true
                ? areaKeys.local.push(key)
                : areaKeys.sync.push(key);
            areaKeys.all.push(key);
        }
        const {local, sync} = complexGet(areaKeys);
        return Object.assign(settingsDefault, local, sync);
    }
    return console.error("Unexpected arg type:", keys);
}

export async function set(keys, area) {
    if (![undefined, "local", "sync"].includes(area)) {
        return console.error("unexpected storage area:", area);
    }
    if (typeof keys != "object") {
        return console.error("Unexpected arg type:", keys);
    }
    if (!Object.keys(keys).length) {
        return console.error("Settings object empty:", keys);
    }
    const areaKeys = {local: {}, sync: {}, all: {}};
    for (const k in keys) {
        const key = storageKey(k);
        if (!settingsKeys.includes(key)) {
            return console.error("Unexpected settings keys:", key);
        }
        const type = settingsConfig[key].type;
        if (typeof keys[k] != type) {
            return console.error(`Unexpected value type ${typeof(value)} should ${type}`);
        }
        settingsConfig[key].local === true
            ? areaKeys.local[key] = keys[k]
            : areaKeys.sync[key] = keys[k];
        areaKeys.all[key] = keys[k];
    }
    const storage = await storageRef(area);
    try {
        if (storage.area === "sync") {
            if (Object.keys(areaKeys.sync).length) {
                await storage.set(areaKeys.sync);
            }
            if (Object.keys(areaKeys.local).length) {
                const storage = await storageRef("local");
                await storage.set(areaKeys.local);
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
    if (typeof keys == "string") { // single setting
        const key = storageKey(keys);
        if (!settingsKeys.includes(key)) {
            return console.error("unexpected settings key:", key);
        }
        settingsConfig[key].local === true && (area = "local");
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
                    const storage = await storageRef("local");
                    await storage.remove(areaKeys.local);
                }
            } else {
                await storage.remove(areaKeys.all);
            }
            return true;
        } catch (error) {
            return console.error(error);
        }
    };
    if (Array.isArray(keys)) { // muilt settings
        if (!keys.length) {
            return console.error("Settings keys empty:", keys);
        }
        const areaKeys = {local: [], sync: [], all: []};
        for (const k of keys) {
            const key = storageKey(k);
            if (!settingsKeys.includes(key)) {
                return console.error("unexpected settings key:", key);
            }
            settingsConfig[key].local === true
                ? areaKeys.local.push(key)
                : areaKeys.sync.push(key);
            areaKeys.all.push(key);
        }
        return complexRemove(areaKeys);
    }
    if (typeof keys == "undefined" || keys === null) { // all settings
        const areaKeys = {local: [], sync: [], all: []};
        for (const key in settingsConfig) {
            settingsConfig[key].local === true
                ? areaKeys.local.push(key)
                : areaKeys.sync.push(key);
            areaKeys.all.push(key);
        }
        return complexRemove(areaKeys);
    }
    return console.error("Unexpected arg type:", keys);
}

export async function import_legacy_data() {
    const imported = await get("legacy_imported");
    if (imported) return console.info("Legacy settings has already imported");
    const result = await browser.runtime.sendNativeMessage({name: "PAGE_INIT_DATA"});
    if (result.error) return console.error(result.error);
    console.info("Import settings data from legacy manifest file");
    const settings = {};
    for (const key in settingsConfig) {
        const legacy = settingsConfig[key].legacy;
        if (legacy in result) {
            let value = result[legacy];
            switch (settingsConfig[key].type) {
                case "boolean": value = JSON.parse(value); break;
                case "number": value = Number(value); break;
            }
            console.log(`Importing legacy setting: ${legacy}`, value);
            settings[settingsConfig[key].name] = value;
        }
    }
    if (!set(settings)) return console.error("Import legacy settings abort");
    set({"legacy_imported": true});
    console.info("Import legacy settings complete");
    // Send a message to the Swift layer to safely clean up legacy data
    browser.runtime.sendNativeMessage({name: "PAGE_LEGACY_IMPORTED"});
}