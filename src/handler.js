import {
    items,
    log,
    settings,
    state
} from "./store.js";
import {cmSetSavedCode} from "./Components/Editor/CodeMirror.svelte";

// safari.self only accessible from safari extension html page
let ext = safari.self ? true : false;

export function setupMessageHandler() {
    if (!ext) {
        // if not a Safari extension html page
        window.addEventListener("customEvent", e => handleMessage(e));
        if (!_safari) {
            // in Safari versions < 13, safari object will be undefined
            // with those browsers, above expression will be evaluated false (here)
            // in production builds the _safari object is not included
            // test for the condition of being in production but safari && _safari being undefined
            // which will likely mean an outdated browser
            alert("Failed to initialize, ensure Safari is version 13 or higher!");
        }
    } else {
        safari.self.addEventListener("message", e => handleMessage(e));
    }
}

function handleMessage(e) {
    // environment checks
    const name = !ext ? e.detail.name : e.name;
    const data = !ext ? e.detail.data : e.message.data;
    const error = !ext ? e.detail.error : e.message.error;

    // if error is present, log to browser console for all messages
    // unique error handling contained in switch statement
    if (error) {
        log.add(error, "error", true);
    }

    switch (name) {
        case "RESP_INIT_DATA": {
            // update state if unable to get init data
            if (error) return state.add("init-error");
            // all settings are saved as string on the swift side
            // convert booleans to actual types when received
            for (const [key, value] of Object.entries(data)) {
                if (value === "true" || value === "false") {
                    data[key] = JSON.parse(value);
                }
            }
            settings.set(data);
            state.add("items-loading");
            state.remove("init");
            safari.extension.dispatchMessage("REQ_ALL_FILES_DATA");
            break;
        }
        case "RESP_ALL_FILES_DATA": {
            if (error) return;
            items.set(data);
            state.remove("items-loading");
            break;
        }
        case "RESP_FILE_SAVE": {
            if (!error) {
                // overwrite item in items store
                items.update(i => {
                    const index = i.findIndex(a => a.active);
                    const disabled = i[index].disabled != undefined ? i[index].disabled : false;
                    const type = i[index].type;
                    const visible = i[index].visible != undefined ? i[index].visible : true;
                    i[index] = data;
                    i[index].active = true;
                    i[index].disabled = disabled;
                    i[index].type = type;
                    i[index].visible = visible;
                    return i;
                });
                // set the newly saved file contents in codemirror instance
                cmSetSavedCode(data.content);
            }
            state.remove("saving");
            break;
        }
        case "RESP_FILE_TRASH": {
            if (!error) {
                // when the request is sent for this message, selecting a new item is disabled
                // when this response comes in, the active item's the one that was requested trashed
                // removing the active item completed the trash request
                items.update(i => i.filter(a => !a.active));
            }
            state.remove("trashing");
            break;
        }
        case "RESP_TOGGLE_FILE": {
            if (!error) {
                items.update(allItems => {
                    // get the item that has been toggled
                    const i = allItems.find(i => i.filename === data.filename);
                    i.disabled = !i.disabled;
                    return allItems;
                });
            }
            // always re-enable checkbox
            document.querySelector(`[data-filename="${data.filename}"] input`).disabled = false;
            break;
        }
        case "RESP_OPEN_SAVE_LOCATION":
        case "RESP_UPDATE_SETTINGS":
        case "RESP_UPDATE_BLACKLIST": {
            // in the event of a failure from one of the above, log error if needed and nothing else
            break;
        }
        default: {
            console.error(`message from swift has no handler - ${name}`);
        }
    }
}
