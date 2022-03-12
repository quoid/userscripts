import {parse, uniqueId, wait} from "../page/utils";

/**
 *
 * @param {("css"|"js")} type
 * @param {boolean?} updates
 * @param {boolean?} longName
 * @returns
 */
function generateFile(type, updates = false, longName = false) {
    const uid = uniqueId();
    let name = `${uid}-example-${type}`;
    if (longName) name = `${uid}${uid}${uid}-example-${type}`;
    const randomDate = +(new Date() - Math.floor(Math.random()*10000000000));
    let content = "// ==UserScript=="
    +`\n// @name         ${name}`
    +`\n// @description  Custom description for userscript with name "${name}"`
    +"\n// @match        *://*.*"
    +"\n// @exclude-match https://github.com/quoid/userscripts"
    +"\n// @version       1.0"
    +"\n// @noframes"
    +"\n// ==/UserScript=="
    +`\n\nconsole.log("I am ${name}");`;
    if (type === "css") {
        content = content.replace("// ==UserScript==", "/* ==UserStyle==");
        content = content.replace("// ==/UserScript==", "==/UserStyle== */");
        content = content.replaceAll("// @", "@");
        content = content.replace(
            `console.log("I am ${name}");`,
            "#id,\n.class\n.pseudo-element::after {\n    color: red\n}"
        );
        updates = false;
    }
    if (updates) {
        content = content.replace(
            "1.0",
            "1.0\n// @updateURL     https://www.k21p.com/example.user.js"
        );
        content = content.replace(
            `console.log("I am ${name}");`,
            `console.log("I am ${name} and you can update me!");`
        );
    }
    return {
        content: content,
        filename: `${name}.${type}`,
        lastModified: randomDate
    };
}

const files = [
    generateFile("js", true, true),
    generateFile("css"),
    ...Array.from({length: 5}, (_, i) => generateFile("js"))
];

const _browser = {
    delay: 200,
    platform: "ios",
    runtime: {
        getURL() {
            return "https://www.example.com/";
        },
        async sendNativeMessage(message, responseCallback) {
            const name = message.name;
            console.info(`Got message: ${name}`);
            let response = {};
            if (name === "PAGE_INIT_DATA") {
                response = {
                    active: "true",
                    autoCloseBrackets: "true",
                    autoHint: "true",
                    blacklist: [],
                    descriptions: "true",
                    languageCode: "en",
                    lint: "true",
                    log: "false",
                    saveLocation: "/Users/someone/Library/Directory",
                    showCount: "true",
                    showInvisibles: "true",
                    sortOrder: "lastModifiedDesc",
                    tabSize: "4",
                    version: "4.0.0",
                    build: "44"
                };
            } else if (name === "PAGE_ALL_FILES") {
                response = [];
                files.forEach(file => {
                    const content = file.content;
                    const parsed = parse(content);
                    const metadata = parsed.metadata;
                    const canUpdate = (metadata.version && metadata.updateURL) ? true : false;
                    const scriptData = {
                        canUpdate: canUpdate,
                        content: content,
                        description: metadata.description ? metadata.description[0] : "",
                        disabled: false,
                        filename: file.filename,
                        lastModified: file.lastModified,
                        metadata: metadata,
                        name: metadata.name[0],
                        type: file.filename.substring(file.filename.lastIndexOf(".") + 1)
                    };
                    response.push(scriptData);
                });
            } else if (name === "TOGGLE_ITEM") {
                response = {success: true};
                //response = {error: true};
            } else if (name === "PAGE_UPDATE_SETTINGS") {
                response = {success: true};
            } else if (name === "PAGE_UPDATE_BLACKLIST") {
                response = {success: true};
            } else if (name === "PAGE_NEW_REMOTE") {
                const result = await getRemoteFileContents(message.url);
                response = result;
            } else if (name === "PAGE_SAVE") {
                console.log(message);
                const newContent = message.content;
                const oldFilename = message.item.filename;
                const parsed = parse(newContent);
                const lastModified = Date.now();
                let canUpdate = false;
                // script failed to parse
                if (!parsed) {
                    return {error: "save failed, file has invalid metadata"};
                }
                const name = parsed.metadata.name[0];
                const newFilename = `${name}.${message.item.type}`;
                // filename length too long
                if (newFilename.length > 255) {
                    return {error: "save failed, filename too long!"};
                }

                // check if file can be remotely updated
                if (parsed.metadata.version && parsed.metadata.updateURL) {
                    canUpdate = true;
                }

                const success = {
                    canUpdate: canUpdate,
                    content: newContent,
                    filename: newFilename,
                    lastModified: lastModified,
                    name: name,
                };

                // add description if in file metadata
                if (parsed.metadata.description) {
                    success.description = parsed.metadata.description[0];
                }

                // overwriting
                if (newFilename.toLowerCase() === oldFilename.toLowerCase()) {
                    saveFile(newContent, lastModified, newFilename, oldFilename);
                    return success;
                }

                // not overwriting, check if filename for that type is taken
                if (files.find(a => a.filename.toLowerCase() === newFilename.toLowerCase())) {
                    return {error: "save failed, name already taken!"};
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
            } else if (name === "POPUP_TOGGLE_EXTENSION") {
                //response = {error: "Failed toggle extension"};
                response = {success: true};
            } else if (name === "POPUP_UPDATE_ALL" || name === "POPUP_UPDATE_SINGLE") {
                // response = {error: "Failed refresh scripts"};
                response = {
                    items: [
                        {
                            name: "Google Images Restored",
                            filename: "Google Images Restored.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            name: "Wikipedia Mobile Redirect",
                            filename: "Wikipedia Mobile Redirect.js",
                            disabled: true,
                            type: "js"
                        },
                        {
                            name: "A Special Userscript",
                            filename: "A Special Userscript.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            name: "CSS Adblock",
                            filename: "CSS Adblock.css",
                            disabled: false,
                            type: "css"
                        },
                        {
                            name: "New Userscript With a Really Really Long Name",
                            filename: "New Userscript With a Really Really Long Name.css",
                            disabled: true,
                            type: "css"
                        },
                        {
                            name: "Subframe Script Managerial Staffing Company",
                            filename: "Subframe Script.js",
                            disabled: false,
                            subframe: true,
                            type: "css"
                        }
                    ],
                    updates: []
                };
            } else if (name === "POPUP_CHECK_UPDATES") {
                response = {
                    updates: [
                        {
                            filename: "Google Images Restored.js",
                            name: "Google Images Restored",
                            url: "https://www.k21p.com"
                        },
                        {
                            filename: "New Userscript With a Really Really Long Name.js",
                            name: "New Userscript With a Really Really Long Name",
                            url: "https://www.filmgarb.com"
                        }
                    ]
                };
            } else if (name === "POPUP_INIT") {
                response.initData = {
                    active: "true",
                    items: [
                        {
                            name: "Google Images Restored",
                            filename: "Google Images Restored.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            name: "Subframe Script Managerial Staffing Company",
                            filename: "Subframe Script.js",
                            disabled: false,
                            subframe: true,
                            type: "css"
                        }
                    ],
                    updates: [
                        {
                            filename: "Google Images Restored.js",
                            name: "Google Images Restored",
                            url: "https://www.k21p.com"
                        },
                        {
                            filename: "New Userscript With a Really Really Long Name.js",
                            name: "New Userscript With a Really Really Long Name",
                            url: "https://www.filmgarb.com"
                        }
                    ]
                };
            } else if (name === "POPUP_MATCHES") {
                response = {
                    matches: [
                        {
                            name: "Google Images Restored",
                            filename: "Google Images Restored.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            name: "Subframe Script Managerial Staffing Company",
                            filename: "Subframe Script.js",
                            disabled: false,
                            subframe: true,
                            type: "css"
                        }
                    ]
                };
            } else if (name === "POPUP_UPDATES") {
                response = {
                    updates: [
                        {
                            filename: "Google Images Restored.js",
                            name: "Google Images Restored",
                            url: "https://www.k21p.com"
                        },
                        {
                            filename: "New Userscript With a Really Really Long Name.js",
                            name: "New Userscript With a Really Really Long Name",
                            url: "https://www.filmgarb.com"
                        }
                    ]
                };
                response.updates = [];
            } else if (name === "REQ_PLATFORM") {
                response = {platform: _browser.platform};
            } else if (name === "POPUP_OPEN_EXTENSION_PAGE") {
                response = {error: "Failed to get page url"};
                window.open("https://github.com/quoid/userscripts");
            } else if (name === "OPEN_SAVE_LOCATION") {
                if (_browser.platform === "macos") {
                    response = {success: true};
                } else {
                    response = {
                        items: [
                            {
                                name: "Google Images Restored",
                                filename: "Google Images Restored.js",
                                disabled: false,
                                type: "js",
                                metadata: []
                            },
                            {
                                name: "Subframe Script Managerial Staffing Company",
                                filename: "Subframe Script.js",
                                disabled: false,
                                type: "css",
                                metadata: []
                            },
                            {
                                name: "Another Script from Managerial Staffing Company",
                                filename: "Cool Script.js",
                                disabled: false,
                                type: "js",
                                metadata: []
                            }
                        ]
                    };
                }
            }
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), _browser.delay));
            }
            setTimeout(() => responseCallback(response), _browser.delay);
        }
    },
    tabs: {
        query(message, responseCallback) {
            const response = [{url: "https://www.filmgarb.com/foo.user.js", id: 101}];
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), _browser.delay));
            }
            setTimeout(() => responseCallback(response), _browser.delay);
        },
        sendMessage(tabId, message, responseCallback) {
            console.log(`Tab ${tabId} got message: ${message.name}`);
            let response = {};
            if (message.name === "USERSCRIPT_INSTALL_00") {
                response = {success: "Click to install"};
                //response.error = "something went wrong";
            } else if (message.name === "USERSCRIPT_INSTALL_01") {
                response = {
                    description: "This userscript re-implements the \"View Image\" and \"Search by image\" buttons into google images.",
                    grant: ["GM.getValue", "GM.setValue", "GM.xmlHttpRequest"],
                    match: ["https://www.example.com/*", "https://www.example.com/somethingReallylong/goesRightHere"],
                    name: "Test Install Userscript",
                    require: ["https://code.jquery.com/jquery-3.5.1.min.js", "https://code.jquery.com/jquery-1.7.1.min.js"],
                    source: "https://greasyforx.org/scripts/00000-something-something-long-name/code/Something%20something%20long20name.user.js"
                };
                response = {error: "a userscript with this @name value already exists, @name needs to be unique"};
            }
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), _browser.delay));
            }
            setTimeout(() => responseCallback(response), _browser.delay);
        }
    },
    webNavigation: {
        getAllFrames(message, responseCallback) {
            const response = [];
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), _browser.delay));
            }
            setTimeout(() => responseCallback(response), _browser.delay);
        }
    },
    storage: {
        local: {
            get(items, responseCallback) {
                const response = {};
                if (!responseCallback) {
                    return new Promise(resolve => setTimeout(() => resolve(response), _browser.delay));
                }
                setTimeout(() => responseCallback(response), _browser.delay);
            },
            set() {
                return new Promise(resolve => setTimeout(() => resolve(), _browser.delay));
            }
        }
    }
};

async function getRemoteFileContents(url) {
    const result = {};
    await fetch(url).then(response => {
        if (!response.ok) throw Error(response.statusText);
        return response.text();
    }).then(text => {
        result.content = text;
    }).catch(error => {
        console.log(error);
        result.error = "Remote url bad response!";
    });
    return result;
}

function saveFile(content, lastMod, newFilename, oldName) {
    const ind = files.findIndex(f => f.filename === oldName);
    const s = {
        content: content,
        filename: newFilename,
        lastModified: lastMod
    };
    if (ind !== -1) {
        // overwrite at index
        files[ind] = s;
    } else {
        // add to beginning of array
        files.unshift(s);
    }
}

window.browser = _browser;
