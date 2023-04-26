// code received from background page will be stored in this variable
// code referenced again when strict CSPs block initial injection attempt
let data;
// determines whether strict csp injection has already run (JS only)
let cspFallbackAttempted = false;
// save reference to window's browser object
const browser = window.browser;
// GM APIs
const apis = {
    closeTab(tabId) {
        return new Promise(resolve => {
            const message = {
                name: "API_CLOSE_TAB",
                tabId
            };
            browser.runtime.sendMessage(message, response => resolve(response));
        });
    },
    openInTab(url, openInBackground = false) {
        if (!url) return console.error("openInTab missing url arg");
        return new Promise(resolve => {
            const message = {
                name: "API_OPEN_TAB",
                url,
                active: !openInBackground
            };
            browser.runtime.sendMessage(message, response => resolve(response));
        });
    },
    setValue(key, value) {
        if (typeof key !== "string" || !key.length) {
            return console.error("setValue invalid key arg");
        }
        if (value == null) {
            return console.error("setValue invalid value arg");
        }
        return new Promise(resolve => {
            const item = {};
            item[`${this.US_filename}---${key}`] = value;
            browser.storage.local.set(item, () => resolve({success: 1}));
        });
    },
    getValue(key, defaultValue) {
        if (typeof key !== "string" || !key.length) {
            return console.error("getValue invalid key arg");
        }
        const prefixedKey = `${this.US_filename}---${key}`;
        return new Promise(resolve => {
            browser.storage.local.get(prefixedKey, item => {
                if (Object.keys(item).length === 0) {
                    if (defaultValue != null) {
                        resolve(defaultValue);
                    } else {
                        resolve(undefined);
                    }
                } else {
                    resolve(Object.values(item)[0]);
                }
            });
        });
    },
    deleteValue(key) {
        if (typeof key !== "string" || !key.length) {
            return console.error("deleteValue missing key arg");
        }
        return new Promise(resolve => {
            const prefixedKey = `${this.US_filename}---${key}`;
            browser.storage.local.remove(prefixedKey, () => {
                resolve({success: 1});
            });
        });
    },
    listValues() {
        return new Promise(resolve => {
            const prefix = `${this.US_filename}---`;
            const keys = [];
            browser.storage.local.get().then(items => {
                for (const key in items) {
                    if (key.startsWith(prefix)) {
                        const k = key.replace(prefix, "");
                        keys.push(k);
                    }
                }
                resolve(keys);
            });
        });
    },
    addStyle(css) {
        if (typeof css !== "string") {
            return console.error("addStyle invalid css arg");
        }
        return new Promise(resolve => {
            const message = {
                name: "API_ADD_STYLE",
                css
            };
            browser.runtime.sendMessage(message, response => resolve(response));
        });
    },
    getTab() {
        return new Promise(resolve => {
            const message = {name: "API_GET_TAB"};
            browser.runtime.sendMessage(message, response => {
                resolve(response);
            });
        });
    },
    saveTab(tab) {
        if (tab == null) return console.error("saveTab invalid arg");
        return new Promise(resolve => {
            const message = {
                name: "API_SAVE_TAB",
                tab
            };
            browser.runtime.sendMessage(message, response => {
                resolve(response);
            });
        });
    },
    setClipboard(clipboardData, type) {
        return new Promise(resolve => {
            const message = {
                name: "API_SET_CLIPBOARD",
                clipboardData,
                type
            };
            browser.runtime.sendMessage(message, response => {
                resolve(response);
            });
        });
    },
    xhr(details) {
        if (details == null) return console.error("xhr invalid details arg");
        if (!details.url) return console.error("xhr details missing url key");
        // generate random port name for single xhr
        const xhrPortName = Math.random().toString(36).substring(1, 9);
        // strip out functions from details
        const detailsParsed = JSON.parse(JSON.stringify(details));
        // get all the "on" events from XMLHttpRequest object
        const events = [];
        for (const k in XMLHttpRequest.prototype) {
            if (k.slice(0, 2) === "on") events.push(k);
        }
        // check which functions are included in the original details object
        // add a bool to indicate if event listeners should be attached
        for (const e of events) {
            if (typeof details[e] === "function") detailsParsed[e] = true;
        }
        // define return method, will be populated after port is established
        const response = {
            abort: () => console.error("xhr has not yet been initialized")
        };
        // port listener, most of the messaging logic goes here
        const listener = port => {
            if (port.name !== xhrPortName) return;
            port.onMessage.addListener(async msg => {
                if (
                    events.includes(msg.name)
                    && typeof details[msg.name] === "function"
                ) {
                    // process xhr response
                    const r = msg.response;
                    if (r.responseType === "arraybuffer") {
                        // arraybuffer responses had their data converted in background
                        // convert it back to arraybuffer
                        try {
                            const buffer = new Uint8Array(r.response).buffer;
                            r.response = buffer;
                        } catch (err) {
                            console.error("error parsing xhr arraybuffer", err);
                        }
                    } else if (r.responseType === "blob" && r.response.data) {
                        // blob responses had their data converted in background
                        // convert it back to blob
                        const resp = await fetch(r.response.data);
                        const b = await resp.blob();
                        r.response = b;
                    }
                    // call userscript method
                    details[msg.name](msg.response);
                    // all messages received
                    // tell background it's safe to close port
                    if (msg.name === "onloadend") {
                        port.postMessage({name: "DISCONNECT"});
                    }
                }
            });

            // handle port disconnect and clean tasks
            port.onDisconnect.addListener(p => {
                if (p.error) {
                    console.error(`port disconnected due to an error: ${p.error.message}`);
                }
                browser.runtime.onConnect.removeListener(listener);
            });
            // fill the method returned to the user script
            response.abort = () => port.postMessage({name: "ABORT"});
        };
        // wait for the background to establish a port connection
        browser.runtime.onConnect.addListener(listener);
        // pass the basic information to the background through a common message
        const message = {
            name: "API_XHR",
            details: detailsParsed,
            xhrPortName,
            events
        };
        browser.runtime.sendMessage(message);
        return response;
    },
    // include method names so they don't get skipped when adding to userscript
    xmlHttpRequest: true,
    GM_xmlhttpRequest: true
};
// remote window's browser object
delete window.browser;

// label used to distinguish frames in console
const label = randomLabel();

function randomLabel() {
    const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", r = Math.random();
    return a[Math.floor(r * a.length)] + r.toString().slice(5, 6);
}

function processJS(userscript) {
    const runAt = userscript.scriptObject["run-at"];
    if (runAt === "document-start") {
        injectJS(userscript);
    } else if (runAt === "document-end") {
        if (document.readyState !== "loading") {
            injectJS(userscript);
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                injectJS(userscript);
            });
        }
    } else if (runAt === "document-idle") {
        if (document.readyState === "complete") {
            injectJS(userscript);
        } else {
            document.addEventListener("readystatechange", () => {
                if (document.readyState === "complete") {
                    injectJS(userscript);
                }
            });
        }
    }
}

function wrapCode(preCode, code, filename) {
    const tag = window.self === window.top ? "" : `(${label})`;
    return `
        (function() {
            ${preCode}
            (function() {
                const US_filename = "${filename}";
                const apis = undefined;
                const browser = undefined;
                // userscript code below
                ${code}
                //# sourceURL=${filename.replace(/\s/g, "-") + tag}
            })();
        })();
    `;
}

function injectJS(userscript) {
    const filename = userscript.scriptObject.filename;
    const code = wrapCode(userscript.preCode, userscript.code, filename);
    const name = userscript.scriptObject.name;
    let injectInto = userscript.scriptObject["inject-into"];
    // change scope to content since strict CSP event detected
    if (injectInto === "auto" && (userscript.fallback || cspFallbackAttempted)) {
        injectInto = "content";
        console.warn(`Attempting fallback injection for ${name}`);
    } else if (window.self === window.top) {
        console.info(`Injecting ${name} %c(js)`, "color: #fff600");
    } else {
        console.info(`Injecting ${name} %c(js)%c - %cframe(${label})(${window.location})`, "color: #fff600", "color: inherit", "color: #006fff");
    }
    if (injectInto !== "content") {
        const tag = document.createElement("script");
        tag.textContent = code;
        document.head.appendChild(tag);
    } else {
        try {
            // eslint-disable-next-line no-new-func
            return Function(code)();
        } catch (error) {
            console.error(`${filename} error`, error);
        }
    }
}

function injectCSS(name, code) {
    if (window.self === window.top) {
        console.info(`Injecting ${name} %c(css)`, "color: #60f36c");
    } else {
        console.info(`Injecting ${name} %c(css)%c - %cframe(${label})(${window.location})`, "color: #60f36c", "color: inherit", "color: #006fff");
    }
    // Safari lacks full support for tabs.insertCSS
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/insertCSS
    // specifically frameId and cssOrigin
    // if support for those details keys arrives, the method below can be used
    // NOTE: manifest V3 does support frameId, but not origin
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/insertCSS

    // write the css code to head of the document
    const tag = document.createElement("style");
    tag.textContent = code;
    document.head.appendChild(tag);
}

function cspFallback(e) {
    // if a security policy violation event has occurred
    // and the directive is script-src or script-src-elem
    // it's fair to assume that there is a strict CSP for javascript
    // and that injection was blocked for all userscripts
    // when any script-src violation is detected, re-attempt injection
    if (
        e.effectiveDirective === "script-src"
        || e.effectiveDirective === "script-src-elem"
    ) {
        // get all "auto" code
        // since other code can trigger a security policy violation event
        // make sure data var is not undefined before attempting fallback
        if (!data || cspFallbackAttempted) return;
        // update global that tracks security policy violations
        cspFallbackAttempted = 1;
        // for all userscripts with @inject-into: auto, attempt re-injection
        for (let i = 0; i < data.files.js.length; i++) {
            const userscript = data.files.js[i];
            if (userscript.scriptObject["inject-into"] !== "auto") continue;
            userscript.fallback = 1;
            processJS(userscript);
        }
    }
}

function injection() {
    browser.runtime.sendMessage({name: "REQ_USERSCRIPTS"}, response => {
        // cancel injection if errors detected
        if (!response || response.error) {
            console.error(response?.error || "REQ_USERSCRIPTS returned undefined");
            return;
        }
        // save response locally in case CSP events occur
        data = response;
        // combine regular and context-menu scripts
        const scripts = [...data.files.js, ...data.files.menu];
        // loop through each userscript and prepare for processing
        for (let i = 0; i < scripts.length; i++) {
            const userscript = scripts[i];
            userscript.preCode = "";
            // pass references to the api methods as needed
            const gmMethods = [];
            const filename = userscript.scriptObject.filename;
            const grants = userscript.scriptObject.grant;
            const injectInto = userscript.scriptObject["inject-into"];
            // create GM.info object
            const scriptData = {
                script: userscript.scriptObject,
                scriptHandler: data.scriptHandler,
                scriptHandlerVersion: data.scriptHandlerVersion,
                scriptMetaStr: userscript.scriptMetaStr
            };
            // all userscripts get access to GM.info
            gmMethods.push("info: GM_info");
            // if @grant explicitly set to none, empty grants array
            if (grants.includes("none")) grants.length = 0;
            // @grant values exist for page scoped userscript
            if (grants.length && injectInto === "page") {
                // remove grants
                grants.length = 0;
                // log warning
                console.warn(`${filename} @grant values removed due to @inject-into value: ${injectInto} - https://github.com/quoid/userscripts/issues/265#issuecomment-1213462394`);
            }
            // @grant exist for auto scoped userscript
            if (grants.length && injectInto === "auto") {
                // change scope
                userscript.scriptObject["inject-into"] = "content";
                // log warning
                console.warn(`${filename} @inject-into value set to 'content' due to @grant values: ${grants} - https://github.com/quoid/userscripts/issues/265#issuecomment-1213462394`);
            }
            // loop through each userscript @grant value, add methods as needed
            for (let j = 0; j < grants.length; j++) {
                const grant = grants[j];
                const method = grant.split(".")[1] || grant.split(".")[0];
                // ensure API method exists in apis object
                if (!Object.keys(apis).includes(method)) continue;
                // create the method string to be pushed to methods array
                let methodStr = `${method}: apis.${method}`;
                // add require variables to specific methods
                switch (method) {
                    case "getValue":
                    case "setValue":
                    case "deleteValue":
                    case "listValues":
                        methodStr += `.bind({"US_filename": "${filename}"})`;
                        break;
                    case "info":
                    case "GM_info":
                        continue;
                    case "xmlHttpRequest":
                        gmMethods.push("xmlHttpRequest: apis.xhr");
                        continue;
                    case "GM_xmlhttpRequest":
                        userscript.preCode += "const GM_xmlhttpRequest = apis.xhr;";
                        continue;
                }
                gmMethods.push(methodStr);
            }
            // add GM.info
            userscript.preCode += `const GM_info = ${JSON.stringify(scriptData)};`;
            // add other included GM API methods
            userscript.preCode += `const GM = {${gmMethods.join(",")}};`;
            // process file for injection
            processJS(userscript);
        }
        for (let i = 0; i < data.files.css.length; i++) {
            const userstyle = data.files.css[i];
            injectCSS(userstyle.name, userstyle.code);
        }
    });
}

function listeners() {
    // listens for messages from background, popup, etc...
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const name = request.name;
        if (name === "CONTEXT_RUN") {
            // from bg script when context-menu item is clicked
            // double check to ensure context-menu scripts only run in top windows
            if (window !== window.top) return;

            // loop through context-menu scripts saved to data object and find match
            // if no match found, nothing will execute and error will log
            const filename = request.menuItemId;
            for (let i = 0; i < data.files.menu.length; i++) {
                const item = data.files.menu[i];
                if (item.scriptObject.filename === filename) {
                    console.info(`Injecting ${filename} %c(js)`, "color: #fff600");
                    sendResponse({
                        code: wrapCode(
                            item.preCode,
                            item.code,
                            filename
                        )
                    });
                    return;
                }
            }
            console.error(`Couldn't find ${filename} code!`);
        }
    });
    // listen for CSP violations
    document.addEventListener("securitypolicyviolation", cspFallback);
}

async function initialize() {
    const results = await browser.storage.local.get("US_GLOBAL_ACTIVE");
    if (results?.US_GLOBAL_ACTIVE === false) return console.info("Userscripts off");
    // start the injection process and add the listeners
    injection();
    listeners();
}

initialize();
