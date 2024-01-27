/**
 * @file ESLint project configuration (New flat config)
 * @see {@link https://eslint.org/docs/latest/use/configure/configuration-files-new}
 * @see {@link https://eslint.org/docs/latest/use/configure/migration-guide}
 * @see {@link https://eslint.org/docs/latest/extend/plugin-migration-flat-config}
 * @see {@link https://eslint.org/blog/2022/08/new-config-system-part-1/}
 * @see {@link https://eslint.org/blog/2022/08/new-config-system-part-2/}
 */

import js from "@eslint/js";
import sveltePlugin from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
	/**
	 * @see {@link https://eslint.org/docs/latest/use/configure/configuration-files-new#using-predefined-configurations}
	 * @see {@link https://github.com/eslint/eslint/tree/main/packages/js}
	 */
	js.configs.recommended,

	/**
	 * @see {@link https://github.com/sveltejs/eslint-plugin-svelte}
	 * currently no official svelte/recommended flat config
	 * flatten and call it through a custom config object
	 */
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
		},
		processor: "svelte/svelte",
		plugins: {
			svelte: sveltePlugin,
		},
		rules: {
			...sveltePlugin.configs.base.overrides[0].rules,
			...sveltePlugin.configs.recommended.rules,
		},
	},

	/**
	 * @see {@link https://github.com/prettier/eslint-config-prettier}
	 * turns off the conflict rules, put it last
	 */
	prettier,

	/** custom config objects */

	/** @see {@link https://eslint.org/docs/latest/use/configure/configuration-files-new#globally-ignoring-files-with-ignores} */
	{
		ignores: ["**/dist/", "**/build/", "etc/", "xcode/", "public/"],
	},

	/** @see {@link https://eslint.org/docs/latest/use/configure/migration-guide#configuring-language-options} */
	{
		files: ["scripts/**/*.js"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ["src/{app,dev}/**/*.{js,svelte}"],
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
	},
	{
		files: ["src/ext/**/*.{js,svelte}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions,
			},
		},
	},
];
