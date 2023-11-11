import { writable } from "svelte/store";
import { uniqueId } from "../shared/utils.js";
import * as settingsStorage from "../shared/settings.js";
import { sendNativeMessage } from "../shared/native.js";

function notificationStore() {
	const { subscribe, update } = writable([]);
	const add = (item) => {
		update((a) => {
			a.push(item);
			return a;
		});
	};
	const remove = (id) => update((a) => a.filter((b) => b.id !== id));
	return { subscribe, add, remove };
}
export const notifications = notificationStore();

function logStore() {
	const { subscribe, set, update } = writable([]);
	const add = (message, type, notify) => {
		const item = { id: uniqueId(), message, time: Date.now(), type };
		if (notify || type === "error") notifications.add(item); // always notify on error
		update((a) => {
			a.push(item);
			return a;
		});
	};
	const remove = (id) => update((a) => a.filter((b) => b.id !== id));
	const reset = () => set([]);
	return { subscribe, add, remove, reset };
}
export const log = logStore();

function stateStore() {
	const { subscribe, update } = writable(["init"]);
	// store oldState to see how state transitioned
	// ex. if (newState === foo && oldState === bar) baz();
	let oldState = [];
	const add = (stateModifier) =>
		update((state) => {
			// list of acceptable states, mostly for state definition tracking
			const states = [
				"init", // the uninitialized app state (start screen)
				"init-error", // unique error when initialization fails, shows error on load screen
				"settings", // when the settings modal is shown
				"items-loading", // when the sidebar items are loading
				"saving", // when a file in the editor is being saved
				"fetching", // when a new remote file has been added and it being fetched
				"trashing", // when deleting the file in the editor
				"updating", // when the file in the editor is being updating
			];
			// disallow adding undefined states
			if (!states.includes(stateModifier)) {
				console.error("invalid state");
				return state;
			}
			// save pre-changed state to oldState var
			oldState = [...state];
			// if current state modifier not present, add it to state array
			if (!state.includes(stateModifier)) state.push(stateModifier);
			// ready state only when no other states present, remove it if present
			if (state.includes("ready")) state.splice(state.indexOf("ready"), 1);
			log.add(
				`App state updated to: ${state} from: ${oldState}`,
				"info",
				false,
			);
			return state;
		});
	const remove = (stateModifier) =>
		update((state) => {
			// save pre-changed state to oldState var
			oldState = [...state];
			// if current state modifier present, remove it from state array
			if (state.includes(stateModifier))
				state.splice(state.indexOf(stateModifier), 1);
			// if no other states, push ready state
			if (state.length === 0) state.push("ready");
			log.add(
				`App state updated to: ${state} from: ${oldState}`,
				"info",
				false,
			);
			return state;
		});
	const getOldState = () => oldState;
	return { subscribe, add, getOldState, remove };
}
export const state = stateStore();

function settingsStore() {
	const { subscribe, update, set } = writable({});
	const init = async (initData) => {
		// import legacy settings data just one-time
		await settingsStorage.legacyImport();
		// for compatibility with legacy getting names only
		// once all new name is used, use settingsStorage.get()
		const settings = await settingsStorage.legacyGet();
		console.info("store.js settingsStore init", initData, settings);
		set({ ...initData, ...settings });
		// sync popup, backgound, etc... settings changes
		settingsStorage.onChangedSettings((sets, area) => {
			console.info(`store.js storage.${area}.onChanged`, sets);
			update((obj) => Object.assign(obj, sets));
		});
	};
	const reset = async (keys) => {
		await settingsStorage.reset(keys);
		// once all new name is used, use settingsStorage.get()
		const settings = await settingsStorage.legacyGet();
		console.info("store.js settingsStore reset", settings);
		update((obj) => Object.assign(obj, settings));
	};

	const updateSingleSettingOld = (key, value) => {
		// blacklist not stored in normal setting object in manifest, so handle differently
		if (key === "blacklist") {
			// update blacklist on swift side
			const message = { name: "PAGE_UPDATE_BLACKLIST", blacklist: value };
			sendNativeMessage(message).then((response) => {
				response.error && log.add(response.error, "error", true);
			});
		}
		if (key === "active") {
			sendNativeMessage({ name: "TOGGLE_EXTENSION", active: String(value) });
		}
	};
	const updateSingleSetting = (key, value) => {
		// update(settings => (settings[key] = value, settings));
		update((settings) => {
			settings[key] = value;
			return settings;
		});
		// for compatibility with legacy setting names only
		// once all new name is used, use settingsStorage.set()
		settingsStorage.legacySet({ [key]: value }); // Durable Storage
		// temporarily keep the old storage method until it is confirmed that all dependencies are removed
		updateSingleSettingOld(key, value);
	};
	return { subscribe, set, init, reset, updateSingleSetting };
}
export const settings = settingsStore();

export const items = writable([]);
