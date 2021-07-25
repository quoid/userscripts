import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import css from "rollup-plugin-css-only";
import inlineSvg from "rollup-plugin-inline-svg";
import multi from "@rollup/plugin-multi-entry";


const production = !process.env.ROLLUP_WATCH;
const directory =  process.env.NODE_ENV === "popup" ? "popup" : "page";
let input = ["src/" + directory + "/dev.js", "src/" + directory + "/main.js"];
if (production) input = "src/" + directory + "/main.js";

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
                ["run", "start:" + directory, "--", "--dev"],
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
        file: "public/" + directory + "/build/bundle.js"
    },
    inlineDynamicImports: true,
    plugins: [
        multi(),
        // css({
        //     output: "public/" + directory + "/build.lib.css"
        // }),
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
            watch: ["public/" + directory, "public/shared"]
        })
    ],
    watch: {
        clearScreen: false
    }
};
