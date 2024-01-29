/**
 * @file Build extension pages demonstration using the Vite JavaScript API
 * @see {@link https://vitejs.dev/guide/api-javascript.html JavaScript API}
 */

import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { cp, emptyBuildDir, rootDir } from "./utils.js";

/**
 * Define default vite config options
 * Disable auto resolving {@link vite.config.js}
 * @see {@link https://vitejs.dev/config/ Config}
 * @see {@link https://vitejs.dev/guide/api-javascript.html#inlineconfig InlineConfig}
 * @type {import("vite").InlineConfig}
 */
const defineConfig = {
	configFile: false,
	envFile: false,
	root: await rootDir(),
	base: "./",
	mode: "development",
	define: {
		"import.meta.env.BROWSER": JSON.stringify("Safari"),
		"import.meta.env.NATIVE_APP": JSON.stringify("app"),
		"import.meta.env.SAFARI_PLATFORM": JSON.stringify(
			process.env.SAFARI_PLATFORM,
		),
		"import.meta.env.EXT_DEMO_BUILD": JSON.stringify(true),
	},
};

/**
 * Empty resources directory
 * Copy public static assets
 */
await emptyBuildDir("dist");
cp("public/ext/shared", "dist");

/** Build shared modules */
build({
	...defineConfig,
	plugins: [svelte()],
	publicDir: "public/ext/vendor/",
	build: {
		outDir: `dist/`,
		emptyOutDir: false,
		rollupOptions: {
			input: ["entry-ext-action-popup.html", "entry-ext-extension-page.html"],
		},
		target: "esnext", // top-level await
	},
});
