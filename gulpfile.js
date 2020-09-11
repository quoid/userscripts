const { dest, parallel, series, src, watch } = require("gulp");
const atImport = require("postcss-import");
const autoprefixer = require("autoprefixer");
const connect = require("gulp-connect");
const del = require("del");
const htmlmin = require("gulp-htmlmin");
const inline = require("gulp-inline-source");
const nunjucksRender = require("gulp-nunjucks-render");
const postcss = require("gulp-postcss");
const sourcemaps = require("gulp-sourcemaps");

const sourcePath = "./src";
let outputPath = "./build";


function clean() {
    if (process.env.NODE_ENV === "production") {
        outputPath = "./extension/Userscripts Extension";
        return del(`${outputPath}/index.html`);
    } else if (process.env.NODE_ENV === "demo") {
        outputPath = "./demo";
        return del(`${outputPath}/**/*`);
    } else {
        // delete all files at the output path, except .gitignore
        return del(`${outputPath}/**/*`);
    }
}

function css() {
    // NODE_ENV production is set when using the "npm run build" command
    // if NODE_ENV === production, no sourcemaps and minify the css
    const path = `${sourcePath}/stylesheets/_main.css`;

    // autoprefix more browsers for demo page
    var browsers = ["safari 13"];
    if (process.env.NODE_ENV === "demo") {
        browsers = ["last 4 version"];
    }

    if (
        process.env.NODE_ENV != "production"
        || process.env.NODE_ENV != "demo"
    ) {
        return src(path)
            .pipe(sourcemaps.init())
            .pipe(postcss([
                atImport(),
                autoprefixer({overrideBrowserslist: browsers})
            ]))
            .pipe(sourcemaps.write())
            .pipe(dest(outputPath));
    } else {
        return src(path)
            .pipe(postcss([
                atImport(),
                autoprefixer({overrideBrowserslist: browsers})
            ]))
            .pipe(dest(outputPath));
    }
}

function js() {
    // not much is done to the JS files, they simply copied over
    // they will be inlined in the html function, if doing a build/demo
    return src(`${sourcePath}/js/**/*.js`)
        .pipe(dest(`${outputPath}/js/`));
}

function lib() {
    // not much is done to lib files, other than copying them over
    // and inlining on build/demo
    return src(`${sourcePath}/lib/**/*`)
        .pipe(dest(`${outputPath}/lib/`));
}

function html() {
    // set a var for whether or not we are in dev/demo mode
    // development var will be false when running the npm run build command
    // during development we will NOT inline css or js files
    // that way we can properly debug
    // on builds everything will inlined to a single html file and minified
    let demo = false;
    let development = true;
    let ignore = ["css", "js"];
    if (
        process.env.NODE_ENV === "production"
        || process.env.NODE_ENV === "demo"
    ) {
        development = false;
        ignore = [];
    }
    if (process.env.NODE_ENV === "demo") {
        demo = true;
    }
    return src(`${sourcePath}/index.html`)
        .pipe(nunjucksRender({
            // pass custom data to nunjucks for use throughout template(s)
            // these are using in index.html to determine what to inline
            data: {
                demo: demo,
                development: development
            },
            path: [
                `${sourcePath}/macros`,
                `${sourcePath}/partials`
            ]
        }))
        .pipe(inline({
            compress: true,
            ignore: ignore
        }))
        .pipe(htmlmin({
            collapseWhitespace: !development,
            minifyCSS: false,
            minifyJS: false,
            removeComments: !development
        }))
        .pipe(dest(outputPath))
        .pipe(connect.reload());
}

function move() {
    // only for demo
    return src("./demo/index.html")
        .pipe(dest("./"))
}

function complete() {
    // delete all the files at the output path except the index.html file
    // this is a separate function than the clean function above because
    // on the intial clean we want to remove EVERYTHING
    // on the build complete, we want to leave the index.html
    let paths = [
        `${outputPath}/**/*`,
        //`!${outputPath}/index.html`
    ];
    if (process.env.NODE_ENV === "production") {
        paths = [
            `${outputPath}/lib`,
            `${outputPath}/js`,
            `${outputPath}/_main.css`
        ]
    }
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
    watch(paths, series(css, js, lib, html));
    cb();
}

exports.build = series(clean, css, js, lib, html, complete);
exports.clean = clean;
exports.demo = series(clean, css, js, lib, html, move, complete);
exports.server = series(clean, css, js, lib, html, parallel(server, watcher));
