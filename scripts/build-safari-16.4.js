/**
 * @file Build App-WebView and Safari-Extension resources using the Vite JavaScript API
 * @see {@link https://vitejs.dev/guide/api-javascript.html JavaScript API}
 *
 * Safari supports for modules in background since 16.4
 * @see {@link https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes#Safari-Extensions}
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#browser_compatibility}
 *
 * Content scripts not support import modules, and due to their privileges and the
 * speed of injecting user scripts, use a independent build currently
 *
 * All build processes start at the same time due to asynchronous calls
 * The assets name is irrelevant, just need to determine the entry path
 */

import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import pluginMarkedDivest from "./vite-plugin-marked-divest.js";
import * as Utils from "./utils.js";

/** @type {import("vite").InlineConfig} */
const sharedConfig = {
	...Utils.baseConfig,
	define: {
		...Utils.baseConfig.define,
		"import.meta.env.SAFARI_VERSION": JSON.stringify(16.4),
	},
	build: {
		sourcemap: process.env.BETA ? true : false,
		target: "safari16.4",
	},
};

/**
 * Build App-Shared WebView resources to xcode dist
 */
build({
	...Utils.baseConfig,
	plugins: [svelte(), pluginMarkedDivest()],
	build: {
		...sharedConfig.build,
		outDir: `${Utils.APP_SHARED_RESOURCES}/dist/`,
		copyPublicDir: false,
		rollupOptions: {
			input: "entry-app-webview.html",
		},
	},
});

/**
 * Empty resources directory
 * Copy public static assets
 */
await Utils.emptyBuildDir(Utils.EXT_SAFARI_RESOURCES);
Utils.cp("public/ext/shared", Utils.EXT_SAFARI_RESOURCES);
Utils.cp("public/ext/safari-16.4", Utils.EXT_SAFARI_RESOURCES);

/** Build content scripts */
[
	{ userscripts: "src/ext/content-scripts/entry-userscripts.js" },
	{ "dot-user-js": "src/ext/content-scripts/entry-dot-user-js.js" },
	{ "script-market": "src/ext/content-scripts/entry-script-market.js" },
].forEach((input) => {
	build({
		...sharedConfig,
		build: {
			...sharedConfig.build,
			outDir: `${Utils.EXT_SAFARI_RESOURCES}/dist/content-scripts/`,
			emptyOutDir: false,
			copyPublicDir: false,
			rollupOptions: {
				input,
				output: { entryFileNames: "[name].js" },
			},
		},
	});
});

/**
 * Build background scripts
 * Modular background may not load correctly on Safari startup
 * Currently build classic script separately to avoid this error
 */
build({
	...sharedConfig,
	build: {
		...sharedConfig.build,
		outDir: `${Utils.EXT_SAFARI_RESOURCES}/dist/`,
		emptyOutDir: false,
		copyPublicDir: false,
		rollupOptions: {
			input: { background: "src/ext/background/main.js" },
			output: { entryFileNames: "[name].js" },
		},
	},
});

/** Build shared modules */
build({
	...sharedConfig,
	plugins: [svelte()],
	publicDir: "public/ext/vendor/",
	build: {
		...sharedConfig.build,
		outDir: `${Utils.EXT_SAFARI_RESOURCES}/dist/`,
		emptyOutDir: false,
		rollupOptions: {
			input: {
				// background: "src/ext/background/main.js",
				"action-popup": "entry-ext-action-popup.html",
				"extension-page": "entry-ext-extension-page.html",
			},
			output: { entryFileNames: "[name].js" },
		},
	},
});
