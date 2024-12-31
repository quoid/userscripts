import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { marked } from "marked";

/**
 * Exclude files that do not need to be processed
 * @param {string} id
 * @returns {boolean}
 */
function isExclude(id) {
	const res = [/\/src\/app\/_locales\/[A-Za-z0-9_]+\/messages\.js/];
	for (const re of res) {
		if (re.test(id)) return false;
	}
	return true;
}

/**
 * Preprocess `marked` calls and `.md?raw` transformations at build time
 * to avoid including `marked` modules and runtime transformations
 * @returns {import('vite').Plugin}
 */
function preprocessMarked() {
	return {
		name: "preprocess-marked",
		resolveId: {
			order: "pre",
			handler(source, importer) {
				if (isExclude(importer)) return;
				if (source.endsWith(".md?raw")) {
					const importerUrl = new URL(importer, import.meta.url);
					const sourceUrl = new URL(source, importerUrl);
					return fileURLToPath(sourceUrl) + "?marked";
				}
			},
		},
		load: {
			order: "pre",
			async handler(id) {
				if (!id.endsWith(".md?marked")) return;
				const url = new URL(id, import.meta.url);
				const text = await readFile(fileURLToPath(url), "utf8");
				const html = await marked.parse(text);
				return `export default ${JSON.stringify(html)}`;
			},
		},
		transform(code, id) {
			if (isExclude(id)) return;
			if (!code.includes("marked.parse")) return;
			const node = this.parse(code);
			if (node.sourceType !== "module") return;
			for (const module of node.body) {
				if (module.type !== "ImportDeclaration") continue;
				if (!module.source.value.toString().endsWith(".md?raw")) continue;
				const specifier = module.specifiers.find(
					(specifier) => specifier.type === "ImportDefaultSpecifier",
				);
				const varName = specifier.local.name;
				code = code.replace(`await marked.parse(${varName})`, varName);
				// console.debug(`optimizing 'await marked.parse(${varName})'`, id); // DEBUG
			}
			return { code };
		},
	};
}

/**
 * Turn off `Marked` module side effects for better tree-shaking
 * @returns {import('vite').Plugin}
 */
function disableMarkedSideEffects() {
	return {
		name: "disable-marked-side-effects",
		transform(code, id) {
			if (id.includes("/node_modules/marked")) {
				return { code, moduleSideEffects: false };
			}
		},
	};
}

/**
 * @returns {import('vite').Plugin[]}
 */
function markedDivest() {
	return [disableMarkedSideEffects(), preprocessMarked()];
}

export default markedDivest;
