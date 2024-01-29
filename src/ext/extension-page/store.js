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
	const add = (stateModifier) => {
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
		// URL hash handle
		const params = new URLSearchParams(location.hash.slice(1));
		if (["settings"].includes(stateModifier)) {
			params.set("state", stateModifier);
			location.hash = params.toString();
		}
	};
	const remove = (stateModifier) => {
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
		// URL hash handle
		const params = new URLSearchParams(location.hash.slice(1));
		const state = params.get("state");
		if (state === stateModifier) {
			params.delete("state");
			location.hash = params.toString();
		}
	};
	const getOldState = () => oldState;
	// URL hash handle
	const loadUrlState = () => {
		const params = new URLSearchParams(location.hash.slice(1));
		const state = params.get("state");
		state && add(state);
	};
	return { subscribe, add, getOldState, remove, loadUrlState };
}
export const state = stateStore();

function settingsStore() {
	const { subscribe, update, set } = writable({});
	let platform;
	const init = async (initData) => {
		platform = initData.platform;
		if (import.meta.env.SAFARI_PLATFORM === "mac") {
			// import legacy settings data just one-time
			await settingsStorage.legacyImport();
		}
		// read settings from persistence storage
		const settings = await settingsStorage.get(undefined, { platform });
		if (import.meta.env.MODE === "development") {
			console.debug("store.js settingsStore init", initData, settings);
		}
		set({ ...initData, ...settings });
		// sync popup, backgound, etc... settings changes
		settingsStorage.onChangedSettings((sets, area) => {
			console.info(`store.js storage.${area}.onChanged`, sets);
			update((obj) => Object.assign(obj, sets));
		});
	};
	/** @param {string|string[]} keys */
	const reset = async (keys = undefined) => {
		await settingsStorage.reset(keys);
		const settings = await settingsStorage.get(undefined, { platform });
		if (import.meta.env.MODE === "development") {
			console.debug("store.js settingsStore reset", settings);
		}
		update((obj) => Object.assign(obj, settings));
		// legacy updates
		["global_active", "global_exclude_match"].forEach((s) => {
			updateSingleSettingOld(s, settings[s]);
		});
	};
	// temporarily keep the old storage method until it is confirmed that all dependencies are removed
	const updateSingleSettingOld = (key, value) => {
		// following settings logics is still handled in the native swift layer
		if (key === "global_exclude_match") {
			const message = { name: "PAGE_UPDATE_BLACKLIST", blacklist: value };
			sendNativeMessage(message).then((response) => {
				response.error && log.add(response.error, "error", true);
			});
		}
		if (key === "global_active") {
			sendNativeMessage({ name: "TOGGLE_EXTENSION", active: String(value) });
		}
	};
	/** @param {string} key @param {any} value */
	const updateSingleSetting = (key, value) => {
		update((settings) => ((settings[key] = value), settings));
		// save settings to persistence storage
		settingsStorage.set({ [key]: value });
		// legacy updates
		updateSingleSettingOld(key, value);
	};
	return { subscribe, set, init, reset, updateSingleSetting };
}
export const settings = settingsStore();

export const items = writable([]);
