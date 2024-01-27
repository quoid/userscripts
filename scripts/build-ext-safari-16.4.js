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
import { cp, emptyBuildDir, rootDir, SAFARI_EXT_RESOURCES } from "./utils.js";

/**
 * Define default vite config options
 * Disable auto resolving {@link vite.config.js}
 * @see {@link https://vitejs.dev/config/ Config}
 * @see {@link https://vitejs.dev/guide/api-javascript.html#inlineconfig configFile}
 * @type {import("vite").InlineConfig}
 */
const defineConfig = {
	configFile: false,
	envFile: false,
	root: await rootDir(),
	base: "./",
	define: {
		"import.meta.env.BROWSER": JSON.stringify("safari"),
		"import.meta.env.NATIVE_APP": JSON.stringify("app"),
	},
};

/**
 * Empty resources directory
 * Copy public static assets
 */
await emptyBuildDir(SAFARI_EXT_RESOURCES);
cp("public/ext/shared", SAFARI_EXT_RESOURCES);
cp("public/ext/safari-16.4", SAFARI_EXT_RESOURCES);

/** Build content scripts */
[
	{ userscripts: "src/ext/content-scripts/entry-userscripts.js" },
	{ "dot-user-js": "src/ext/content-scripts/entry-dot-user-js.js" },
	{ greasyfork: "src/ext/content-scripts/entry-greasyfork.js" },
].forEach((input) => {
	build({
		...defineConfig,
		build: {
			outDir: `${SAFARI_EXT_RESOURCES}/dist/content-scripts/`,
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
	...defineConfig,
	build: {
		outDir: `${SAFARI_EXT_RESOURCES}/dist/`,
		emptyOutDir: false,
		copyPublicDir: false,
		rollupOptions: {
			input: { background: "src/ext/background/main.js" },
			output: { entryFileNames: "[name].js" },
		},
	},
});

/** Build shared modules */
/** @type {import("rollup").InputOption} */
let input = {
	// background: "src/ext/background/main.js",
	"action-popup": "entry-ext-action-popup.html",
	"extension-page": "entry-ext-extension-page.html",
};
if (process.env.SAFARI_PLATFORM === "ios") {
	delete input["extension-page"];
}
build({
	...defineConfig,
	plugins: [svelte()],
	publicDir: "public/ext/vendor/",
	build: {
		outDir: `${SAFARI_EXT_RESOURCES}/dist/`,
		emptyOutDir: false,
		rollupOptions: {
			input,
			output: { entryFileNames: "[name].js" },
		},
	},
});
