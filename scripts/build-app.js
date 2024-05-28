/**
 * @file Build App WebView resources using the Vite JavaScript API
 * @see {@link https://vitejs.dev/guide/api-javascript.html JavaScript API}
 *
 * All build processes start at the same time due to asynchronous calls
 * The assets name is irrelevant, just need to determine the entry path
 */

import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { baseConfig } from "./utils.js";

/**
 * Build App-Shared WebView resources to xcode dist
 */
build({
	...baseConfig,
	plugins: [svelte()],
	build: {
		outDir: "xcode/App-Shared/Resources/dist/",
		copyPublicDir: false,
		rollupOptions: {
			input: "entry-app-webview.html",
		},
	},
});
