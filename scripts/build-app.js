/**
 * @file Build App WebView resources using the Vite JavaScript API
 * @see {@link https://vitejs.dev/guide/api-javascript.html JavaScript API}
 *
 * All build processes start at the same time due to asynchronous calls
 * The assets name is irrelevant, just need to determine the entry path
 */

import {build} from "vite";
import {svelte} from "@sveltejs/vite-plugin-svelte";

/**
 * Define default vite config options
 * Disable auto resolving {@link vite.config.js}
 * @see {@link https://vitejs.dev/config/ Config}
 * @see {@link https://vitejs.dev/guide/api-javascript.html#inlineconfig configFile}
 */
const defineConfig = {
    base: "./",
    configFile: false
};

/**
 * Build App-Shared WebView resources to xcode dist
 */
build({
    ...defineConfig,
    plugins: [svelte()],
    build: {
        outDir: "xcode/App-Shared/Resources/dist/",
        copyPublicDir: false,
        rollupOptions: {
            input: "entry-app-webview.html"
        }
    }
});
