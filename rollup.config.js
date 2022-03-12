import fs from "fs";
import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import css from "rollup-plugin-css-only";
import inlineSvg from "rollup-plugin-inline-svg";
import multi from "@rollup/plugin-multi-entry";

const production = !process.env.ROLLUP_WATCH;
const directory = process.env.NODE_ENV === "popup" ? "popup" : "page";

//let input = [`src/${directory}/dev.js`, `src/${directory}/main.js`];
let input = ["src/shared/dev.js", `src/${directory}/main.js`];
if (production) input = `src/${directory}/main.js`;

function serve() {
    let server;

    function toExit() {
        if (server) server.kill(0);
    }

    return {
        writeBundle() {
            if (server) return;
            server = require("child_process").spawn(
                "npm",
                ["run", `start:${directory}`, "--", "--dev"],
                {
                    stdio: ["ignore", "inherit", "inherit"],
                    shell: true
                }
            );
            process.on("SIGTERM", toExit);
            process.on("exit", toExit);
        }
    };
}

export default {
    input: input,
    output: {
        sourcemap: !production,
        format: "iife",
        name: "app",
        file: `public/${directory}/build/bundle.js`
    },
    inlineDynamicImports: true,
    plugins: [
        multi(),
        css({
            output: `public/${directory}/build/lib.css`
        }),
        copyAndWatch("./public/shared/variables.css", "variables.css"),
        copyAndWatch("./public/shared/reset.css", "reset.css"),
        inlineSvg({}),
        svelte({
            // enable run-time checks when not in production
            dev: !production,
            // we'll extract any component CSS out into
            // a separate file - better for performance
            css: css => {
                css.write("bundle.css", !production);
            }
        }),
        // If you have external dependencies installed from
        // npm, you'll most likely need these plugins. In
        // some cases you'll need additional configuration -
        // consult the documentation for details:
        // https://github.com/rollup/plugins/tree/master/packages/commonjs
        resolve({
            browser: true,
            dedupe: ["svelte"]
        }),
        commonjs(),
        // In dev mode, call `npm run start` once
        // the bundle has been generated
        !production && serve(),
        // Watch the `public` directory and refresh the
        // browser on changes when not in production
        !production && livereload({
            watch: [`public/${directory}`]
        })
    ],
    watch: {
        clearScreen: false
    }
};

/**
 * Simple plugin for watching and copying asset for use in app.
 * @see {@link https://dev.to/lukap/creating-a-rollup-plugin-to-copy-and-watch-a-file-3hi2 Tutorial}
 * @see {@link https://rollupjs.org/guide/en/#build-hooks Rollup Build Hooks}
 * @param {string} inputFilePath
 * @param {string} outputFilename
 */
function copyAndWatch(inputFilePath, outputFilename) {
    return {
        name: "copy-and-watch",
        async buildStart() {
            this.addWatchFile(inputFilePath);
        },
        async generateBundle() {
            this.emitFile({
                type: "asset",
                fileName: outputFilename,
                source: fs.readFileSync(inputFilePath)
            });
        }
    };
}
