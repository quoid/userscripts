import {parse} from "./utils";
// this file's purpose to emulate the Safari App Extensions messaging & file system
// will not be included in production builds, but necessary for testing in dev

//emulate some communication delay, even though unlikely to occur
const delay = 500;

const defaultSettings = {
    autoHint: "true",
    blacklist: ["domain123", "domainXYZ"],
    descriptions: "true",
    lint: "false",
    log: "true",
    saveLocation: "/Users/UserName/Library/Containers/ParentFolder/SubFolder/",
    showInvisibles: "true",
    sortOrder: "lastModifiedDesc",
    tabSize: "4",
    version: "3.0.0"
};

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

// constructed to emulate the extension page's safari object
// this way the methods used in development and production can stay the same
window._safari = {
    extension: {
        dispatchMessage(name, data) {
            // emulates sending a message from js front end to swift side
            // data argument should be an object with unique keys and values

            // when method is called, immediately dispatch to _swift object
            // this method might seem redundant or unnecessary, but...
            // it is needed so dev/prod code can be the same
            _swift.messageReceived(name, data);
        }
    }
};

// reassign global safari object
window.safari = _safari;

const _swift = {
    // emulates sending the a message from swift side to js front end
    dispatchMessageToScript(name, data, error) {
        // construct the response object to be sent
        const response = {
            name: name,
            data: data,
            error: error
        };
        // send message with preset delay
        setTimeout(() => {
            const event = new CustomEvent("customEvent", {detail: response});
            window.dispatchEvent(event);
        }, delay);
    },
    getAllFilesData() {
        let f = [];
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
                name: metadata.name[0],
                type: file.filename.substring(file.filename.lastIndexOf(".") + 1)
            };
            f.push(scriptData);
        });
        return f;
    },
    save(data) {
        const newContent = data.new;
        const oldFilename = data.current.filename;
        const parsed = parse(newContent);
        const lastModified = Date.now();
        let canUpdate = false;

        // script failed to parse or missing required metadata (name)
        if (!parsed || !parsed.metadata.name) {
            return {error: "save failed, file has invalid metadata"};
        }

        const name = parsed.metadata.name[0];
        const newFilename = `${name}.${data.current.type}`;

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
            disabled: data.current.disabled,
            filename: newFilename,
            lastModified: lastModified,
            name: name,
            oldFilename: oldFilename,
            type: data.current.type,
            visible: data.current.visible
        };

        // add description if in file metadata
        if (parsed.metadata.description) {
            success.description = parsed.metadata.description[0];
        }

        // overwriting
        if (newFilename.toLowerCase() === oldFilename.toLowerCase()) {
            _swift.saveJS(newContent, lastModified, newFilename, oldFilename);
            return success;
        }

        // not overwriting, check if filename for that type is taken
        if (files.find(a => a.filename.toLowerCase() === newFilename.toLowerCase())) {
            return {error: "save failed, name already taken!"};
        }

        // not overwriting but all validation passed
        _swift.saveJS(newContent, lastModified, newFilename, oldFilename);
        return success;

    },
    saveJS(content, lastMod, newFilename, oldName) {
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
    },
    messageReceived(name, data) {
        // emulates receiving a message from the js front end
        let responseName, responseData, responseError = null;
        switch (name) {
            case "REQ_INIT_DATA": {
                responseName = "RESP_INIT_DATA";
                responseData = defaultSettings;
                // responseError = "failed to retrieve init data, manifest was unreachable";
                break;
            }
            case "REQ_ALL_FILES_DATA": {
                responseName = "RESP_ALL_FILES_DATA";
                responseData = _swift.getAllFilesData();
                // responseError = "failed to load files, could not access save location";
                break;
            }
            case "REQ_UPDATE_SETTINGS": {
                responseName = "RESP_UPDATE_SETTINGS";
                // responseError = "failed to update settings";
                break;
            }
            case "REQ_UPDATE_BLACKLIST": {
                responseName = "RESP_UPDATE_BLACKLIST";
                responseData = data;
                // responseError = "blacklist update failed, manifest unreachable";
                break;
            }
            case "REQ_TOGGLE_FILE": {
                responseName = "RESP_TOGGLE_FILE";
                responseData = data;
                // responseError = "disable script failed, manifest unreachable";
                break;
            }
            case "REQ_FILE_SAVE": {
                const saved = _swift.save(data);
                if (saved.error) {
                    //responseData = data;
                    responseError = saved.error;
                } else {
                    responseData = saved;
                }
                // responseError = "err";
                responseName = "RESP_FILE_SAVE";
                break;
            }
            case "REQ_FILE_TRASH": {
                const ind = files.findIndex(f => f.filename === data.filename);
                files.splice(ind, 1);
                // responseError = "failed to delete";
                responseName = "RESP_FILE_TRASH";
                break;
            }
            case "REQ_OPEN_SAVE_LOCATION": {
                alert("When not in development mode, clicking this link open's the save location in Finder");
                break;
            }
            case "REQ_CHANGE_SAVE_LOCATION": {
                alert("When not in development mode, clicking this icon will attempt to close all open instances of the extension's HTML page and open the containing app for the extension");
                break;
            }
            default: {
                // no matching response handler, log browser console error
                responseName = "RESP_ERROR_LOG";
                responseError = `message from js has no handler - ${name}`;
            }
        }
        _swift.dispatchMessageToScript(responseName, responseData, responseError);
    }
};
