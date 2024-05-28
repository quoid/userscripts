/**
 * @file Build extension pages demonstration using the Vite JavaScript API
 * @see {@link https://vitejs.dev/guide/api-javascript.html JavaScript API}
 */

import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import * as Utils from "./utils.js";

/** @type {import("vite").InlineConfig} */
const sharedConfig = {
	...Utils.baseConfig,
	mode: "development",

	define: {
		...Utils.baseConfig.define,
		"import.meta.env.SAFARI_VERSION": JSON.stringify(15),
		"import.meta.env.EXT_DEMO_BUILD": JSON.stringify(true),
	},
};

/**
 * Empty resources directory
 * Copy public static assets
 */
await Utils.emptyBuildDir("dist");
Utils.cp("public/ext/shared", "dist");

/** Build shared modules */
build({
	...sharedConfig,
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
