// store code received
let data;
// determines whether strict csp injection has already run (JS only)
let cspFallbackAttempted = 0;

function sortByWeight(o) {
    let sorted = {};
    Object.keys(o).sort((a, b) => o[b].weight - o[a].weight).forEach(key => sorted[key] = o[key]);
    return sorted;
}

function injectCSS(filename, code) {
    // there's no fallback if blocked by CSP
    // future fix?: https://wicg.github.io/construct-stylesheets/
    console.info(`Injecting ${filename}`);
    const tag = document.createElement("style");
    tag.textContent = code;
    document.head.appendChild(tag);
}

function injectJS(filename, code, scope) {
    console.info(`Injecting ${filename}`);
    code = "(function() {\n" + code + "\n//# sourceURL=" + filename.replace(/\s/g, "-") + "\n})();";
    if (scope != "content") {
        const tag = document.createElement("script");
        tag.textContent = code;
        document.body.appendChild(tag);
    } else {
        eval(code);
    }
}

function processJS(filename, code, scope, timing, name) {
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
    } else if (timing === "context-menu" && window === window.top) {
        // when context menu item found, create a unique menuItemId and clean name
        // the menuItemId will be passed back and forth between content and background
        // for that reason use the current url + filename for the menuItemId
        // when this file gets an run request, which file to run can be parsed from the menuItemId
        // construct url from window.location since url params in href can break match pattern
        const url = window.location.origin + window.location.pathname;
        const menuItemId = url + "&$&" + filename;
        const message = {name: "CONTEXT_CREATE", menuItemId: menuItemId, title: name, url: url};
        browser.runtime.sendMessage(message, response => {
            window.addEventListener("beforeunload", () => {
                // beforeunload doesn't fire on page refresh?
                // OK since we wouldn't want to remove the context menu items when that happens
                browser.runtime.sendMessage({name: "CONTEXT_REMOVE", menuItemId: menuItemId});
            });
        });
    }
}

function parseCode(data, fallback = false) {
    // get css/js code separately
    for (const type in data) {
        // separate code type object (ie. {"css":{ ... }} {"js": { ... }})
        const codeTypeObject = data[type];
        // will be used for ordered code injection
        let sorted = {};
        if (type === "css") {
            sorted = sortByWeight(codeTypeObject);
            for (const filename in sorted) {
                const code = sorted[filename].code;
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
            // js code can be context scoped to the content script, page, or auto
            // if auto is set, page scope is attempted, if fails content scope attempted
            for (let scope in codeTypeObject) {
                // the object for context-menu scripts is constructed differently
                // the "scope" is context-menu even though it's really a timing
                // needs to be handled in a different manner
                if (scope === "context-menu") {
                    const timingObject = codeTypeObject[scope];
                    for (const realScope in timingObject) {
                        const scopeObject = timingObject[realScope];
                        if (Object.keys(scopeObject).length != 0) {
                            for (const filename in scopeObject) {
                                const code = scopeObject[filename].code;
                                const name = scopeObject[filename].name;
                                // scope = timing as mentioned above
                                const timing = scope;
                                processJS(filename, code, realScope, timing, name);
                            }
                        }
                    }
                } else {
                    // get the nested scoped objects, separated by timing
                    const scopeObject = codeTypeObject[scope];
                    // possible execution timings
                    const timings = ["document-start", "document-end", "document-idle"];
                    timings.forEach(timing => {
                        // get the nested timing objects, separated by filename, skip if empty
                        const timingObject = scopeObject[timing];
                        if (Object.keys(timingObject).length != 0) {
                            sorted = sortByWeight(timingObject);
                            for (const filename in sorted) {
                                const code = sorted[filename].code;
                                // when block by csp rules, auto scope script will auto retry injection
                                if (fallback) {
                                    console.warn(`Attempting fallback injection for ${filename}`);
                                    scope = "content";
                                }
                                processJS(filename, code, scope, timing);
                            }
                        }
                    });
                }
            }
        }
    }
}

function cspFallback(e) {
    // if a security policy violation event has occurred, and the directive is script-src
    // it's fair to assume that there is a strict CSP for scripts
    // if there's a strict CSP for scripts, it's unlikely this extension uri is whitelisted
    // when any script-src violation is detected, re-attempt injection
    // since it's fair to assume injection was blocked for extension's content script
    if (e.effectiveDirective === "script-src") {
        // get all "auto" code
        // since other extensions can trigger a security policy violation event
        // make sure data var is not undefined before attempting fallback
        if (data && Object.keys(data.js.auto).length != 0 && cspFallbackAttempted < 1) {
            let n = {"js": {"auto": {}}};
            n.js.auto = data.js.auto;
            parseCode(n, true);
        }
        cspFallbackAttempted = 1;
    }
}

// request code
browser.runtime.sendMessage({name: "REQ_USERSCRIPTS"}, response => {
    // save code to data var so cspFallback can be attempted
    data = response.code;
    if (Object.keys(data).length != 0) parseCode(data);
});

// listen for messages from background, popup, etc...
browser.runtime.onMessage.addListener(request => {
    if (request.name === "CONTEXT_RUN") {
        // only run context menu script in top window
        if (window != window.top) return;
        // get the filename from the menuItemId sent with the request
        const filename = request.menuItemId.split("&$&")[1];
        // clone the context menu scripts object from the data var
        const contextMenuCodeObject = data.js["context-menu"];
        let found = false;
        // loop through all the context menu scripts to find match against filename
        for (let scope in contextMenuCodeObject) {
            for (const fn in contextMenuCodeObject[scope]) {
                if (fn === filename) {
                    // get code from object and send for injection along with filename & scope
                    const code = contextMenuCodeObject[scope][filename].code;
                    // if strict csp already detected change auto scoped scripts to content
                    if (cspFallbackAttempted && scope === "auto") {
                        console.warn(
                            `Strict CSP encountered, changing injection context for ${filename}`
                        );
                        scope = "content";
                    }
                    scope = cspFallbackAttempted && scope === "auto" ? "content" : scope;
                    injectJS(filename, code, scope);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
    }
});

// when userscript fails due to a CSP and has @inject-into value of auto
document.addEventListener("securitypolicyviolation", cspFallback);
