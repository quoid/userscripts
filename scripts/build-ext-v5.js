/**
 * @file Build Safari extension resources using the Vite JavaScript API
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

/**
 * Define default vite config options
 * Disable auto resolving {@link vite.config.js}
 * @see {@link https://vitejs.dev/config/ Config}
 * @see {@link https://vitejs.dev/guide/api-javascript.html#inlineconfig configFile}
 * @type {import("vite").InlineConfig}
 */
const defineConfig = {
	base: "./",
	configFile: false,
	define: {
		"import.meta.env.BROWSER": JSON.stringify("safari"),
		"import.meta.env.NATIVE_APP": JSON.stringify("app"),
	},
};

/**
 * Build shared modules for safari
 * These multiple entry files will share the same modules
 * Using a subdirectory avoid emptying other built files
 */
build({
	...defineConfig,
	plugins: [svelte()],
	build: {
		outDir: "xcode/Ext-Safari/Resources/dist/s/",
		rollupOptions: {
			input: {
				background: "src/ext/background/main.js",
				"action-popup": "entry-ext-action-popup.html",
				"extension-page": "entry-ext-extension-page.html",
			},
			output: {
				entryFileNames: "[name].js",
			},
		},
	},
});

/**
 * Build independent scripts for safari
 * Each entry in the array will generate a separate script
 */
[{ content: "src/ext/content-scripts/main.js" }].forEach((input) => {
	build({
		...defineConfig,
		build: {
			outDir: "xcode/Ext-Safari/Resources/dist/",
			emptyOutDir: false,
			copyPublicDir: false,
			rollupOptions: {
				input,
				output: {
					entryFileNames: "[name].js",
				},
			},
		},
	});
});
