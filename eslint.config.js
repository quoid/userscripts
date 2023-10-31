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
	// https://eslint.org/docs/latest/use/configure/configuration-files-new#using-predefined-configurations
	// https://github.com/eslint/eslint/tree/main/packages/js
	js.configs.recommended,

	// https://github.com/sveltejs/eslint-plugin-svelte
	// currently no official svelte/recommended flat config
	// flatten and call it through a custom config object
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

	// https://github.com/prettier/eslint-config-prettier
	// turns off the conflict rules, put it last
	prettier,

	// custom config objects

	// https://eslint.org/docs/latest/use/configure/configuration-files-new#globally-ignoring-files-with-ignores
	{
		ignores: ["**/dist/", "**/build/", "etc/", "xcode/", "public/"],
	},

	// https://eslint.org/docs/latest/use/configure/migration-guide#configuring-language-options
	{
		files: ["src/**/*.{js,svelte}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions,
			},
		},
	},
];
