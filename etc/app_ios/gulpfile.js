const { dest, parallel, series, src, watch } = require("gulp");
var assets  = require("postcss-assets");
const atImport = require("postcss-import");
const autoprefixer = require("autoprefixer");
const connect = require("gulp-connect");
const del = require("del");
const htmlmin = require("gulp-htmlmin");
const inline = require("gulp-inline-source");
const nano = require("cssnano");
const nunjucksRender = require("gulp-nunjucks-render");
const postcss = require("gulp-postcss");
const sourcemaps = require("gulp-sourcemaps");

const sourcePath = "./src";
const outputPath = "./output";

function clean() {
    // delete all files at the output path, except .gitignore
    const paths = [
        `${outputPath}/**/*`
    ];
    return del(paths);
}

function css() {
    // NODE_ENV production is set when using the "npm run build" command
    // if NODE_ENV === production, no sourcemaps and minify the css
    if (process.env.NODE_ENV != "production") {
        return src(`${sourcePath}/css/_main.css`)
            .pipe(sourcemaps.init())
            .pipe(postcss([
                atImport(),
                assets(),
                autoprefixer({overrideBrowserslist: ["defaults"]})
            ]))
            .pipe(sourcemaps.write())
            .pipe(dest(outputPath));
    } else {
        return src(`${sourcePath}/css/_main.css`)
            .pipe(postcss([
                atImport(),
                assets(),
                autoprefixer({overrideBrowserslist: ["defaults"]}),
                nano()
            ]))
            .pipe(dest(outputPath));
    }
}

function js() {
    // copy over the javascript files, as is
    return src(`${sourcePath}/js/**/*.js`)
        .pipe(dest(`${outputPath}/js/`));
}

function html() {
    // set a var for whether or not we are in dev mode
    // development var will be false when running the npm run build command
    // during development we will NOT inline css or js files
    // that way we can properly debug
    // on builds everything will inlined to a single html file
    var development = true;
    var ignore = ["css", "js"];
    if (process.env.NODE_ENV === "production") {
        development = false;
        ignore = [];
    }
    return src(`${sourcePath}/index.html`)
        .pipe(nunjucksRender({
            // pass custom data to nunjucks for use throughout template(s)
            // can use custom data from package.json (ex. title)
            data: {
                development: development,
                title: process.env.npm_package_websiteTitle
            },
            path: `${sourcePath}/html`
        }))
        .pipe(inline({
            compress: true,
            ignore: ignore
        }))
        .pipe(htmlmin({
            collapseWhitespace: true,
            minifyJS: false,
            removeComments: true
        }))
        .pipe(dest(outputPath))
        .pipe(connect.reload());
}

function complete() {
    // delete all the files at the output path except the index.html file
    // this is a separate function than the clean function above because
    // on the intial clean we want to remove EVERYTHING
    // on the build complete, we want to leave the index.html
    const paths = [
        `${outputPath}/**/*`,
        `!${outputPath}/index.html`
    ];
    return del(paths);
}

function server(cb) {
    connect.server({
        root: outputPath,
        livereload: true,
        port: 8888
    });
    cb();
}

function watcher(cb) {
    const paths = [
        `${sourcePath}/**/*.html`,
        `${sourcePath}/**/*.css`,
        `${sourcePath}/**/*.js`,
        `${sourcePath}/**/*.svg`
    ];
    watch(paths, series(css, js, html));
    cb();
}

exports.build = series(clean, css, js, html, complete);
exports.clean = clean;
exports.server = series(clean, css, js, html, parallel(server, watcher));
