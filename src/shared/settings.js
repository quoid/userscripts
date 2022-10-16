export const settingTemplate = {
    name: "setting_template",
    type: "boolean",
    default: true,
    writable: true,
    platforms: ["macos", "ipados", "ios"],
    langLabel: {
        en: "Engilsh label",
        zh_hans: "简体中文标签",
        zh_hant: "繁體中文標籤"
    },
    langTitle: {
        en: "Engilsh title",
        zh_hans: "简体中文标题",
        zh_hant: "繁體中文標題"
    },
    group: "Template",
    legacy: "setting_legacy_name",
    nodeType: "Toggle",
    nodeClass: {red: false}
};

const settingDefault = {
    name: "setting_default",
    type: undefined,
    default: undefined,
    writable: true,
    platforms: ["macos", "ipados", "ios"],
    langLabel: {},
    langTitle: {},
    group: "",
    nodeType: "",
    nodeClass: {}
};

const settingsDefine = [
    {
        name: "legacy_imported",
        type: "boolean",
        default: false,
        platforms: ["macos"],
        group: "Internal"
    },
    {
        name: "global_active",
        type: "boolean",
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
        nodeType: "Toggle_double_confirm",
        nodeClass: {warn: true}
    },
    {
        name: "location_path",
        type: "string",
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

export const settingsConfig = settingsDefine.reduce((arr, val) => {
    val.key = storagePrefix + val.name.toUpperCase();
    // arr[val.key] = Object.assign({}, settingDefault, val);
    arr[val.key] = new Proxy(val, {
        get: (obj, p) => p in obj ? obj[p] : settingDefault[p]
    });
    return arr;
}, {});

const settingsKeys = Object.keys(settingsConfig);

export async function get(key) {
    if (typeof key !== "string") return console.error("key should be a string:", key);
    key = storagePrefix + key.toUpperCase();
    if (!settingsKeys.includes(key)) {
        return console.error("unexpected settings key:", key);
    }
    const result = await browser.storage.local.get(key);
    return result[key] ?? settingsConfig[key].default;
}

export async function getAll() {
    const result = await browser.storage.local.get(settingsKeys);
    const settingsDefault = {};
    for (const key in settingsConfig) {
        settingsDefault[key] = settingsConfig[key].default;
    }
    return Object.assign({}, settingsDefault, result);
}

export function update(key, value) {
    key = storagePrefix + key.toUpperCase();
    if (!settingsKeys.includes(key)) {
        return console.error("Unexpected key:", key);
    }
    const type = settingsConfig[key].type;
    if (typeof(value) !== type) {
        return console.error(`Unexpected value type ${typeof(value)} should ${type}`);
    }
    browser.storage.local.set({[key]: value});
    return true;
}

// Note: It seems unnecessary to use this method, comment it out for now
// export function updateAll(settings) {
//     for (const key in settings) {
//         if (!settingsKeys.includes(key)) {
//             return console.error("unexpected settings key:", key);
//         }
//         const type = settingsConfig[key].type;
//         if (typeof(settings.key) !== type) {
//             return console.error(`Unexpected value type ${typeof(value)} should ${type}`);
//         }
//     }
//     browser.storage.local.set(settings);
// }

export async function import_legacy_data() {
    console.info("Import settings data from legacy manifest file");
    if (await get("legacy_imported")) return console.info("Legacy settings has already imported");
    const result = await browser.runtime.sendNativeMessage({name: "PAGE_INIT_DATA"});
    if (result.error) return console.error(result.error);
    for (const key in settingsConfig) {
        const legacy = settingsConfig[key].legacy;
        if (legacy in result) {
            let value = result[legacy];
            console.log(`Importing legacy setting: ${legacy} - ${value}`);
            switch (settingsConfig[key].type) {
                case "boolean": value = JSON.parse(value); break;
                case "number": value = Number(value); break;
            }
            if (!update(settingsConfig[key].name, value)) return console.error("Import abort");
        }
    }
    update("legacy_imported", true);
    console.log("Importing legacy settings complete");
    // Send a message to the Swift layer to safely clean up legacy data
}