import {parse} from "./utils";


async function getRemoteFileContents(url) {
    let r = {};
    await fetch(url).then(response => {
        if (!response.ok) throw Error(response.statusText);
        return response.text();
    }).then(text => {
        r.contents = text;
    }).catch(error => {
        console.log(error);
        r.error = "Remote url bad response!";
    });
    return r;
}

// example file contents
const exampleCSSContent = `/* ==UserStyle==
@name        Example CSS UserStyle
@description This is an example of a UserStyle. It applies css to webpages rather than js.
@match       https://userstyles.org/*
==/UserStyle== */
#id,
.class,
.pseudo-element::after {
    background-color: tomato;
}
`;

const exampleJSContent = `// ==UserScript==
// @name        Example JS Userscript
// @description This a standard userscript with javascript code
// @match       https://github.com/quoid/userscripts
// @exclude-match: *://*.*
// @version 1.0
// @updateURL https://www.k21p.com/example.user.js
// @noframes
// ==/UserScript==
console.log("I am an example userscript");
`;

// dummy file directory
let files = [
    {
        content: exampleCSSContent,
        filename: "Example CSS UserStyle.css",
        lastModified: 1606009623000
    },
    {
        content: exampleJSContent,
        filename: "Example JS Userscript.js",
        lastModified: 1605862023000
    },
];

function saveFile(content, lastMod, newFilename, oldName) {
    const ind = files.findIndex(f => f.filename === oldName);
    const s = {
        content: content,
        filename: newFilename,
        lastModified: lastMod
    };
    if (ind != -1) {
        // overwrite at index
        files[ind] = s;
    } else {
        // add to beginning of array
        files.unshift(s);
    }
}

const _browser = {
    runtime: {
        async sendNativeMessage(message, responseCallback) {
            console.log(`Got message: ${message.name}`);
            let response = {};
            const name = message.name;
            if (name === "PAGE_INIT_DATA") {
                response = {
                    active: "true",
                    autoCloseBrackets: "true",
                    autoHint: "true",
                    blacklist: [],
                    descriptions: "true",
                    languageCode: "en",
                    lint: "false",
                    log: "false",
                    saveLocation: "/Users/someone/Library/Directory",
                    showCount: "true",
                    showInvisibles: "true",
                    sortOrder: "lastModifiedDesc",
                    tabSize: "4",
                    version: "4.0.0"
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
                        description: metadata.description[0],
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
                // response = {success: true};
                response = {error: true};
            } else if (name === "PAGE_UPDATE_SETTINGS") {
                response = {success: true};
            } else if (name === "PAGE_UPDATE_BLACKLIST") {
                response = {success: true};
            } else if (name === "PAGE_NEW_REMOTE") {
                let r = await getRemoteFileContents(message.url);
                response = r;
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

                let success = {
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
            }
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), 500));
            }
            setTimeout(() => {
                responseCallback(response);
            }, 500);
        }
    },
    tabs: {
        query(message, responseCallback) {
            const response = [
                {id: 1, url: "https://www.filmgarb.com/"},
                {id: 2, url: "https://www.k21p.com/"}
            ];
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), 500));
            }
            setTimeout(() => {
                responseCallback(response);
            }, 500);
        }
    }
};

window.browser = _browser;
