declare namespace Types {
	type L10nLanguages = "en" | "zh";

	type MessagesL10n = {
		[x in L10nLanguages]: string;
	};

	type MarkdownL10n = {
		[x: string]: {
			[x in L10nLanguages]: string | { [x in SystemPlatform]: string };
		};
	};

	type GetLang = (
		messageName: string,
		substitutions?: string | string[],
	) => string;

	type I18n = (platform: SystemPlatform) => Promise<I18nObject>;

	interface I18nObject {
		gl: GetLang;
	}

	type SystemPlatform = "mac" | "ios";
}
