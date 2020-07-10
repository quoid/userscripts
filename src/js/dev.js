"use strict";

const ___safari = {
    delay: 500,
    allScriptsData: function() {
        // iterate through all scripts in save location
        // ensure each has proper extension
        // validate script content
        // return *array* of individualized script data
        const arr = [];
        for (const file in ___files) {
            const ext = ___h.getFileExtension(file);
            if (ext === "js" || ext === "css") {
                const content = ___files[file]["content"];
                const parsed = ___parse.run(content);
                if (!___files[file] || !content || !parsed ) {
                    continue;
                }
                const metadata = parsed["metadata"];
                if (!metadata["name"]) {
                    continue;
                }
                const scriptData = {
                    disabled: ___manifest["disabled"].includes(file),
                    filename: file,
                    lastModifiedMS: ___files[file]["lastModifiedMS"],
                    name: metadata["name"][0],
                    type: ___h.getFileExtension(file)
                };
                if (metadata["description"]) {
                    scriptData["description"] = metadata["description"][0];
                }
                arr.push(scriptData);
            }
        }
        return arr;
    },
    dispatchMessageToScript: function(name, data) { // arg1 string, arg2 any
        const event = {
            name: name,
            message: data
        };
        setTimeout(function() {
            this.log("MessageReceived:", name, "green");
            ___a.handleMessage(event);
        }.bind(this), this.delay);
    },
    log: function(prefix, name, color) {
        const style = `color: ${color}; font-weight: bold`;
        console.log(`%c${prefix} %c${name}`, style, "font-style: normal");
    },
    saveToFiles: function(content, lastMod, newName, oldName) {
        delete ___files[oldName];
        ___files[newName] = {
            content: content,
            lastModified: lastMod
        };
    },
    singleScriptData: function(data) { // arg1 obj {id}
        // return single script data by id
        const filename = data["id"];
        const content = ___files[filename]["content"];
        const lastModified = ___files[filename]["lastModified"];
        const name = ___parse.run(content)["metadata"]["name"][0];
        const obj = {
            content: content,
            filename: filename,
            lastModified: lastModified,
            name: name,
            type: ___h.getFileExtension(filename)
        };
        return obj;
    },
    validateScript: function(scriptData) { // arg1 obj {content, id, type}
        const content = scriptData["content"];
        const oldFilename = scriptData["id"];
        const type = scriptData["type"];
        const parsed = ___parse.run(content);
        const fail = {error: "script validation failed"};
        // parser return null when metablock missing
        // saving requires name metafield
        if (!parsed || !parsed["metadata"]["name"]) {
            return fail;
        }
        const desc = parsed["metadata"]["description"];
        const lastModified = new Date();
        const name = parsed["metadata"]["name"][0];
        const newFilename = `${name}.${type}`;
        const success = {
            data: {
                content: content,
                description: desc,
                id: newFilename,
                lastModified: lastModified,
                name: name
            }
        };
        // if names are the same, can save overwrite file without issue
        if (newFilename === oldFilename) {
            this.saveToFiles(content, lastModified, newFilename, oldFilename);
            return success;
        }
        // not overwriting, check if filename for that type is taken
        if (Object.keys(___files).includes(newFilename)) {
            return fail;
        }
        // filename length too long
        if (newFilename.length > 255) {
            return fail;
        }
        this.saveToFiles(content, lastModified, newFilename, oldFilename);
        return success;
    },
    extension: {
        dispatchMessage: function(name, data) { // arg1 string, arg2 obj
            ___safari.log("MessageDispatched:", name, "darkorange");
            const resp = {requestOrigin: name};
            let m;
            switch(name) {
                case "REQ_ALL_SCRIPTS":
                    resp["data"] = ___safari.allScriptsData();
                    ___safari.dispatchMessageToScript("RESP_ALL_SCRIPTS", resp);
                    break;
                case "REQ_BLACKLIST_SAVE":
                    m = "RESP_BLACKLIST_SAVE";
                    resp["data"] = {"blacklist": data["blacklist"]};
                    ___safari.dispatchMessageToScript(m, resp);
                    break;
                case "REQ_DISABLE_SCRIPT":
                    resp["data"] = {"id": data["id"]};
                    m = "RESP_DISABLE_SCRIPT";
                    // resp["error"] = "can't disable script";
                    ___safari.dispatchMessageToScript(m, resp);
                    break;
                case "REQ_ENABLE_SCRIPT":
                    resp["data"] = {"id": data["id"]};
                    m = "RESP_ENABLE_SCRIPT";
                    ___safari.dispatchMessageToScript(m, resp);
                    break;
                case "REQ_INIT_DATA":
                    m = "RESP_INIT_DATA";
                    resp["data"] = ___settings;
                    setTimeout(function() {
                        ___safari.dispatchMessageToScript(m, resp);
                    }, this.delay);
                    break;
                case "REQ_SAVE_LOCATION_CHANGE":
                    alert("This will open the finder location when running app");
                    m = "RESP_SAVE_LOCATION_CHANGE";
                    ___safari.dispatchMessageToScript(m, resp);
                    break;
                case "REQ_SCRIPT_DELETE":
                    m = "RESP_SCRIPT_DELETE";
                    delete ___files[data["id"]];
                    resp["data"] = data;
                    // resp["error"] = "can't delete file";
                    ___safari.dispatchMessageToScript(m, resp);
                    break;
                case "REQ_SCRIPT_SAVE":
                    const responseObject = ___safari.validateScript(data);
                    const key = Object.keys(responseObject)[0];
                    resp[key] = responseObject[key];
                    //resp["error"] = "can't save file";
                    ___safari.dispatchMessageToScript("RESP_SCRIPT_SAVE", resp);
                    break;
                case "REQ_SETTING_CHANGE":
                    ___settings[data["id"]] = data["value"];
                    resp["data"] = data;
                    // resp["error"] = "can't change setting";
                    m = "RESP_SETTING_CHANGE";
                    ___safari.dispatchMessageToScript(m, resp);
                    break;
                case "REQ_SINGLE_SCRIPT":
                    resp["data"] = ___safari.singleScriptData(data);
                    //resp["error"] = "can't find script";
                    m = "RESP_SINGLE_SCRIPT";
                    ___safari.dispatchMessageToScript(m, resp);
                    break;
                default:
                    console.error(`No response match for ${name}`);
            }
        }
    }
};

var safari = ___safari;

const ___settings = {
    autoShowHints: "true",
    blacklist: [],
    hideDescriptions: "false",
    languageCode: "en-GB",
    lint: "false",
    saveLocation: "/Users/UserName/Library/Folder/SubFolder/",
    showInvisibles: "true",
    tabSize: "4",
    verbose: "true",
    version: "2.0.0"
};

const ___parse = {
    run: function(str) {
        const blocksReg = /\B(?:(\/\/ ==UserScript==\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)|(\/\* ==UserStyle==\r?\n([\S\s]*?)\r?\n==\/UserStyle== \*\/)([\S\s]*))/;
        const blocks = str.match(blocksReg);

        if (!blocks) {
            return null;
        }

        var metablock = (blocks[1] != null) ? blocks[1] : blocks[4];
        var metas = (blocks[2] != null) ? blocks[2] : blocks[5];
        var code = (blocks[3] != null) ? blocks[3].trim() : blocks[6].trim();

        var metadata = {};
        var metaArray = metas.split('\n');

        metaArray.forEach(function(m) {
            //  -> // @([\w-]+)[ \t]+([^\s]+[^\r\n\t\v\f]*)
            var parts = m.match(/@([\w-]+)\s+(.+)/);
            if (parts) {
                metadata[parts[1]] = metadata[parts[1]] || [];
                metadata[parts[1]].push(parts[2]);
            }
        });
        // fail if @name is missing
        if (!metadata["name"]) {
            return;
        }
        return {
            code: code,
            content: str,
            metablock: metablock,
            metadata: metadata
        }
    }
};

const ___exampleUserscriptContent = `// ==UserScript==
// @name        Example Userscript
// @description This an example userscript. It shows all the supported metablocks keys and values at this time. Since you are viewing this in the demo or development server, it will not be injected into any websites.
// @match       https://github.com/quoid/userscripts
// @exclude-match: https://www.website.com
// ==/UserScript==

console.log("I am an example userscript");
`;

const ___exampleUserscriptContent2 = `// ==UserScript==
// @name        Style Example
// @description This is an example of an injectable style code snippet. It uses the ==UserScript== format.
// @match       *://*.github.com
// ==/UserScript==

#id,
.class,
.pseudo-element::after {
    background-color: tomato;
}
`;

const ___exampleUserscriptContent3 = `/* ==UserStyle==
@name        Style Example 02
@description This is another style code example, however this example users a UserStyle metablock.
@match       https://userstyles.org/*
==/UserStyle== */

#id,
.class,
.pseudo-element::after {
    background-color: tomato;
}

`;

const ___files = {
    "foo.js": {
        "content": ___exampleUserscriptContent,
        "lastModified": "29 Dec 2019, 09:08",
        "lastModifiedMS": new Date("December 29, 2019 09:08:00").getTime()
    },
    "Style Example.css": {
        "content": ___exampleUserscriptContent2,
        "lastModified": "29 Dec 2019, 11:08",
        "lastModifiedMS": new Date("December 29, 2019 11:08:00").getTime()
    },
    "Style Example 02.css": {
        "content": ___exampleUserscriptContent3,
        "lastModified": "29 Dec 2019, 12:08",
        "lastModifiedMS": new Date("December 29, 2019 12:08:00").getTime()
    },
    "no_file_ext": {},
    "unsupported_file_extension.txt": {},
};

const ___manifest = {
    "blacklist": [],
    "disabled": [],
    "excludes": {},
    "includes": {
        "*://*/*": {
            "document-start": [
                "Example Userscript.js"
            ],
            "document-end": []
        }
    }
};
