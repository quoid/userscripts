import nativeLoggerCaveat from "./native-logger-caveat.md?raw";
import quickStartGuideMac from "./quick-start-guide-mac.md?raw";
import quickStartGuideIos from "./quick-start-guide-ios.md?raw";

import { marked } from "marked";

/** @satisfies {typeof import("../en/messages.js").markdown} */
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

/** @satisfies {typeof import("../en/messages.js").messages} */
export const messages = {
	enabled: {
		message: "已啟用",
	},
	disabled: {
		message: "已停用",
	},
	unknown: {
		message: "未知",
	},
	error: {
		message: "錯誤",
	},
	button_ok: {
		message: "確定",
	},
	button_dismiss: {
		message: "關閉",
	},
	button_disable: {
		message: "停用",
	},
	safari_extension_status: {
		message: "Safari 延伸功能狀態",
	},
	native_logger_enabled_title: {
		message: "本地日誌記錄器已啟用",
	},
	quick_start_guide_title: {
		message: "快速入門指南",
	},
	open_safari_settings: {
		message: "開啟 Safari 設定",
	},
	open_safari_preferences: {
		message: "開啟 Safari 偏好",
	},
	show_usage_guide: {
		message: "顯示使用指南",
	},
	change_directory: {
		message: "更改使用者腳本目錄",
	},
	current_directory: {
		message: "當前目錄：",
	},
	documentation: {
		message: "詳細文件",
	},
	discussions: {
		message: "交流討論",
	},
	report_an_issue: {
		message: "報告問題",
	},
	privacy_policy: {
		message: "隱私政策",
	},
	export_log_files: {
		message: "匯出日誌檔案",
	},
	disable_logger: {
		message: "停用日誌記錄",
	},
};
