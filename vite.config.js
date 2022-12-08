import {resolve} from "path";
import {defineConfig} from "vite";
import {svelte} from "@sveltejs/vite-plugin-svelte";

// [inline-svg]
// TODO: remove this once vite resolved issue
// https://github.com/vitejs/vite/issues/1204
// import fs from "fs";
// import svgpkg from "svg-inline-loader";
// export function svgInline() { // custom plugin
//     return {
//         name: "transform-file",
//         transform(code, id) {
//             if (id.endsWith(".svg")) {
//                 const svg = fs.readFileSync(id, "utf8");
//                 const ret = svgpkg.getExtractedSVG(svg, {});
//                 return `export default '${ret}'`;
//             }
//         }
//     };
// }
// [inline-svg]
// NOW: use `?raw` suffix import svg assets as inline
// https://vitejs.dev/guide/assets.html#importing-asset-as-string

// [autoprefixer]
// https://vitejs.dev/guide/features.html#postcss
// have config with `.postcssrc.json` file
// about `missing peer postcss` error, ignore it

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svelte()],
    base: "./",
    build: {
        outDir: "xcode/Userscripts Extension/Resources/dist/",
        rollupOptions: {
            input: {
                page: resolve(__dirname, "entry-page.html"),
                popup: resolve(__dirname, "entry-popup.html"),
                background: resolve(__dirname, "entry-background.html")
            }
        }
    }
});
