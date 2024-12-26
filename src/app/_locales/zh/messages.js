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
		message: "已启用",
	},
	disabled: {
		message: "已停用",
	},
	unknown: {
		message: "未知",
	},
	error: {
		message: "错误",
	},
	button_ok: {
		message: "确定",
	},
	button_dismiss: {
		message: "关闭",
	},
	button_disable: {
		message: "停用",
	},
	safari_extension_status: {
		message: "Safari 扩展状态",
	},
	native_logger_enabled_title: {
		message: "本地日志记录器已启用",
	},
	quick_start_guide_title: {
		message: "快速入门指南",
	},
	open_safari_settings: {
		message: "打开 Safari 设置",
	},
	open_safari_preferences: {
		message: "打开 Safari 偏好",
	},
	show_usage_guide: {
		message: "显示使用指南",
	},
	change_directory: {
		message: "更改用户脚本目录",
	},
	current_directory: {
		message: "当前目录：",
	},
	documentation: {
		message: "详细文档",
	},
	discussions: {
		message: "交流讨论",
	},
	report_an_issue: {
		message: "报告问题",
	},
	privacy_policy: {
		message: "隐私政策",
	},
	export_log_files: {
		message: "导出日志文件",
	},
	disable_logger: {
		message: "停用日志记录",
	},
};
