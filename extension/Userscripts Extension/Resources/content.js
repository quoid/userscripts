// store code received
let data;
// instance unique id
const uid = Math.random().toString(36).substring(2, 8);
// determines whether strict csp injection has already run (JS only)
let cspFallbackAttempted = false;

// request code as soon as possible
browser.runtime.sendMessage({name: "REQ_USERSCRIPTS", uid: uid}, response => {
    if (!response) {
        console.error("REQ_USERSCRIPTS returned undefined");
        return;
    }
    if (response.error) {
        console.error(response.error);
        return;
    }
    // save response locally in case CSP events occur
    data = response;
    for (let i = 0; i < data.files.js.length; i++) {
        const userscript = data.files.js[i];
        if (
            userscript.scriptObject?.grants?.length >= 1
            && (
                userscript.scriptObject["inject-into"] === "auto"
                || userscript.scriptObject["inject-into"] === "page"
            )
        ) {
            userscript.scriptObject["inject-into"] = "content";
            console.warn(`${userscript.scriptObject.filename} had it's @inject-value automatically set to "content" because it has @grant values - see: https://github.com/quoid/userscripts/issues/252#issuecomment-1136637700`);
        }
        // log warning if provided
        if (userscript.warning) console.warn(userscript.warning);
        processJS(
            userscript.scriptObject.name,
            userscript.scriptObject.filename,
            userscript.code,
            userscript.scriptObject["inject-into"],
            userscript.scriptObject["run-at"],
            false
        );
    }
    for (let i = 0; i < data.files.css.length; i++) {
        const userstyle = data.files.css[i];
        injectCSS(userstyle.name, userstyle.code);
    }
});

function processJS(name, filename, code, scope, timing, fallback) {
    switch (timing) {
        case "document-start":
            injectJS(name, filename, code, scope, fallback);
            break;
        case "document-end":
            if (document.readyState !== "loading") {
                injectJS(name, filename, code, scope, fallback);
            } else {
                document.addEventListener("DOMContentLoaded", function() {
                    injectJS(name, filename, code, scope, fallback);
                });
            }
            break;
        case "document-idle":
            if (document.readyState === "complete") {
                injectJS(name, filename, code, scope, fallback);
            } else {
                document.addEventListener("readystatechange", e => {
                    if (document.readyState === "complete") {
                        injectJS(name, filename, code, scope, fallback);
                    }
                });
            }
            break;
    }
}

function injectJS(name, filename, code, scope, fallback) {
    code = `(function() {${code}\n//# sourceURL=${filename.replace(/\s/g, "-")}\n})();`;
    // if fallback or cspFallbackAttempted true and scope is auto, change scope to content
    if (scope === "auto" && (fallback || cspFallbackAttempted)) {
        scope = "content";
        console.warn(`Attempting fallback injection for ${name}`);
    } else {
        console.info(`Injecting ${name} %c(js)`, "color: #fff600");
    }
    if (scope !== "content") {
        const tag = document.createElement("script");
        tag.textContent = code;
        document.head.appendChild(tag);
    } else {
        try {
            return Function(code)();
        } catch (error) {
            console.error(`${filename} error`, error);
        }
    }
}

function injectCSS(name, code) {
    console.info(`Injecting ${name} %c(css)`, "color: #60f36c");
    // Safari lacks full support for tabs.insertCSS
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/insertCSS
    // specifically frameId and cssOrigin
    // if support for those details keys arrives, the method below can be used
    // NOTE: manifest V3 does support frameId, but not origin
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/insertCSS

    // browser.runtime.sendMessage({name: "API_ADD_STYLE_SYNC", css: code});

    // write the css code to head of the document
    let wrapper = "const tag = document.createElement(\"style\");\n";
    wrapper += `tag.textContent = \`${code}\`;`;
    wrapper += "\ndocument.head.appendChild(tag);";
    // eval the code directly into the context of the content script (not page context)
    // wrapper += "console.log(window.browser)"; // this validates the execution env
    eval(wrapper);
}

function cspFallback(e) {
    // if a security policy violation event has occurred, and the directive is script-src
    // it's fair to assume that there is a strict CSP for scripts
    // if there's a strict CSP for scripts, it's unlikely this extension uri is whitelisted
    // when any script-src violation is detected, re-attempt injection
    // since it's fair to assume injection was blocked for all userscripts
    if (e.effectiveDirective === "script-src") {
        // get all "auto" code
        // since other code can trigger a security policy violation event
        // make sure data var is not undefined before attempting fallback
        if (!data || cspFallbackAttempted) return;
        // update global that tracks security policy violations
        cspFallbackAttempted = true;
        // loop through all js files if they are @inject-into: auto, attempt re-injection
        for (let i = 0; i < data.files.js.length; i++) {
            const userscript = data.files.js[i];
            if (userscript.scriptObject["inject-into"] !== "auto") continue;
            processJS(
                userscript.scriptObject.name,
                userscript.scriptObject.filename,
                userscript.code,
                userscript.scriptObject["inject-into"],
                userscript.scriptObject["run-at"],
                true
            );
        }
    }
}

function handleApiMessages(e) {
    // only respond to messages with matching unique id and have a name value
    if (e.data.id !== uid || !e.data.name) return;
    const id = e.data.id;
    const name = e.data.name;
    const pid = e.data.pid;
    let message;
    const respMessage = {name: name.replace("API_", "RESP_"), id: id, pid: pid};
    switch (name) {
        case "API_OPEN_TAB":
            message = {name: name, url: e.data.url, active: e.data.active};
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                window.postMessage(respMessage);
            });
            break;
        case "API_CLOSE_TAB":
            message = {name: name, tabId: e.data.tabId};
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                window.postMessage(respMessage);
            });
            break;
        case "API_SET_CLIPBOARD":
            message = {name: name, data: e.data.data, type: e.data.type};
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                window.postMessage(respMessage);
            });
            break;
        case "API_SET_VALUE":
            message = {
                name: name,
                filename: e.data.filename,
                key: e.data.key,
                value: e.data.value
            };
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                respMessage.filename = e.data.filename;
                window.postMessage(respMessage);
            });
            break;
        case "API_GET_VALUE":
            message = {
                name: name,
                filename: e.data.filename,
                pid: pid,
                key: e.data.key,
                defaultValue: e.data.defaultValue
            };
            browser.runtime.sendMessage(message, response => {
                const undef = response === `undefined--${pid}`;
                respMessage.response = undef ? undefined : response;
                respMessage.filename = e.data.filename;
                window.postMessage(respMessage);
            });
            break;
        case "API_DELETE_VALUE":
            message = {name: name, filename: e.data.filename, key: e.data.key};
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                respMessage.filename = e.data.filename;
                window.postMessage(respMessage);
            });
            break;
        case "API_LIST_VALUES":
            message = {name: name, filename: e.data.filename};
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                respMessage.filename = e.data.filename;
                window.postMessage(respMessage);
            });
            break;
        case "API_ADD_STYLE":
            message = {name: name, css: e.data.css};
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                window.postMessage(respMessage);
            });
            break;
        case "API_ADD_STYLE_SYNC":
            message = {name: name, css: e.data.css};
            browser.runtime.sendMessage(message);
            break;
        case "API_XHR_INJ":
            message = {
                name: "API_XHR_CS",
                details: e.data.details,
                id: id,
                xhrId: e.data.xhrId
            };
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                respMessage.xhrId = e.data.xhrId;
                window.postMessage(respMessage);
            });
            break;
        case "API_GET_TAB":
            message = {
                name: name,
                filename: e.data.filename,
                pid: pid
            };
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                respMessage.filename = e.data.filename;
                window.postMessage(respMessage);
            });
            break;
        case "API_SAVE_TAB":
            message = {
                name: name,
                filename: e.data.filename,
                pid: pid,
                tab: e.data.tab
            };
            browser.runtime.sendMessage(message, response => {
                respMessage.response = response;
                respMessage.filename = e.data.filename;
                window.postMessage(respMessage);
            });
            break;
        case "API_XHR_ABORT_INJ":
            message = {name: "API_XHR_ABORT_CS", xhrId: e.data.xhrId};
            browser.runtime.sendMessage(message);
            break;
    }
}

// listens for messages from background, popup, etc...
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const name = request.name;
    if (name.startsWith("RESP_API_XHR_BG_")) {
        // only respond to messages on the correct content script
        if (request.id !== uid) return;
        const xhrResponse = request.response;
        const responseName = name.replace("_BG_", "_CS_");
        // arraybuffer responses had their data converted, convert it back to arraybuffer
        if (xhrResponse.responseType === "arraybuffer" && xhrResponse.response) {
            try {
                const buffer = new Uint8Array(xhrResponse.response).buffer;
                xhrResponse.response = buffer;
            } catch (error) {
                console.error("error parsing xhr arraybuffer response", error);
            }
        // blob responses had their data converted, convert it back to blob
        } else if (
            request.response.responseType === "blob"
            && xhrResponse.response
            && xhrResponse.response.data
        ) {
            fetch(request.response.response.data)
                .then(res => res.blob())
                .then(b => {
                    xhrResponse.response = b;
                    window.postMessage({
                        name: responseName,
                        response: xhrResponse,
                        id: request.id,
                        xhrId: request.xhrId
                    });
                });
        }
        // blob response will execute its own postMessage call
        if (request.response.responseType !== "blob") {
            window.postMessage({
                name: responseName,
                response: xhrResponse,
                id: request.id, xhrId:
                request.xhrId
            });
        }
    } else if (
        name === "USERSCRIPT_INSTALL_00"
        || name === "USERSCRIPT_INSTALL_01"
        || name === "USERSCRIPT_INSTALL_02"
    ) {
        // only response to top frame messages
        if (window !== window.top) return;
        const types = [
            "text/plain",
            "application/ecmascript",
            "application/javascript",
            "text/ecmascript",
            "text/javascript"
        ];
        if (
            !document.contentType
            || types.indexOf(document.contentType) === -1
            || !document.querySelector("pre")
        ) {
            sendResponse({invalid: true});
        } else {
            const message = {name: name, content: document.querySelector("pre").innerText};
            browser.runtime.sendMessage(message, response => {
                sendResponse(response);
            });
            return true;
        }
    } else if (name === "CONTEXT_RUN") {
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
                sendResponse({code: item.code});
                return;
            }
        }
        console.error(`Couldn't find ${filename} code!`);
    }
});

// listens for messages from api methods calls in content script or current page
window.addEventListener("message", handleApiMessages);
// when userscript fails due to a CSP and has @inject-into value of auto or page
document.addEventListener("securitypolicyviolation", cspFallback);
