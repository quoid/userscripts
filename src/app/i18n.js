import messages_en from "./_locales/en/messages.json?url";
import messages_zh from "./_locales/zh/messages.json?url";

import nativeLoggerCaveat_en from "./_locales/en/native-logger-caveat.md?url";
import nativeLoggerCaveat_zh from "./_locales/zh/native-logger-caveat.md?url";

import quickStartGuide_mac_en from "./_locales/en/quick-start-guide-mac.md?url";
import quickStartGuide_mac_zh from "./_locales/zh/quick-start-guide-mac.md?url";
import quickStartGuide_ios_en from "./_locales/en/quick-start-guide-ios.md?url";
import quickStartGuide_ios_zh from "./_locales/zh/quick-start-guide-ios.md?url";

/** @type {Types.MessagesL10n} */
const messagesL10n = {
	en: messages_en,
	zh: messages_zh,
};

/** @type {Types.MarkdownL10n} */
const markdownL10n = {
	md_native_logger_caveat: {
		en: nativeLoggerCaveat_en,
		zh: nativeLoggerCaveat_zh,
	},
	md_quick_start_guide: {
		en: { mac: quickStartGuide_mac_en, ios: quickStartGuide_ios_en },
		zh: { mac: quickStartGuide_mac_zh, ios: quickStartGuide_ios_zh },
	},
};

/**
 * @param {Object} messages
 * @param {string} messageName
 * @param {string | string[]} substitutions
 * @returns {string}
 */
function getLangFrom(messages, messageName, substitutions = undefined) {
	if (!(messageName in messages)) {
		console.warn(`i18n - "${messageName}" not found`, messages);
		return "";
	}
	/** @type {string} message */
	let text = messages[messageName].message;
	// handle substitutions
	if (typeof substitutions === "string") {
		text = text.replace("$1", substitutions);
	} else if (Array.isArray(substitutions)) {
		for (let i = 0; i < substitutions.length; i++) {
			text = text.replace(`$${i + 1}`, substitutions[i]);
		}
	}
	if (import.meta.env.MODE === "development") {
		console.debug("i18n", messages[messageName].message, text, substitutions);
	}
	return text;
}

/** @type {Types.I18n} */
export async function i18n(platform) {
	/** @type {string} */
	let lang;
	if (navigator.language in messagesL10n) {
		lang = navigator.language;
	} else {
		const language = navigator.language.split("-").at(0);
		lang = language in messagesL10n ? language : "en";
	}
	if (import.meta.env.MODE === "development") {
		// lang = "en"; // DEBUG
		// lang = "zh"; // DEBUG
	}
	/** @type {Object} */
	let messages;
	/** @type {Object} */
	let markdown = {};
	/** @type {() => Promise} */
	const fetchMessages = async () => {
		const response = await fetch(messagesL10n[lang]);
		messages = await response.json();
	};
	const promises = [fetchMessages()];
	/** @type {(name: string, url: string) => Promise} */
	const fetchMarkdown = async (name, url) => {
		const response = await fetch(url);
		markdown[name] = { message: await response.text() };
	};
	for (const [k, v] of Object.entries(markdownL10n)) {
		const vl = v[lang];
		if (typeof vl === "string") {
			promises.push(fetchMarkdown(k, vl));
		} else if (typeof vl === "object" && "mac" in vl && "ios" in vl) {
			promises.push(fetchMarkdown(k, vl[platform]));
		}
	}
	try {
		await Promise.all(promises);
	} catch (error) {
		console.error(error);
	}
	if (import.meta.env.MODE === "development") {
		console.debug(promises, messages, markdown);
	}
	return {
		gl: (n, s) => getLangFrom({ ...messages, ...markdown }, n, s),
	};
}
