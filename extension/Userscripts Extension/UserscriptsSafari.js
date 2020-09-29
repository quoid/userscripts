// store code data received
var data;
// var that determines whether strict csp injection has already run (JS only)
var evalJS = 0;

// returns a sorted object
function sortByWeight(obj) {
    var sorted = {};
    Object.keys(obj).sort(function(a, b) {
        return obj[b].weight - obj[a].weight;
    }).forEach(function(key) {
        sorted[key] = obj[key];
    });
    return sorted;
}

function injectCSS(filename, code) {
    // there's no fallback if blocked by CSP
    // future fix?: https://wicg.github.io/construct-stylesheets/
    const tag = document.createElement("style");
    tag.textContent = code;
    document.head.appendChild(tag);
    console.info(`Injecting ${filename}`);
}

function injectJS(filename, code, scope) {
    if (scope != "content") {
        const tag = document.createElement("script");
        tag.textContent = code;
        document.body.appendChild(tag);
    } else {
        eval(code);
    }
    console.info(`Injecting ${filename}`);
}

function processJS(filename, code, scope, timing) {
    // this is about to get ugly
    if (timing === "document-start") {
        if (document.readyState === "loading") {
            document.addEventListener("readystatechange", function() {
                if (document.readyState === "interactive") {
                    injectJS(filename, code, scope);
                }
            });
        } else {
            injectJS(filename, code, scope);
        }
    } else if (timing === "document-end") {
        if (document.readyState !== "loading") {
            injectJS(filename, code, scope);
        } else {
            document.addEventListener("DOMContentLoaded", function() {
                injectJS(filename, code, scope);
            });
        }
    } else if (timing === "document-idle") {
        if (document.readyState === "complete") {
            injectJS(filename, code, scope);
        } else {
            document.addEventListener("readystatechange", function(e) {
                if (document.readyState === "complete") {
                    injectJS(filename, code, scope);
                }
            });
        }
    }
}

// parse data and run injection methods
function parseCode(data, fallback = false) {
    // get css / js code separately
    for (const type in data) {
        // get the nested code object respectively
        const codeTypeObject = data[type];
        // will be used for ordered code injection
        var sorted = {};
        // css and js is injected differently
        if (type === "css") {
            sorted = sortByWeight(codeTypeObject);
            for (const filename in sorted) {
                const code = sorted[filename]["code"];
                // css is only injected into the page scope after DOMContentLoaded event
                if (document.readyState !== "loading") {
                    injectCSS(filename, code);
                } else {
                    document.addEventListener("DOMContentLoaded", function() {
                        injectCSS(filename, code);
                    });
                }
            }
        } else if (type === "js") {
            // js code can be scoped to the content script, page or auto
            // if auto is set, page scope is attempted, if fails content scope attempted
            for (scope in codeTypeObject) {
                // get the nested scoped objects, separated by timing
                const scopedObject = codeTypeObject[scope];
                // possible execution timings
                const timings = ["document-start", "document-end", "document-idle"];
                // check scopedObject for code by timing
                timings.forEach(function(t) {
                    // get the nested timing objects, separated by filename
                    var timingObject = scopedObject[t];
                    // if empty, skip
                    if (Object.keys(timingObject).length != 0) {
                        sorted = sortByWeight(timingObject);
                        for (filename in sorted) {
                            const code = sorted[filename]["code"];
                            // scripts with auto scope will retry inject into content scope
                            // when blocked by strict CSP
                            if (fallback) {
                                console.warn(`Attempting fallback injection for ${filename}`);
                                scope = "content";
                            }
                            processJS(filename, code, scope, t);
                        }
                    }
                });
            }
        }
    }
}

// attempt to ensure script only runs on top-level pages
if (window.top === window) {
    // request saved script code
    safari.extension.dispatchMessage("REQ_USERSCRIPTS");
    // attempt to detect strict CSPs
    document.addEventListener("securitypolicyviolation", function(e) {
        const src = e.sourceFile.toUpperCase();
        const ext = safari.extension.baseURI.toUpperCase();
        // eval fallback
        // ensure that violation came from the extension
        if ((ext.startsWith(src) || src.startsWith(ext))) {
            // get all "auto" code
            if (Object.keys(data["js"]["auto"]).length != 0 && evalJS < 1) {
                var n = {"js":{"auto":{}}};
                n["js"]["auto"] = data["js"]["auto"];
                parseCode(n, true);
                evalJS = 1;
            }
        }
    });
}

// respond to messages
function handleMessage(event) {
    // the only message currently sent to the content script
    if (event.name === "RESP_USERSCRIPTS") {
        // if error returned, log and stop execution
        if (event.message.error) {
            console.error(event.message.error);
            return;
        }
        // save data sent with message to var
        data = event.message.data;
        // run injection sequence
        // check if data is empty
        if (Object.keys(data).length != 0) {
            parseCode(data);
        }
    }
}

// event listener to handle messages
safari.self.addEventListener("message", handleMessage);
