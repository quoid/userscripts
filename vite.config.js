import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/**
 * About `inline-svg`
 * use `?raw` suffix import svg assets as inline
 * @see {@link https://vitejs.dev/guide/assets.html#importing-asset-as-string}
 */

/**
 * About `autoprefixer`
 * have config with `.postcssrc.json` file
 * @see {@link https://vitejs.dev/guide/features.html#postcss}
 * about `missing peer postcss` error, ignore it
 */

/** @see {@link https://vitejs.dev/config/} */
export default defineConfig({
	publicDir: "public/ext/vendor/",
	plugins: [svelte()],
	base: "./",
});
