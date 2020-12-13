import {writable} from "svelte/store";
import {uniqueId} from "./utils.js";

function logStore() {
    const {subscribe, set, update} = writable([]);
    const add = (message, type, notify) => {
        const item = {id: uniqueId(), message: message, time: Date.now(), type: type};
        if (type === "error") notify = true; // always notify on error
        if (notify) notifications.add(item);
        update(a => {
            a.push(item);
            return a;
        });
    };
    const remove = id => update(a => a.filter(b => b.id !== id));
    const reset = () => set([]);
    return {subscribe, add, remove, reset};
}
export const log = logStore();

function notificationStore() {
    const {subscribe, update} = writable([]);
    const add = item => {
        update(a => {
            a.push(item);
            return a;
        });
    };
    const remove = id => update(a => a.filter(b => b.id !== id));
    return {subscribe, add, remove};
}
export const notifications = notificationStore();

function settingsStore() {
    const {subscribe, update, set} = writable({});
    const updateSingleSetting = (key, value) => {
        update(settings => {
            settings[key] = value;
            safari.extension.dispatchMessage("REQ_UPDATE_SETTINGS", settings);
            return settings;
        });
    };
    return {subscribe, set, updateSingleSetting};
}
export const settings = settingsStore();

function stateStore() {
    const {subscribe, update} = writable(["init"]);
    // store oldState to see how state transitioned
    // ex. if (newState === foo && oldState === bar) baz();
    let oldState = [];
    const add = stateModifier => update(state => {
        // list of acceptable states, mostly for state definition tracking
        const states = [
            "init", // the uninitialized app state (start screen)
            "settings", // when the settings modal is shown
            "items-loading", // when the sidebar items are loading
            "saving", // when a file in the editor is being saved
            "fetching", // when a new remote file has been added and it being fetched
            "trashing", // when deleting the file in the editor
            "updating" // when the file in the editor is being updating
        ];
        // disallow adding undefined states
        if (!states.includes(stateModifier)) return console.error("invalid state");
        // save pre-changed state to oldState var
        oldState = [...state];
        // if current state modifier not present, add it to state array
        if (!state.includes(stateModifier)) {
            state.push(stateModifier);
        }
        // ready state only present when no other states present
        if (state.includes("ready")) {
            state.splice(state.indexOf("ready"), 1);
        }
        log.add(`App state updated to: ${state} from: ${oldState}`, "info");
        return state;
    });
    const getOldState = () => oldState;
    const remove = stateModifier => update(state => {
        // save pre-changed state to oldState var
        oldState = [...state];
        // if current state modifier present, remove it from state array
        if (state.includes(stateModifier)) {
            state.splice(state.indexOf(stateModifier), 1);
        }
        // if no other states, push ready state
        if (state.length === 0) {
            state.push("ready");
        }
        log.add(`App state updated to: ${state} from: ${oldState}`, "info");
        return state;
    });
    return {subscribe, add, getOldState, remove};
}
export const state = stateStore();

export const items = writable([]);
