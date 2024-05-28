/**
 * node:process
 * @see {@link https://nodejs.org/api/process.html#processchdirdirectory chdir}
 * @see {@link https://nodejs.org/api/process.html#processcwd cwd}
 * node:child_process
 * @see {@link https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback execFile}
 * node:util
 * @see {@link https://nodejs.org/api/util.html#utilpromisifyoriginal promisify}
 * node:url
 * @see {@link https://nodejs.org/api/url.html#urlfileurltopathurl fileURLToPath}
 * node:fs/promises
 * @see {@link https://nodejs.org/api/fs.html#fspromisescopyfilesrc-dest-mode copyFile}
 * @see {@link https://nodejs.org/api/fs.html#fspromisesmkdirpath-options mkdir}
 * @see {@link https://nodejs.org/api/fs.html#fspromisesreaddirpath-options readdir}
 * @see {@link https://nodejs.org/api/fs.html#fspromisesreadfilepath-options readFile}
 * @see {@link https://nodejs.org/api/fs.html#fspromisesrealpathpath-options realpath}
 * @see {@link https://nodejs.org/api/fs.html#fspromisesrmpath-options rm}
 * @see {@link https://nodejs.org/api/fs.html#fspromisesstatpath-options stat}
 */
import { chdir, cwd } from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
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

/** Promisified execFile */
const execFileAsync = promisify(execFile);

/** Define shared constants */
export const SAFARI_APP_RESOURCES = "xcode/App-Shared/Resources";
export const SAFARI_EXT_RESOURCES = "xcode/Ext-Safari/Resources";

/**
 * If not then cd to root dir and returns the path
 * @see {@link https://nodejs.org/api/esm.html#importmetaurl}
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
 * @see {@link https://nodejs.org/api/errors.html#common-system-errors ENOENT}
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
		if (error.code === "ENOENT") {
			console.info("[SKIPPED] emptyBuildDir:", error.message);
			return true;
		}
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

/**
 * @see {@link https://git-scm.com/docs/git-describe}
 * @returns {Promise<string|void>} git tag, eg: v5.0.0-beta.1
 */
async function getGitTag() {
	try {
		const { stdout, stderr } = await execFileAsync("git", [
			"describe",
			"--tags",
			"--abbrev=0",
		]);
		stderr && console.log(stderr);
		if (stdout) return stdout.trim();
	} catch (error) {
		console.error(error);
		process.exit(error.code);
	}
}

/**
 * @see {@link https://git-scm.com/docs/git-rev-parse}
 * @returns {Promise<string|void>} git commit, eg: 700c978ccbd387921084ee185f495aa1f795d2e0
 */
async function getGitCommit() {
	try {
		const { stdout, stderr } = await execFileAsync("git", [
			"rev-parse",
			"HEAD",
		]);
		stderr && console.log(stderr);
		if (stdout) return stdout.trim();
	} catch (error) {
		console.error(error);
		process.exit(error.code);
	}
}

const gitTag = await getGitTag();
const gitCommit = await getGitCommit();
if (!gitTag || !gitCommit) {
	console.error("Failed to get git infos, please check.");
	process.exit(1);
}

/**
 * Define default vite config options
 * Disable auto resolving {@link vite.config.js}
 * @see {@link https://vitejs.dev/config/ Config}
 * @see {@link https://vitejs.dev/guide/api-javascript.html#inlineconfig InlineConfig}
 * @type {import("vite").InlineConfig}
 */
export const baseConfig = {
	configFile: false,
	envFile: false,
	root: await rootDir(),
	base: "./",
	define: process.env.SAFARI_PLATFORM
		? {
				"import.meta.env.BROWSER": JSON.stringify("Safari"),
				"import.meta.env.NATIVE_APP": JSON.stringify("app"),
				"import.meta.env.SAFARI_PLATFORM": JSON.stringify(
					process.env.SAFARI_PLATFORM,
				),
				"import.meta.env.GIT_TAG": JSON.stringify(gitTag),
				"import.meta.env.GIT_COMMIT": JSON.stringify(gitCommit),
		  }
		: {
				"import.meta.env.GIT_TAG": JSON.stringify(gitTag),
				"import.meta.env.GIT_COMMIT": JSON.stringify(gitCommit),
		  },
};
