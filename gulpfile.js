const {dest, series, src} = require("gulp");
const del = require("del");
const inline = require("gulp-inline-source");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const htmlmin = require("gulp-html-minifier-terser");
const dom = require("gulp-dom");
const rename = require("gulp-rename");

const copyLocation = "./temp";

// clone public directory to avoid prefixing development assets
function copy() {
    return src("./public/**/*")
        .pipe(dest(copyLocation));
}

// autoprefix select stylesheets and overwrite in place
function autoprefix() {
    return src([`${copyLocation}/build/bundle.css`, `${copyLocation}/css/global.css`])
        .pipe(postcss([
            autoprefixer({overrideBrowserslist: ["safari >= 13"]})
        ]))
        .pipe(dest(file => file.base));
}

// inline assets
function inlineAssets() {
    return src(`${copyLocation}/index.html`)
        .pipe(inline({
            attribute: false,
            compress: false,
            ignore: []
        }))
        .pipe(htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: false,
            removeComments: true
        }))
        .pipe(dest(file => file.base));
}

// remove the inlined javascript and save to singular js file
function bundleJS() {
    return src(`${copyLocation}/index.html`)
        .pipe(dom(function() {
            const scripts = this.querySelectorAll("script");
            let result = "";
            scripts.forEach(function(script) {
                result += script.innerHTML;
            });
            return result;
        }, false))
        .pipe(rename("popup.js"))
        .pipe(dest("./FOO"));
}

// remove the scripts tags from source file and move/rename html file
function removeTags() {
    return src(`${copyLocation}/index.html`)
        .pipe(dom(function() {
            const scripts = this.querySelectorAll("script");
            scripts.forEach(function(script) {
                const parent = script.parentNode;
                parent.removeChild(script);
            });
            const f = this.createElement("script");
            f.setAttribute("src", "scripts/popup.js");
            this.body.appendChild(f);
            return this;
        }, false))
        .pipe(rename("popup.html"))
        .pipe(dest("./FOO"));
}

// remove the temp folder
function clean() {
    return del(copyLocation);
}

exports.build = series(copy, autoprefix, inlineAssets, bundleJS, removeTags, clean);
