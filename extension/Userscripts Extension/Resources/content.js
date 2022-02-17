// store code received
let data;
// determines whether strict csp injection has already run (JS only)
let cspFallbackAttempted = 0;
// track whether event listener added
let beforeunload = 0;
// unique id for api messaging
const uid = Math.random().toString(36).substr(2, 8);
// keep reference to platform
let platform;

// request code immediately
browser.runtime.sendMessage({name: "REQ_USERSCRIPTS"}, response => {
    // save code to data var so cspFallback can be attempted
    data = response.code;
    if (Object.keys(data).length !== 0) parseCode(data);
});

function sortByWeight(o) {
    const sorted = {};
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

function injectJS(filename, code, scope, timing, grants, fallback) {
    console.info(`Injecting ${filename}`);
    // include api methods
    const gmVals = [];
    const usVals = [];
    const includedFunctions = [];
    // when a csp violation occurs, the scope is set to "content", when previously it's "auto"
    // if the scope isn't changed back to "auto" pre-injection, the scriptDataKey will be null
    // and the fallback attempt will fail
    // this will change back to "content" below
    scope = fallback ? "auto" : scope;
    let scriptDataKey;
    if (timing === "context-menu") {
        scriptDataKey = data.js["context-menu"][scope][filename];
    } else {
        scriptDataKey = data.js[scope][timing][filename];
    }
    const scriptData = {
        "script": scriptDataKey.scriptObject,
        "scriptHandler": data.scriptHandler,
        "scriptHandlerVersion": data.scriptHandlerVersion,
        "scriptMetaStr": scriptDataKey.scriptMetaStr
    };
    // change the scope back so it properly inject on fallback attempt
    if (fallback) scope = "content";
    // TODO: use us_info instead of const variables
    let api = `const uid = "${uid}";\nconst filename = "${filename}";`;
    const us_info = {filename: filename, info: scriptData, uid: uid};
    api += `\nconst us_info = ${JSON.stringify(us_info)}`;
    // all scripts get acces to GM.info and GM_info
    api += `\n${us_getInfo}`;
    api += "\nconst GM_info = us_getInfo;\n";
    gmVals.push("info: us_getInfo");
    grants.forEach(grant => {
        if (grant === "GM.openInTab") {
            api += `\n${us_openInTab}`;
            gmVals.push("openInTab: us_openInTab");
        } else if (grant === "US.closeTab") {
            api += `\n${us_closeTab}`;
            usVals.push("closeTab: us_closeTab");
        } else if (grant === "GM.setValue") {
            api += `\n${us_setValue}`;
            gmVals.push("setValue: us_setValue");
        } else if (grant === "GM.getValue") {
            api += `\n${us_getValue}`;
            gmVals.push("getValue: us_getValue");
        } else if (grant === "GM.deleteValue") {
            api += `\n${us_deleteValue}`;
            gmVals.push("deleteValue: us_deleteValue");
        } else if (grant === "GM.listValues") {
            api += `\n${us_listValues}`;
            gmVals.push("listValues: us_listValues");
        } else if (grant === "GM_addStyle") {
            api += `\n${us_addStyleSync}\nconst GM_addStyle = us_addStyleSync;`;
        } else if (grant === "GM.addStyle") {
            api += `\n${us_addStyle}\n`;
            gmVals.push("addStyle: us_addStyle");
        } else if (grant === "GM.setClipboard") {
            api += `\n${us_setClipboard}`;
            gmVals.push("setClipboard: us_setClipboard");
        } else if (grant === "GM_setClipboard") {
            api += `\n${us_setClipboardSync}\nconst GM_setClipboard = us_setClipboardSync;`;
        } else if (grant === "GM_xmlhttpRequest" || grant === "GM.xmlHttpRequest") {
            if (!includedFunctions.includes(xhr.name)) {
                api += `\n${xhr}`;
                includedFunctions.push(xhr.name);
            }
            if (grant === "GM_xmlhttpRequest") {
                api += "\nconst GM_xmlhttpRequest = xhr;\n";
            } else if (grant === "GM.xmlHttpRequest") {
                gmVals.push("xmlHttpRequest: xhr");
            }
        }
    });
    // create api aliases
    const GM = `const GM = {${gmVals.join(",")}};`;
    const US = `const US = {${usVals.join(",")}};`;
    code = `(function() {\n${api}\n${GM}\n${US}\n${code}\n//# sourceURL=${filename.replace(/\s/g, "-")}\n})();`;
    if (scope !== "content") {
        const tag = document.createElement("script");
        tag.textContent = code;
        document.head.appendChild(tag);
    } else {
        eval(code);
    }
}

function processJS(filename, code, scope, timing, grants, fallback) {
    // this is about to get ugly
    if (timing === "document-start") {
        if (document.readyState === "loading") {
            document.addEventListener("readystatechange", function() {
                if (document.readyState === "interactive") {
                    injectJS(filename, code, scope, timing, grants, fallback);
                }
            });
        } else {
            injectJS(filename, code, scope, timing, grants, fallback);
        }
    } else if (timing === "document-end") {
        if (document.readyState !== "loading") {
            injectJS(filename, code, scope, timing, grants, fallback);
        } else {
            document.addEventListener("DOMContentLoaded", function() {
                injectJS(filename, code, scope, timing, grants, fallback);
            });
        }
    } else if (timing === "document-idle") {
        if (document.readyState === "complete") {
            injectJS(filename, code, scope, timing, grants, fallback);
        } else {
            document.addEventListener("readystatechange", function(e) {
                if (document.readyState === "complete") {
                    injectJS(filename, code, scope, timing, grants, fallback);
                }
            });
        }
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
                // context menu scripts will be handled in event listener below
                if (scope === "context-menu") continue;
                // get the nested scoped objects, separated by timing
                const scopeObject = codeTypeObject[scope];
                // possible execution timings
                const timings = ["document-start", "document-end", "document-idle"];
                timings.forEach(timing => {
                    // get the nested timing objects, separated by filename, skip if empty
                    const timingObject = scopeObject[timing];
                    if (Object.keys(timingObject).length !== 0) {
                        sorted = sortByWeight(timingObject);
                        for (const filename in sorted) {
                            const code = sorted[filename].code;
                            const grants = sorted[filename].scriptObject.grants;
                            // when block by csp rules, auto scope script will auto retry injection
                            if (fallback) {
                                console.warn(`Attempting fallback injection for ${filename}`);
                                scope = "content";
                            }
                            processJS(filename, code, scope, timing, grants, fallback);
                        }
                    }
                });
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
        if (data && Object.keys(data.js.auto).length !== 0 && cspFallbackAttempted < 1) {
            const n = {"js": {"auto": {}}};
            n.js.auto = data.js.auto;
            parseCode(n, true);
        }
        cspFallbackAttempted = 1;
    }
}

async function processJSContextMenuItems() {
    // if not top window, stop execution
    if (window !== window.top) return;
    // context menu injection is macOS exclusive
    // check if platform is stored
    if (!platform) {
        const response = await browser.runtime.sendMessage({name: "REQ_PLATFORM"});
        if (response.error) console.error(response.error);
        if (response.platform) platform = response.platform;
    }
    // if not macOS, stop execution
    if (platform !== "macos") return;
    const contextMenuCodeObject = data.js["context-menu"];
    for (const scope in contextMenuCodeObject) {
        const scopeObject = contextMenuCodeObject[scope];
        for (const filename in scopeObject) {
            const name = scopeObject[filename].scriptObject.name;
            if (document.readyState === "complete") {
                addContextMenuItem(filename, name);
            } else {
                window.addEventListener("load", () => {
                    addContextMenuItem(filename, name);
                });
            }
        }
    }
}

function addContextMenuItem(filename, name) {
    // when context menu item found, create a unique menuItemId and clean name
    // the menuItemId will be passed back and forth between content and background
    // for that reason use the current url + filename for the menuItemId
    // when this file gets an run request, which file to run can be parsed from the menuItemId
    // construct url from window.location since url params in href can break match pattern
    // run on window load since urls can change during the load process

    // potential bug? https://developer.apple.com/forums/thread/685273
    // https://stackoverflow.com/q/68431201
    let pathname = window.location.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    const url = window.location.protocol + "//" + window.location.hostname + pathname;

    const menuItemId = url + "&$&" + filename;
    const message = {name: "CONTEXT_CREATE", menuItemId: menuItemId, title: name, url: url};
    browser.runtime.sendMessage(message, response => {
        // avoid adding unnecessary event listeners
        if (!beforeunload) {
            window.addEventListener("beforeunload", () => {
                // beforeunload doesn't always fire on page refresh?
                // OK since we wouldn't want to remove the context menu items when that happens
                // BAD for when user disabled a context-menu script then refreshes...
                // b/c of this all context menu items for a url will be removed/remade on refresh
                browser.runtime.sendMessage({name: "CONTEXT_REMOVE", menuItemId: menuItemId});
            });
            beforeunload = 1;
        }
    });
}

// api - https://developer.chrome.com/docs/extensions/mv3/content_scripts/#host-page-communication
function us_openInTab(url, openInBackground) {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_OPEN_TAB") return;
            resolve(e.data.response);
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        const active = (openInBackground === true) ? false : true;
        window.postMessage({id: uid, pid: pid, name: "API_OPEN_TAB", url: url, active: active});
    });
}

function us_closeTab(tabId) {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_CLOSE_TAB") return;
            resolve(e.data.response);
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        window.postMessage({id: uid, pid: pid, name: "API_CLOSE_TAB", tabId: tabId});
    });
}

function us_setValue(key, value) {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_SET_VALUE" || e.data.filename !== filename) return;
            resolve(e.data.response);
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
        window.postMessage({id: uid, pid: pid, name: "API_SET_VALUE", filename: filename, key: key, value: value});
    });
}

function us_getValue(key, defaultValue) {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_GET_VALUE" || e.data.filename !== filename) return;
            const response = e.data.response;
            resolve(response);
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
        window.postMessage({id: uid, pid: pid, name: "API_GET_VALUE", filename: filename, key: key, defaultValue: defaultValue});
    });
}

function us_listValues() {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_LIST_VALUES" || e.data.filename !== filename) return;
            resolve(e.data.response);
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
        window.postMessage({id: uid, pid: pid, name: "API_LIST_VALUES", filename: filename});
    });
}

function us_deleteValue(key) {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_DELETE_VALUE" || e.data.filename !== filename) return;
            resolve(e.data.response);
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        // eslint-disable-next-line no-undef -- filename var accessible to the function at runtime
        window.postMessage({id: uid, pid: pid, name: "API_DELETE_VALUE", filename: filename, key: key});
    });
}

function us_addStyleSync(css) {
    window.postMessage({id: uid, name: "API_ADD_STYLE_SYNC", css: css});
    return css;
}

function us_addStyle(css) {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_ADD_STYLE") return;
            resolve(e.data.response);
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        window.postMessage({id: uid, pid: pid, name: "API_ADD_STYLE", css: css});
    });
}

function us_setClipboard(data, type) {
    const pid = Math.random().toString(36).substring(1, 9);
    return new Promise(resolve => {
        const callback = e => {
            if (e.data.pid !== pid || e.data.id !== uid || e.data.name !== "RESP_SET_CLIPBOARD") return;
            resolve(e.data.response);
            if (!e.data.response) console.error("clipboard write failed");
            window.removeEventListener("message", callback);
        };
        window.addEventListener("message", callback);
        window.postMessage({id: uid, pid: pid, name: "API_SET_CLIPBOARD", data: data, type: type});
    });
}

function us_getInfo() {
    // eslint-disable-next-line no-undef -- us_info var accessible to the function at runtime
    return us_info.info;
}

function us_setClipboardSync(data, type) {
    // there's actually no sync method since a promise needs to be sent to bg page
    // however make a dummy sync method for compatibility
    window.postMessage({id: uid, name: "API_SET_CLIPBOARD", data: data, type: type});
    return undefined;
}

// when xhr is called it sends a message to the content script
// and adds it's own event listener to get responses from content script
// each xhr has a unique id so it won't respond to different xhr
// the content script sends the xhr details to the background script
// the background script sends messages back to the content script for all xhr events
// the content script relays these messages back to the context where xhr was called
// if xhr was called with event handler functions they will be executed when those relays come in
function xhr(details) {
    // if details didn't include url, do nothing
    if (!details.url) return;
    // create unique id for the xhr
    const xhrId = Math.random().toString(36).substring(1, 9);
    // strip out functions from details, kind of hacky
    const detailsParsed = JSON.parse(JSON.stringify(details));
    // check which functions are included in the original details object
    // add a bool to indicate if event listeners should be attached
    if (details.onabort) detailsParsed.onabort = true;
    if (details.onerror) detailsParsed.onerror = true;
    if (details.onload) detailsParsed.onload = true;
    if (details.onloadend) detailsParsed.onloadend = true;
    if (details.onloadstart) detailsParsed.onloadstart = true;
    if (details.onprogress) detailsParsed.onprogress = true;
    if (details.onreadystatechange) detailsParsed.onreadystatechange = true;
    if (details.ontimeout) detailsParsed.ontimeout = true;
    // abort function gets returned when this function is called
    const abort = () => {
        window.postMessage({id: uid, name: "API_XHR_ABORT_INJ", xhrId: xhrId});
    };
    const callback = e => {
        const name = e.data.name;
        const response = e.data.response;
        // ensure callback is responding to the proper message
        if (
            e.data.id !== uid
            || e.data.xhrId !== xhrId
            || !name
            || !name.startsWith("RESP_API_XHR_CS")
        ) return;
        if (name === "RESP_API_XHR_CS") {
            // ignore
        } else if (name.includes("ABORT") && details.onabort) {
            details.onabort(response);
        } else if (name.includes("ERROR") && details.onerror) {
            details.onerror(response);
        } else if (name === "RESP_API_XHR_CS_LOAD" && details.onload) {
            details.onload(response);
        } else if (name.includes("LOADEND") && details.onloadend) {
            details.onloadend(response);
            // remove event listener when xhr is complete
            window.removeEventListener("message", callback);
        } else if (name.includes("LOADSTART") && details.onloadstart) {
            details.onloadtstart(response);
        } else if (name.includes("PROGRESS") && details.onprogress) {
            details.onprogress(response);
        } else if (name.includes("READYSTATECHANGE") && details.onreadystatechange) {
            details.onreadystatechange(response);
        } else if (name.includes("TIMEOUT") && details.ontimeout) {
            details.ontimeout(response);
        }
    };
    window.addEventListener("message", callback);
    window.postMessage({id: uid, name: "API_XHR_INJ", details: detailsParsed, xhrId: xhrId});
    return {abort: abort};
}

// listen for messages from background, popup, etc...
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const name = request.name;
    if (name === "CONTEXT_RUN") {
        // only run context menu script in top window
        if (window !== window.top) return;
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
                    const grants = contextMenuCodeObject[scope][filename].scriptObject.grants;
                    // if strict csp already detected change auto scoped scripts to content
                    let fallback = false;
                    if (cspFallbackAttempted && scope === "auto") {
                        console.warn(`Attempting fallback injection for ${filename}`);
                        scope = "content";
                        fallback = true;
                    }
                    scope = cspFallbackAttempted && scope === "auto" ? "content" : scope;
                    injectJS(filename, code, scope, "context-menu", grants, fallback);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
    } else if (name.startsWith("RESP_API_XHR_BG_")) {
        // only respond to messages on the correct content script
        if (request.id !== uid) return;
        const resp = request.response;
        const n = name.replace("_BG_", "_CS_");
        // arraybuffer responses had their data converted, convert it back to arraybuffer
        if (request.response.responseType === "arraybuffer" && resp.response) {
            try {
                const r =  new Uint8Array(resp.response).buffer;
                resp.response = r;
            } catch (error) {
                console.error("error parsing xhr arraybuffer response", error);
            }
        // blob responses had their data converted, convert it back to blob
        } else if (request.response.responseType === "blob" && resp.response && resp.response.data) {
            fetch(request.response.response.data)
                .then(res => res.blob())
                .then(b => {
                    resp.response = b;
                    window.postMessage({name: n, response: resp, id: request.id, xhrId: request.xhrId});
                });
        }
        // blob response will execute its own postMessage call
        if (request.response.responseType !== "blob") {
            window.postMessage({name: n, response: resp, id: request.id, xhrId: request.xhrId});
        }
    } else if (["USERSCRIPT_INSTALL_00", "USERSCRIPT_INSTALL_01", "USERSCRIPT_INSTALL_02"].includes(name)) {
        const types = [
            "text/plain",
            "application/ecmascript",
            "application/javascript",
            "text/ecmascript",
            "text/javascript"
        ];
        if (!document.contentType || types.indexOf(document.contentType) === -1) {
            // only allow installation if contentType is in list above
            sendResponse({invalid: true});
        } else {
            const content = document.body.innerText;
            browser.runtime.sendMessage({name: name, content: content}, response => {
                sendResponse(response);
            });
            return true;
        }
    }
});

// listen for message from api
window.addEventListener("message", e => {
    // only respond to messages that have matching unique id and have a name value
    if (e.data.id !== uid || !e.data.name) return;
    const id = e.data.id;
    const name = e.data.name;
    const pid = e.data.pid;
    let message;
    if (name === "API_OPEN_TAB") {
        // ignore requests that don't supply a url
        if (!e.data.url) return;
        message = {name: "API_OPEN_TAB", url: e.data.url, active: e.data.active};
        browser.runtime.sendMessage(message, response => {
            window.postMessage({id: id, pid: pid, name: "RESP_OPEN_TAB", response: response});
        });
    } else if (name === "API_CLOSE_TAB") {
        browser.runtime.sendMessage({name: "API_CLOSE_TAB", tabId: e.data.tabId}, response => {
            window.postMessage({id: id, pid: pid, name: "RESP_CLOSE_TAB", response: response});
        });
    } else if (name === "API_SET_CLIPBOARD") {
        browser.runtime.sendMessage({name: "API_SET_CLIPBOARD", data: e.data.data, type: e.data.type}, response => {
            window.postMessage({id: id, pid: pid, name: "RESP_SET_CLIPBOARD", response: response});
        });
    } else if (name === "API_SET_VALUE") {
        message = {name: "API_SET_VALUE", filename: e.data.filename, key: e.data.key, value: e.data.value};
        browser.runtime.sendMessage(message, response => {
            window.postMessage({id: id, pid: pid, name: "RESP_SET_VALUE", filename: e.data.filename, response: response});
        });
    } else if (name === "API_GET_VALUE") {
        message = {name: "API_GET_VALUE", filename: e.data.filename, pid: pid, key: e.data.key, defaultValue: e.data.defaultValue};
        browser.runtime.sendMessage(message, response => {
            const resp =  response === `undefined--${pid}` ? undefined : response;
            window.postMessage({id: id, pid: pid, name: "RESP_GET_VALUE", filename: e.data.filename, response: resp});
        });
    } else if (name === "API_DELETE_VALUE") {
        message = {name: "API_DELETE_VALUE", filename: e.data.filename, key: e.data.key};
        browser.runtime.sendMessage(message, response => {
            window.postMessage({id: id, pid: pid, name: "RESP_DELETE_VALUE", filename: e.data.filename, response: response});
        });
    } else if (name === "API_LIST_VALUES") {
        message = {name: "API_LIST_VALUES", filename: e.data.filename};
        browser.runtime.sendMessage(message, response => {
            window.postMessage({id: id, pid: pid, name: "RESP_LIST_VALUES", filename: e.data.filename, response: response});
        });
    } else if (name === "API_ADD_STYLE") {
        try {
            message = {name: "API_ADD_STYLE", css: e.data.css};
            browser.runtime.sendMessage(message, response => {
                window.postMessage({id: id, pid: pid, name: "RESP_ADD_STYLE", response: response});
            });
        } catch (e) {
            console.log(e);
        }
    } else if (name === "API_ADD_STYLE_SYNC") {
        try {
            message = {name: "API_ADD_STYLE_SYNC", css: e.data.css};
            browser.runtime.sendMessage(message);
        } catch (e) {
            console.log(e);
        }
    } else if (name === "API_XHR_INJ") {
        message = {name: "API_XHR_CS", details: e.data.details, id: id, xhrId: e.data.xhrId};
        browser.runtime.sendMessage(message, response => {
            window.postMessage({id: id, name: "RESP_API_XHR_CS", response: response, xhrId: e.data.xhrId});
        });
    } else if (name === "API_XHR_ABORT_INJ") {
        message = {name: "API_XHR_ABORT_CS", xhrId: e.data.xhrId};
        browser.runtime.sendMessage(message);
    }
});

// when userscript fails due to a CSP and has @inject-into value of auto
document.addEventListener("securitypolicyviolation", cspFallback);
// create context menu items as needed
document.addEventListener("contextmenu", processJSContextMenuItems);
