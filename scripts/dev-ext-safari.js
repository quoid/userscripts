/**
 * @file Develop Safari extension resources using the Vite JavaScript API
 * @see {@link https://vitejs.dev/guide/api-javascript.html JavaScript API}
 * This development build and server requires a valid https certificate to support remote real-time development
 * Typically using a self-signed certificate, it needs to be installed and trusted by the device or simulator
 * @see {@link https://developer.apple.com/library/archive/qa/qa1948/}
 * @see {@link https://developer.apple.com/library/archive/technotes/tn2326/}
 */

import { build, createServer } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import * as Utils from "./utils.js";
import https from "node:https";

/** @type {import("vite").InlineConfig} */
const sharedConfig = {
	...Utils.baseConfig,
	mode: "development",
	define: {
		...Utils.baseConfig.define,
		"import.meta.env.SAFARI_VERSION": JSON.stringify(16.4),
	},
};

/**
 * Build resources for remote real-time development
 * @param {import("vite").ViteDevServer} server
 * @param {string} origin
 */
async function buildResources(server, origin) {
	/**
	 * empty resources directory
	 * copy public static assets
	 */
	await Utils.emptyBuildDir("dist");
	await Utils.emptyBuildDir(Utils.SAFARI_EXT_RESOURCES);
	Utils.cp("public/ext/shared", Utils.SAFARI_EXT_RESOURCES);
	Utils.cp("public/ext/shared-dev", Utils.SAFARI_EXT_RESOURCES);
	if (process.env.SAFARI_PLATFORM === "ios") {
		Utils.cp(
			"public/ext/safari-dev/manifest-ios.json",
			`${Utils.SAFARI_EXT_RESOURCES}/manifest.json`,
		);
	} else {
		Utils.cp(
			"public/ext/safari-dev/manifest-mac.json",
			`${Utils.SAFARI_EXT_RESOURCES}/manifest.json`,
		);
	}

	/** build content scripts */
	[
		{ userscripts: "src/ext/content-scripts/entry-userscripts.js" },
		{ "dot-user-js": "src/ext/content-scripts/entry-dot-user-js.js" },
		{ "script-market": "src/ext/content-scripts/entry-script-market.js" },
	].forEach((input) => {
		/** build proxy content scripts replace actual code */
		build({
			...sharedConfig,
			plugins: [
				{
					name: "generate-content-proxy",
					load(id) {
						const name = id.replace(/.+entry-/, "");
						const url = `${origin}/dist/content-scripts/${name}`;
						return `// proxy content
						(function () {
							if (window["${id}"]) return;
							window["${id}"] = 1;
							const xhr = new XMLHttpRequest();
							xhr.open("GET", "${url}", false);
							xhr.send();
							const code = xhr.responseText;
							try {
								Function(code + "//# sourceURL=proxy-${name}")();
							} catch (error) {
								console.error(error);
							}
						})();`;
					},
				},
			],
			build: {
				outDir: `${Utils.SAFARI_EXT_RESOURCES}/dist/content-scripts/`,
				emptyOutDir: false,
				copyPublicDir: false,
				rollupOptions: {
					input,
					output: { entryFileNames: "[name].js" },
				},
			},
		});
		/** build content scripts for dev server and watch changes */
		build({
			...sharedConfig,
			build: {
				outDir: `dist/content-scripts/`,
				emptyOutDir: false,
				copyPublicDir: false,
				rollupOptions: {
					input,
					output: { entryFileNames: "[name].js" },
				},
				watch: {},
				minify: false,
			},
		});
	});

	/** generate entrance dist */
	build({
		...sharedConfig,
		publicDir: "public/ext/vendor/",
		plugins: [
			/**
			 * @see {@link https://github.com/vitejs/vite/issues/14263}
			 * Dev only requires entrances, so order `pre` without transform modules
			 */
			{
				name: "generate-dev-entrance",
				transformIndexHtml: {
					order: "pre",
					async handler(html, ctx) {
						const str = await server.transformIndexHtml(ctx.path, html);
						return str.replaceAll(`src="/`, `src="${origin}/`);
					},
				},
			},
		],
		build: {
			outDir: `${Utils.SAFARI_EXT_RESOURCES}/dist/`,
			emptyOutDir: false,
			rollupOptions: {
				input: {
					background: "entry-ext-background.html",
					"action-popup": "entry-ext-action-popup.html",
					"extension-page": "entry-ext-extension-page.html",
				},
			},
		},
	});
}

/**
 * Define shared constants
 * Developing in native machine and simulator can just use `https://localhost:port/` as the origin
 * But using a fixed domain name on non-native devices such as real iOS devices is a better choice
 * The local domain name needs to be resolved to the LAN IP address on LAN DNS or the target device
 * When the origin specified here is unreachable, localhost will be automatically used as the alternate
 * The origin requires as an exemption to be added to the `manifest.json` due to default CSP limitations
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy}
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy}
 */
const serverOptions = await Utils.sharedServerOptions();
const SERVER_PORT = 55173;
const SERVER_ORIGIN = `https://userscripts.test:${SERVER_PORT}`;

/**
 * Check if the server is reachable with self-signed certificate
 * @param {string | URL} url
 * @returns {Promise<boolean>}
 */
async function serverCheck(url) {
	const options = {
		method: "HEAD",
		ca: serverOptions.ca,
		headers: { Accept: "*/*" },
	};
	return new Promise((resolve) => {
		const req = https.request(url, options, (res) => {
			if (res.headers.server === SERVER_ORIGIN) {
				resolve(true);
			}
			resolve(false);
		});
		req.on("error", (e) => {
			console.error(`${req.host}: ${e.message}`);
			resolve(false);
		});
		req.end();
	});
}

/** main process */
(async () => {
	/** run development server */
	const server = await createServer({
		...sharedConfig,
		plugins: [svelte()],
		server: {
			host: true,
			port: SERVER_PORT,
			strictPort: true,
			https: { key: serverOptions.key, cert: serverOptions.cert },
			headers: { server: SERVER_ORIGIN },
		},
	});
	await server.listen();
	server.printUrls();

	// Check available origins and build resources
	for (let url of [SERVER_ORIGIN, ...server.resolvedUrls.local]) {
		if (await serverCheck(url)) {
			const origin = url.at(-1) === "/" ? url.slice(0, -1) : url;
			console.info(`build with origin: ${origin}`);
			buildResources(server, origin);
			break;
		}
	}
})();
