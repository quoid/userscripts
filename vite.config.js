import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { baseConfig } from "./scripts/utils.js";

/**
 * About `inline-svg`
 * use `?raw` suffix import svg assets as inline
 * @see {@link https://vitejs.dev/guide/assets.html#importing-asset-as-string}
 * Ignore lint errors `{@html}`, since these are deterministic local svg resources,
 * there is no risk of Cross-Site Scripting (XSS) attacks and can be safely disabled.
 * @see {@link https://sveltejs.github.io/eslint-plugin-svelte/rules/no-at-html-tags/}
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
	define: baseConfig.define,
	resolve: baseConfig.resolve,
});
