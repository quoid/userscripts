/**
 * @file Preview App WebView resources using the Vite JavaScript API
 * @see {@link https://vitejs.dev/guide/api-javascript.html JavaScript API}
 */

import {preview} from "vite";

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
 * Preview App-Shared WebView resources from xcode dist
 */
(async () => {
    const previewServer = await preview({
        ...defineConfig,
        preview: {
            // port: 4173,
            open: "entry-app-webview.html"
        },
        build: {
            outDir: "xcode/App-Shared/Resources/dist/"
        }
    });
    previewServer.printUrls();
})();
