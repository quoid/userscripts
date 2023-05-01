import {defineConfig} from "vite";
import {svelte} from "@sveltejs/vite-plugin-svelte";
import autoprefixer from "autoprefixer";

const entry = process?.env?.VITE_ENTRY;
const parentDir = "xcode";
const assetsDir = "assets";

let root = "src";
if (entry === "app") root = "src/app";
if (entry === "content") root = "src/scripts";
if (entry === "page") root = "src/page";
if (entry === "popup") root = "src/popup";

let outDir = `../${parentDir}/Safari-Extension/Resources`;
if (entry === "app") outDir = `../../${parentDir}/Shared (App)/`;
if (entry === "content") outDir = `../${outDir}`;

/**
 * Plugin that serves a couple different purposes:
 * 1. Updates the html bundle fileNames so that the path they are output to
 *    matches the structure of the extension directory. For example, rather than
 *    the path being page/index.html, it will be dist/page.html, etc...
 * 2. Transforms relative paths within these files. Since we are renaming files,
 *    the paths reflected in these html files need to be updated to point t0
 *    the correct location of the files and assets.
 *
 * @returns {import("vite").Plugin}
 * @see {@link https://vitejs.dev/guide/api-plugin.html Vite Plugin API}
 * @see {@link https://rollupjs.org/plugin-development/ Rollup Plugin API}
 */
const processIndexFiles = () => ({
	name: "rename-index-files",
	apply: "build",
	enforce: "post",
	generateBundle(_options, bundle) {
		for (const key of Object.keys(bundle)) {
			if (key.includes(".html")) {
				if (entry === "app") {
					bundle[key].fileName = "Base.lproj/app.html";
				} else {
					const name = key.split("/")[0];
					bundle[key].fileName = `${name}.html`;
				}
			}
		}
	},
	transformIndexHtml(html) {
		if (entry === "app") return html;
		return html.replace(/(href|src)="\.\.\//g, '$1="./');
	}
});

/**
 * Plugin to create an index.html file when running `pnpm dev`. When using this
 * command the browser will serve the the src` directory. This plugin will
 * create an index.html file that lists the available entry points for the
 * extension without the need to create an index.html file for this purpose.
 *
 * @returns {import("vite").Plugin}
 * @see {@link https://vitejs.dev/guide/api-plugin.html Vite Plugin API}
 * @see {@link https://rollupjs.org/plugin-development/ Rollup Plugin API}
 */
const buildEntryIndex = () => ({
	name: "build-entry-index",
	apply: "serve",
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			if (req.originalUrl === "/" && !entry) {
				res.setHeader("Content-Type", "text/html");
				const html = `
					<!DOCTYPE html>
					<html>
						<head>
							<title>Userscripts Entry Page</title>
							<meta charset="utf-8">
						</head>
						<body>
							<h1>Choose an app component:</h1>
							<ul>
								<li><a href="/popup/index.html">Popup</a></li>
								<li><a href="/page/index.html">Page</a></li>
							</ul>
						</body>
					</html>
				`;
				res.end(html);
			} else {
				next();
			}
		});
	}
});

/**
 * Custom plugin to add browser condition to vite; necessary for running tests.
 * Alternative option is to add the following to the test property.
 * alias: [{find: /^svelte$/, replacement: "svelte/internal"}]
 *
 * @returns {import("vite").Plugin}
 * @see {@link https://github.com/vitest-dev/vitest/issues/2834 GitHub Issue}
 */
const vitestBrowserConditionPlugin = () => ({
	name: "vite-plugin-vitest-browser-condition",
	config({resolve}) {
		if (process.env.VITEST && resolve) {
			resolve.conditions?.unshift("browser");
		}
	}
});

// https://vitejs.dev/config/
// https://rollupjs.org/configuration-options/
export default defineConfig({
	base: "./",
	build: {
		emptyOutDir: false,
		lib:
			entry === "content"
				? {
						entry: `${entry}.js`,
						fileName: entry,
						formats: ["es"],
						name: entry
				  }
				: false,
		// https://caniuse.com/link-rel-modulepreload
		modulePreload: {polyfill: true},
		outDir: outDir,
		rollupOptions: {
			input:
				entry === "app" || entry === "content"
					? undefined
					: {
							background: "src/scripts/background.js",
							page: "src/page/index.html",
							popup: "src/popup/index.html"
					  },
			output: {
				// use a more meaningful chunk name
				manualChunks:
					entry === "app" || entry === "content"
						? undefined
						: (id) => {
								if (id.includes("shared")) {
									return "shared";
								}
						  },
				assetFileNames: () => {
					if (entry === "app") return "Resources/[name][extname]";
					return `${assetsDir}/[name][extname]`;
				},
				chunkFileNames: `${assetsDir}/[name].js`,
				// depending on the chunk, output to different directories
				entryFileNames: (chunkInfo) => {
					if (entry === "app") return "Resources/app.js";
					if (
						chunkInfo.name === "background" ||
						["page", "popup"].includes(chunkInfo.name)
					) {
						return "[name].js";
					}
					if (entry === "content") return "[name].js";
					return `${assetsDir}/[name].js`;
				},
				// when building the shared app, inline all imports
				inlineDynamicImports: entry === "app"
			}
		}
	},
	css: {
		postcss: {
			plugins: [
				autoprefixer({
					overrideBrowserslist: ["safari >= 16"]
				})
			]
		}
	},
	plugins: [
		vitestBrowserConditionPlugin(),
		buildEntryIndex(),
		svelte(),
		processIndexFiles()
	],
	publicDir: false,
	root: root
});
