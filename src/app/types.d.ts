declare namespace Types {
	/** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference} */
	type I18nMessages = {
		[x: string]: {
			message: string;
			description?: string;
			placeholders?: Object;
		};
	};

	type GetLang<T = string> = (
		messageName: T,
		substitutions?: string | string[],
	) => string;

	type SystemPlatform = "mac" | "ios";
}
