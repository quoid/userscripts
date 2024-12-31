/**
 * @typedef {typeof import("./_locales/en/messages.js").messages} MessagesT
 * @typedef {typeof import("./_locales/en/messages.js").markdown} MarkdownT
 */

/**
 * @param {Types.I18nMessages} messages
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

export async function i18nInit() {
	const languages = [navigator.language.replace("-", "_")];
	if (["zh-HK", "zh-MO", "zh-TW"].includes(navigator.language)) {
		languages.unshift("zh_Hant");
	}
	languages.push(navigator.language.split("-")[0]);
	languages.push("en"); // fallback
	if (import.meta.env.MODE === "development") {
		// languages.unshift("en"); // DEBUG
	}
	for (const language of languages) {
		try {
			/** @type {{messages: MessagesT, markdown: MarkdownT}} */
			const module = await import(`./_locales/${language}/messages.js`);
			const { messages, markdown } = module;
			return {
				/** @type {Types.GetLang<keyof MessagesT>} */
				gl: (n, s) => getLangFrom(messages, n, s),
				/** @type {Types.GetLang<keyof MarkdownT>} */
				md: (n, s) => getLangFrom(markdown, n, s),
			};
		} catch (error) {
			console.debug(error);
		}
	}
	throw Error("I18n initialization failed");
}
