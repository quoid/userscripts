const {dest, series, src} = require("gulp");
const del = require("del");
const inline = require("gulp-inline-source");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const htmlmin = require("gulp-html-minifier-terser");

// will be building from a clone of the public directory
// if not for this, the global stylesheets would get prefixed which are used in development
function copy() {
    return src("./public/**/*")
        .pipe(dest("./temp"));
}

// autoprefix select stylesheets and overwrite in place
function autoprefix() {
    return src(["./temp/build/bundle.css", "./temp/css/global.css"])
        .pipe(postcss([
            autoprefixer({overrideBrowserslist: ["last 4 version"]})
        ]))
        .pipe(dest(file => file.base));
}

// conditionally inline dev.js if bundling a demo page based on env var set in package.json
// inline the rest of the asset for a monolithic html file
function bundle() {
    const d = process.env.NODE_ENV === "demo" ? "./" : "./extension/Userscripts Extension";
    return src("./temp/index.html")
        .pipe(inline({
            attribute: false,
            compress: false,
            ignore: []
        }))
        .pipe(htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true
        }))
        .pipe(dest(d));
}

// remove the temp folder
function clean() {
    return del("./temp");
}

exports.demo = series(copy, autoprefix, bundle, clean);
exports.build = series(copy, autoprefix, bundle, clean);
