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

	type ExtensionStatus = "unknown" | "disabled" | "enabled" | "error";

	type MessageBody =
		| "INIT"
		| "CHANGE_DIRECTORY"
		| "OPEN_DIRECTORY"
		| "SHOW_PREFERENCES"
		| "EXPORT_LOG_FILES"
		| "DISABLE_LOGGER"
		| "DISMISS_LOGGER_PROMPT";

	type MessageReply<T> = T extends "INIT"
		? {
				build: string;
				version: string;
				platform: SystemPlatform;
				directory: string;
				extStatus: ExtensionStatus;
				useSettingsInsteadOfPreferences: boolean;
				enableLogger: boolean;
				promptLogger: boolean;
				maxLogFileSize: number;
				firstRunTime: number;
			}
		: void;
}
