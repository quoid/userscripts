import nativeLoggerCaveat from "./native-logger-caveat.md?raw";
import quickStartGuideMac from "./quick-start-guide-mac.md?raw";
import quickStartGuideIos from "./quick-start-guide-ios.md?raw";

import { marked } from "marked";

/** @satisfies {Types.I18nMessages} */
export const markdown = {
	native_logger_caveat: {
		message: await marked.parse(nativeLoggerCaveat),
	},
	quick_start_guide_mac: {
		message: await marked.parse(quickStartGuideMac),
	},
	quick_start_guide_ios: {
		message: await marked.parse(quickStartGuideIos),
	},
};

/** @satisfies {Types.I18nMessages} */
export const messages = {
	enabled: {
		message: "Enabled",
	},
	disabled: {
		message: "Disabled",
	},
	unknown: {
		message: "Unknown",
	},
	error: {
		message: "Error",
	},
	button_ok: {
		message: "OK",
	},
	button_dismiss: {
		message: "Dismiss",
	},
	button_disable: {
		message: "Disable",
	},
	safari_extension_status: {
		message: "Safari Extension Status",
	},
	native_logger_enabled_title: {
		message: "Native Logger Enabled",
	},
	quick_start_guide_title: {
		message: "Quick Start Guide",
	},
	open_safari_settings: {
		message: "Open Safari Settings",
	},
	open_safari_preferences: {
		message: "Open Safari Preferences",
	},
	show_usage_guide: {
		message: "Show Usage Guide",
	},
	change_directory: {
		message: "Change Userscripts Directory",
	},
	current_directory: {
		message: "CURRENT DIRECTORY:",
	},
	documentation: {
		message: "Documentation",
	},
	discussions: {
		message: "Discussions",
	},
	report_an_issue: {
		message: "Report an Issue",
	},
	privacy_policy: {
		message: "Privacy Policy",
	},
	export_log_files: {
		message: "Export log files",
	},
	disable_logger: {
		message: "Disable Logger",
	},
};
