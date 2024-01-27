import { chdir, cwd } from "node:process";
import { fileURLToPath } from "node:url";
import {
	copyFile,
	mkdir,
	readdir,
	readFile,
	realpath,
	rm,
	stat,
} from "node:fs/promises";

/** Define shared constants */
export const SAFARI_APP_RESOURCES = "xcode/App-Shared/Resources";
export const SAFARI_EXT_RESOURCES = "xcode/Ext-Safari/Resources";

/**
 * If not then cd to root dir and returns the path
 * @returns {Promise<string>} project root directory
 */
export async function rootDir() {
	const root = fileURLToPath(new URL("..", import.meta.url));
	if (cwd() !== (await realpath(root))) {
		chdir(root);
		console.info("cd:", root);
	}
	return root;
}

/**
 * Empty the build directory safely
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
export async function emptyBuildDir(dir) {
	const buildPaths = ["dist", SAFARI_APP_RESOURCES, SAFARI_EXT_RESOURCES];
	if (!buildPaths.includes(dir)) {
		console.error("Non-build path, cannot be empty.");
		return false;
	}
	const root = await rootDir();
	try {
		for (const sub of await readdir(dir)) {
			const path = `${root}/${dir}/${sub}`;
			// console.log("rm:", path); // DEBUG
			await rm(path, { force: true, recursive: true });
		}
		return true;
	} catch (error) {
		console.error("emptyBuildDir:", error);
		return false;
	}
}

/**
 * Copy a file or folder recursively
 * @param {string} src Source file or directory
 * @param {string} dest Destination file or directory
 */
export async function cp(src, dest) {
	// console.log("cp:", src, "->", dest); // DEBUG
	await rootDir();
	const srcStat = await stat(src);
	if (srcStat.isFile()) return copyFile(src, dest);
	if (!srcStat.isDirectory()) return;
	await mkdir(dest, { recursive: true });
	for (const sub of await readdir(src)) {
		if ([".DS_Store"].includes(sub)) continue;
		await cp(`${src}/${sub}`, `${dest}/${sub}`);
	}
}

/**
 * Read file and return text
 * @param {string} file file path
 * @returns {Promise<string>} file content
 */
export async function read(file) {
	const path = fileURLToPath(new URL(file, import.meta.url));
	return readFile(path, "utf8");
}

/**
 * @see {@link https://vitejs.dev/config/server-options.html#server-https}
 * @see {@link https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener}
 * @returns {Promise<import("node:https").ServerOptions>} https.ServerOptions
 */
export const sharedServerOptions = async () => ({
	ca: await read("./local/ca.pem"),
	key: await read("./local/key.pem"),
	cert: await read("./local/cert.pem"),
});
