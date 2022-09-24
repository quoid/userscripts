// globally scoped vars in a nonpersistent background page is not advised
// however references to active XMLHttpRequests needed to abort requests
// when an xhr is triggered, the bg page will load
// it's probable that while the xhr is active, the bg page will stay loaded
// xhrs are only kept in this array when active, otherwise array is empty
// that means it's ok that this var gets reset when the bg page unloads
let xhrs = [];

/* global US_filename, US_uid */
// filename and uid will be available to functions at runtime
const apis = {
    US_openInTab(url, openInBackground) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (e.data.pid !== pid || e.data.id !== US_uid || e.data.name !== "RESP_OPEN_TAB") return;
                resolve(e.data.response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            const active = (openInBackground === true) ? false : true;
            window.postMessage({id: US_uid, pid: pid, name: "API_OPEN_TAB", url: url, active: active});
        });
    },
    US_closeTab(tabId) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (e.data.pid !== pid || e.data.id !== US_uid || e.data.name !== "RESP_CLOSE_TAB") return;
                resolve(e.data.response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({id: US_uid, pid: pid, name: "API_CLOSE_TAB", tabId: tabId});
        });
    },
    US_setValue(key, value) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (
                    e.data.pid !== pid
                    || e.data.id !== US_uid
                    || e.data.name !== "RESP_SET_VALUE"
                    || e.data.filename !== US_filename
                ) return;
                resolve(e.data.response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({
                id: US_uid,
                pid: pid,
                name: "API_SET_VALUE",
                filename: US_filename,
                key: key,
                value: value
            });
        });
    },
    US_getValue(key, defaultValue) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (
                    e.data.pid !== pid
                    || e.data.id !== US_uid
                    || e.data.name !== "RESP_GET_VALUE"
                    || e.data.filename !== US_filename
                ) return;
                const response = e.data.response;
                resolve(response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({
                id: US_uid,
                pid: pid,
                name: "API_GET_VALUE",
                filename: US_filename,
                key: key,
                defaultValue: defaultValue
            });
        });
    },
    US_listValues() {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (
                    e.data.pid !== pid
                    || e.data.id !== US_uid
                    || e.data.name !== "RESP_LIST_VALUES"
                    || e.data.filename !== US_filename
                ) return;
                resolve(e.data.response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({id: US_uid, pid: pid, name: "API_LIST_VALUES", filename: US_filename});
        });
    },
    US_deleteValue(key) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (
                    e.data.pid !== pid
                    || e.data.id !== US_uid
                    || e.data.name !== "RESP_DELETE_VALUE"
                    || e.data.filename !== US_filename
                ) return;
                resolve(e.data.response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({
                id: US_uid,
                pid: pid,
                name: "API_DELETE_VALUE",
                filename: US_filename,
                key: key
            });
        });
    },
    US_addStyleSync(css) {
        window.postMessage({id: US_uid, name: "API_ADD_STYLE_SYNC", css: css});
        return css;
    },
    US_addStyle(css) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (e.data.pid !== pid || e.data.id !== US_uid || e.data.name !== "RESP_ADD_STYLE") return;
                resolve(e.data.response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({id: US_uid, pid: pid, name: "API_ADD_STYLE", css: css});
        });
    },
    US_setClipboard(data, type) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (e.data.pid !== pid || e.data.id !== US_uid || e.data.name !== "RESP_SET_CLIPBOARD") return;
                resolve(e.data.response);
                if (!e.data.response) console.error("clipboard write failed");
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({id: US_uid, pid: pid, name: "API_SET_CLIPBOARD", data: data, type: type});
        });
    },
    US_setClipboardSync(data, type) {
        // there's actually no sync method since a promise needs to be sent to bg page
        // however make a dummy sync method for compatibility
        window.postMessage({id: US_uid, name: "API_SET_CLIPBOARD", data: data, type: type});
        return undefined;
    },
    US_getTab() {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (
                    e.data.pid !== pid
                    || e.data.id !== US_uid
                    || e.data.name !== "RESP_GET_TAB"
                    || e.data.filename !== US_filename
                ) return;
                const response = e.data.response;
                resolve(response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({
                id: US_uid,
                pid: pid,
                name: "API_GET_TAB",
                filename: US_filename
            });
        });
    },
    US_saveTab(tab) {
        const pid = Math.random().toString(36).substring(1, 9);
        return new Promise(resolve => {
            const callback = e => {
                if (
                    e.data.pid !== pid
                    || e.data.id !== US_uid
                    || e.data.name !== "RESP_SAVE_TAB"
                    || e.data.filename !== US_filename
                ) return;
                const response = e.data.response;
                resolve(response);
                window.removeEventListener("message", callback);
            };
            window.addEventListener("message", callback);
            window.postMessage({
                id: US_uid,
                pid: pid,
                name: "API_SAVE_TAB",
                filename: US_filename,
                tab: tab
            });
        });
    },
    // when xhr is called it sends a message to the content script
    // and adds it's own event listener to get responses from content script
    // each xhr has a unique id so it won't respond to different xhr
    // the content script sends the xhr details to the background script
    // the background script sends messages back to the content script for all xhr events
    // the content script relays these messages back to the context where xhr was called
    // if xhr was called with event handler functions they will be executed when those relays come in
    xhr(details) {
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
            window.postMessage({id: US_uid, name: "API_XHR_ABORT_INJ", xhrId: xhrId});
        };
        const callback = e => {
            const name = e.data.name;
            const response = e.data.response;
            // ensure callback is responding to the proper message
            if (
                e.data.id !== US_uid
                || e.data.xhrId !== xhrId
                || !name
                || !name.startsWith("RESP_API_XHR_CS")
            ) return;
            if (name.includes("LOADEND") && details.onloadend) {
                details.onloadend(response);
                // remove event listener when xhr is complete
                window.removeEventListener("message", callback);
            } else if (name === "RESP_API_XHR_CS_LOAD" && details.onload) {
                details.onload(response);
            } else if (name.includes("PROGRESS") && details.onprogress) {
                details.onprogress(response);
            } else if (name.includes("READYSTATECHANGE") && details.onreadystatechange) {
                details.onreadystatechange(response);
            } else if (name.includes("LOADSTART") && details.onloadstart) {
                details.onloadstart(response);
            } else if (name.includes("ABORT") && details.onabort) {
                details.onabort(response);
            } else if (name.includes("ERROR") && details.onerror) {
                details.onerror(response);
            } else if (name.includes("TIMEOUT") && details.ontimeout) {
                details.ontimeout(response);
            } else if (name === "RESP_API_XHR_CS") {
                // ignore
            }
        };
        window.addEventListener("message", callback);
        window.postMessage({id: US_uid, name: "API_XHR_INJ", details: detailsParsed, xhrId: xhrId});
        return {abort: abort};
    }
};

function xhrMake(request, sender) {
    // XMLHttpRequests are a bit complex and involve multiple messages
    // when a userscript with proper @grant executes an XMLHttpRequest (xhr)
    // from the context of the userscript (page, content script), the xhr function runs
    // a custom message event listener is added to the userscript context and then...
    // a message from the userscript is sent to the content script with the details of the xhr
    // this is because userscript contexts can't directly message bg page
    // further, can't run xhrs from content script due to CORS issues
    // the bg page receives this message, initiates the xhr and attaches the needed event listeners to the xhr
    // when those event listeners fire, messages are sent back to the content script
    // these messages include the details of the xhr
    // when the content script receives these messages, it passes them back to the userscript context
    // all xhrs send a message onloadend which removes the custom event listener in the userscript context

    // get tab id and respond only to the content script that sent message
    const tab = sender.tab.id;
    const details = request.details;
    const method = details.method ? details.method : "GET";
    const user = details.user || null;
    const password = details.password || null;
    let body = details.data || null;
    if (body && details.binary) {
        const len = body.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            arr[i] = body.charCodeAt(i);
        }
        body = new Blob([arr], {type: "text/plain"});
    }
    const xhr = new XMLHttpRequest();
    // push to global scoped array so it can be aborted
    xhrs.push({xhr: xhr, xhrId: request.xhrId});
    xhr.withCredentials = (details.user && details.password);
    xhr.timeout = details.timeout || 0;
    if (details.overrideMimeType) xhr.overrideMimeType(details.overrideMimeType);
    xhrAddListeners(xhr, tab, request.id, request.xhrId, details);
    xhr.open(method, details.url, true, user, password);
    xhr.responseType = details.responseType || "";
    if (details.headers) {
        for (const key in details.headers) {
            const val = details.headers[key];
            xhr.setRequestHeader(key, val);
        }
    }
    xhr.send(body);
    // remove xhr from global scope when completed
    xhr.onloadend = () => xhrs = xhrs.filter(x => x.xhrId !== request.xhrId);
}

function xhrHandleEvent(e, xhr, tab, id, xhrId) {
    const name = `RESP_API_XHR_BG_${e.type.toUpperCase()}`;
    const x = {
        readyState: xhr.readyState,
        response: xhr.response,
        responseHeaders: xhr.getAllResponseHeaders(),
        responseType: xhr.responseType,
        responseURL: xhr.responseURL,
        status: xhr.status,
        statusText: xhr.statusText,
        timeout: xhr.timeout,
        withCredentials: xhr.withCredentials
    };
    // only include responseText when applicable
    if (xhr.responseType === "" || xhr.responseType === "text") {
        x.responseText = xhr.responseText;
    }
    // convert data if response is arraybuffer so sendMessage can pass it
    if (xhr.responseType === "arraybuffer") {
        const arr = Array.from(new Uint8Array(xhr.response));
        x.response = arr;
    }
    // convert data if response is blob so sendMessage can pass it
    if (xhr.responseType === "blob") {
        const reader = new FileReader();
        reader.readAsDataURL(xhr.response);
        reader.onloadend = function() {
            const base64data = reader.result;
            x.response = {
                data: base64data,
                type: xhr.response.type
            };
            browser.tabs.sendMessage(tab, {name: name, id: id, xhrId: xhrId, response: x});
        };
    }
    // blob response will execute its own sendMessage call
    if (xhr.responseType !== "blob") {
        browser.tabs.sendMessage(tab, {name: name, id: id, xhrId: xhrId, response: x});
    }
}

function xhrAddListeners(xhr, tab, id, xhrId, details) {
    if (details.onabort) {
        xhr.addEventListener("abort", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
    if (details.onerror) {
        xhr.addEventListener("error", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
    if (details.onload) {
        xhr.addEventListener("load", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
    if (details.onloadend) {
        xhr.addEventListener("loadend", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
    if (details.onloadstart) {
        xhr.addEventListener("loadstart", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
    if (details.onprogress) {
        xhr.addEventListener("progress", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
    if (details.onreadystatechange) {
        xhr.addEventListener("readystatechange", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
    if (details.ontimeout) {
        xhr.addEventListener("timeout", e => xhrHandleEvent(e, xhr, tab, id, xhrId));
    }
}

function addApis({userscripts, uid, scriptHandler, scriptHandlerVersion}) {
    for (let i = 0; i < userscripts.length; i++) {
        const gmMethods = [];
        const usMethods = [];
        const includedMethods = [];
        const userscript = userscripts[i];
        const filename = userscript.scriptObject.filename;
        const grants = userscript.scriptObject.grant;
        const injectInto = userscript.scriptObject["inject-into"];
        // prepare the api string
        let api = `const US_uid = "${uid}";\nconst US_filename = "${filename}";`;
        // all scripts get access to US_info / GM./GM_info, prepare that object
        const scriptData = {
            "script": userscript.scriptObject,
            "scriptHandler": scriptHandler,
            "scriptHandlerVersion": scriptHandlerVersion,
            "scriptMetaStr": userscript.scriptMetaStr
        };
        api += `\nconst US_info = ${JSON.stringify(scriptData)}`;
        api += "\nconst GM_info = US_info;";
        gmMethods.push("info: US_info");
        // if @grant explicitly set to none, empty grants array
        if (grants.includes("none")) {
            grants.length = 0;
        }
        // @grant exist for page scoped userscript
        if (grants.length && injectInto === "page") {
            // remove grants
            grants.length = 0;
            // provide warning for content script
            userscript.warning = `${filename} @grant values changed due to @inject-into value: ${injectInto} - https://github.com/quoid/userscripts/issues/265#issuecomment-1213462394`;
        }
        // @grant exist for auto scoped userscript
        if (grants.length && injectInto === "auto") {
            // change scope
            userscript.scriptObject["inject-into"] = "content";
            // provide warning for content script
            userscript.warning = `${filename} @inject-into value changed due to @grant values: ${grants} - https://github.com/quoid/userscripts/issues/265#issuecomment-1213462394`;
        }
        // loop through each @grant for the userscript, add methods as needed
        for (let j = 0; j < grants.length; j++) {
            const grant = grants[j];
            switch (grant) {
                case "GM.openInTab":
                    api += `\n${apis.US_openInTab}`;
                    gmMethods.push("openInTab: US_openInTab");
                    break;
                case "US.closeTab":
                    api += `\n${apis.US_closeTab}`;
                    usMethods.push("closeTab: US_closeTab");
                    break;
                case "GM.setValue":
                    api += `\n${apis.US_setValue}`;
                    gmMethods.push("setValue: US_setValue");
                    break;
                case "GM.getValue":
                    api += `\n${apis.US_getValue}`;
                    gmMethods.push("getValue: US_getValue");
                    break;
                case "GM.deleteValue":
                    api += `\n${apis.US_deleteValue}`;
                    gmMethods.push("deleteValue: US_deleteValue");
                    break;
                case "GM.listValues":
                    api += `\n${apis.US_listValues}`;
                    gmMethods.push("listValues: US_listValues");
                    break;
                case "GM_addStyle":
                    api += `\n${apis.US_addStyleSync}`;
                    api += "\nconst GM_addStyle = US_addStyleSync;";
                    break;
                case "GM.addStyle":
                    api += `\n${apis.US_addStyle}`;
                    gmMethods.push("addStyle: US_addStyle");
                    break;
                case "GM.setClipboard":
                    api += `\n${apis.US_setClipboard}`;
                    gmMethods.push("setClipboard: US_setClipboard");
                    break;
                case "GM_setClipboard":
                    api += `\n${apis.US_setClipboardSync}`;
                    api += "\nconst GM_setClipboard = US_setClipboardSync;";
                    break;
                case "GM.getTab":
                    api += `\n${apis.US_getTab}`;
                    gmMethods.push("getTab: US_getTab");
                    break;
                case "GM.saveTab":
                    api += `\n${apis.US_saveTab}`;
                    gmMethods.push("saveTab: US_saveTab");
                    break;
                case "GM_xmlhttpRequest":
                case "GM.xmlHttpRequest":
                    if (!includedMethods.includes("xhr")) {
                        api += `\n${apis.xhr}`;
                        includedMethods.push("xhr");
                    }
                    if (grant === "GM_xmlhttpRequest") {
                        api += "\nconst GM_xmlhttpRequest = xhr;\n";
                    } else {
                        gmMethods.push("xmlHttpRequest: xhr");
                    }
                    break;
            }
        }
        // make the GM api string
        const GM = `const GM = {${gmMethods.join(",")}};`;
        // create US api string
        const US = usMethods.length ? `const US = {${usMethods.join(",")}};` : "";
        // update the final code string
        userscript.code = `${api}\n${GM}\n${US}\n${userscript.code}`;
    }

    // return the updated userscripts
    return userscripts;
}

function setClipboard(data, type = "text/plain") {
    // future enhancement?
    // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
    // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
    const onCopy = e => {
        e.stopImmediatePropagation();
        e.preventDefault();
        e.clipboardData.setData(type, data);
        document.removeEventListener("copy", onCopy, true);
    };

    const textarea = document.createElement("textarea");
    textarea.textContent = "<empty clipboard>";
    document.body.appendChild(textarea);
    textarea.select();
    document.addEventListener("copy", onCopy, true);
    try {
        return document.execCommand("copy");
    } catch (error) {
        console.warn("setClipboard failed", error);
        document.removeEventListener("copy", onCopy, true);
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
}

async function getPlatform() {
    let platform = localStorage.getItem("platform");
    if (!platform) {
        const response = await browser.runtime.sendNativeMessage({name: "REQ_PLATFORM"});
        if (!response.platform) {
            console.error("Failed to get platform");
            return "";
        }
        platform = response.platform;
        localStorage.setItem("platform", platform);
    }
    return platform;
}

async function setBadgeCount() {
    // only set badge on macOS
    const platform = await getPlatform();
    if (platform !== "macos") return;
    const currentTab = await browser.tabs.getCurrent();
    // no active tabs exist (user closed all windows)
    if (!currentTab) return;
    const url = currentTab.url;
    // if url doesn't exist, stop
    if (!url) {
        browser.browserAction.setBadgeText({text: ""});
        return;
    }
    // only check for http/s pages
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        browser.browserAction.setBadgeText({text: ""});
        return;
    }
    const frameUrls = new Set();
    const frames = await browser.webNavigation.getAllFrames({tabId: currentTab.id});
    for (let i = 0; i < frames.length; i++) {
        const frameUrl = frames[i].url;
        if (frameUrl !== url && frameUrl.startsWith("http")) {
            frameUrls.add(frameUrl);
        }
    }
    const message = {name: "POPUP_BADGE_COUNT", url: url, frameUrls: Array.from(frameUrls)};
    browser.runtime.sendNativeMessage(message, response => {
        if (response.error) return console.error(response.error);
        const count = response.count;
        if (count > 0) {
            browser.browserAction.setBadgeText({text: count.toString()});
        } else {
            browser.browserAction.setBadgeText({text: ""});
        }
    });
}

async function getContextMenuItems() {
    // macos exclusive feature
    const platform = await getPlatform();
    if (platform !== "macos") return;
    // since it's not possible to get a list of currently active menu items
    // on update, all context-menu items are clears, then re-added
    // this is done to get fresh code changes to context-menu scripts on certain events
    await browser.menus.removeAll();
    // get the context-menu scripts
    const response = await browser.runtime.sendNativeMessage({name: "REQ_CONTEXT_MENU_SCRIPTS"});
    if (response.error) {
        console.error(response.error);
        return;
    }
    // add menus items
    const items = response.files?.menu || [];
    if (items.length) {
        console.info(`Setting ${items.length} context-menu userscripts`);
    }
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // context-menu scripts require @match value
        // @include values are ignored
        if (!item.scriptObject.matches.length) continue;
        addContextMenuItem(item);
    }
}

async function addContextMenuItem(userscript) {
    // context-menu items persist for a session
    // to avoid duplication, when created, save the filename to session storage
    const savedItems = sessionStorage.getItem("menu");
    // if the session storage key doesn't exist use empty array
    const activeItems = savedItems ? JSON.parse(savedItems) : [];
    if (activeItems.indexOf(userscript.scriptObject.filename) !== -1) {
        // if already saved, remove it, to get fresh code changes
        await browser.menus.remove(userscript.scriptObject.filename);
    }
    // potential bug? https://developer.apple.com/forums/thread/685273
    // https://stackoverflow.com/q/68431201
    // parse through match values and change pathnames to deal with bug
    const patterns = userscript.scriptObject.matches;
    patterns.forEach((pattern, index) => {
        try {
            const url = new URL(pattern);
            let pathname = url.pathname;
            if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
            patterns[index] = `${url.protocol}//${url.hostname}${pathname}`;
        } catch (error) {
            // prevent breaking when non-url pattern present
        }
    });

    browser.menus.create({
        contexts: ["all"],
        documentUrlPatterns: patterns,
        id: userscript.scriptObject.filename,
        title: userscript.scriptObject.name
    }, () => {
        // add event listener if needed
        if (!browser.menus.onClicked.hasListener(contextClick)) {
            browser.menus.onClicked.addListener(contextClick);
        }
        // save the context-menu item reference to sessionStorage
        sessionStorage.setItem("menu", JSON.stringify([userscript.scriptObject.filename]));
    });
}

function contextClick(info, tab) {
    // when any created context-menu item is clicked, send message to tab
    // the content script for that tag will have the context-menu code
    // which will get send back in the response if/when found
    const message = {name: "CONTEXT_RUN", menuItemId: info.menuItemId};
    browser.tabs.sendMessage(tab.id, message, response => {
        // if code is returned, execute on that tab
        if (!response.code) return;
        browser.tabs.executeScript(tab.id, {
            code: response.code
        });
    });
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const name = request.name;
    switch (name) {
        case "REQ_USERSCRIPTS": {
            // get the page url from the content script that sent request
            const url = sender.url;
            // use frameId to determine if request came from top level window
            const isTop = sender.frameId === 0 ? true : false;
            // ask swift layer to provide code for current url(s)
            const message = {name: name, url: url, isTop: isTop};
            browser.runtime.sendNativeMessage(message, response => {
                // if request failed, send error to content script for logging
                if (response.error) return sendResponse(response);
                // add api methods to js code
                const apiConfig = {
                    userscripts: response.files.js,
                    uid: request.uid,
                    scriptHandler: response.scriptHandler,
                    scriptHandlerVersion: response.scriptHandlerVersion
                };
                response.files.js = addApis(apiConfig);
                // sort files by run-at, first, then weight
                response.files.js.sort((a, b) => {
                    const runAtVals = { "document-start": 1, "document-end": 2, "document-idle": 3 };
                    if (a.scriptObject["run-at"] != b.scriptObject["run-at"]) {
                        if (runAtVals[a.scriptObject["run-at"]] && runAtVals[b.scriptObject["run-at"]]) {
                            return runAtVals[a.scriptObject["run-at"]] > runAtVals[b.scriptObject["run-at"]];
                        }
                    }
                    return Number(a.weight) < Number(b.weight);
                });
                response.files.css.sort((a, b) => Number(a.weight) < Number(b.weight));
                sendResponse(response);
                // update badge count on injection
                // especially useful when injection is deferred (ie. subframes)
                setBadgeCount();
                // refresh context menu items if needed
                // if (response.files.menu.length) {
                //     getContextMenuItems();
                // }
            });
            return true;
        }
        case "API_OPEN_TAB": {
            const active = (request.active === true) ? true : false;
            const props = {active: active, index: sender.tab.index + 1, url: request.url};
            browser.tabs.create(props, response => {
                sendResponse(response);
            });
            return true;
        }
        case "API_CLOSE_TAB": {
            const tabId = request.tabId !== undefined ? request.tabId : sender.tab.id;
            browser.tabs.remove(tabId, () => {
                sendResponse({success: true});
            });
            return true;
        }
        case "API_SET_VALUE": {
            const item = {};
            item[`${request.filename}---${request.key}`] = request.value;
            browser.storage.local.set(item, () => {
                sendResponse({success: true});
            });
            return true;
        }
        case "API_GET_VALUE": {
            const key = `${request.filename}---${request.key}`;
            browser.storage.local.get(key, item => {
                if (Object.keys(item).length === 0) {
                    if (request.defaultValue !== undefined) {
                        sendResponse(request.defaultValue);
                    } else {
                        sendResponse(`undefined--${request.pid}`);
                    }
                } else {
                    sendResponse(Object.values(item)[0]);
                }
            });
            return true;
        }
        case "API_DELETE_VALUE": {
            const key = `${request.filename}---${request.key}`;
            browser.storage.local.remove(key, response => {
                sendResponse({success: true});
            });
            return true;
        }
        case "API_LIST_VALUES": {
            const prefix = `${request.filename}---`;
            const keys = [];
            browser.storage.local.get().then(items => {
                for (const key in items) {
                    if (key.startsWith(prefix)) {
                        const k = key.replace(prefix, "");
                        keys.push(k);
                    }
                }
                sendResponse(keys);
            });
            return true;
        }
        case "API_ADD_STYLE":
        case "API_ADD_STYLE_SYNC": {
            const tabId = sender.tab.id;
            browser.tabs.insertCSS(tabId, {code: request.css, cssOrigin: "user"}, () => {
                if (name === "API_ADD_STYLE") sendResponse(request.css);
            });
            return true;
        }
        case "API_SET_CLIPBOARD": {
            const result = setClipboard(request.data, request.type);
            sendResponse(result);
            break;
        }
        case "API_XHR_CS": {
            xhrMake(request, sender);
            break;
        }
        case "API_XHR_ABORT_CS": {
            // get the xhrId from request
            const xhrId = request.xhrId;
            const match = xhrs.find(x => x.xhrId === xhrId);
            if (match) {
                match.xhr.abort();
                // sendResponse(match);
            } else {
                console.error(`abort message received for ${xhrId}, but it couldn't be found`);
            }
            break;
        }
        case "API_GET_TAB": {
            if (typeof sender.tab !== "undefined") {
                let tab = null;
                const tabData = sessionStorage.getItem(`tab-${sender.tab.id}`);
                try {
                    // if tabData is null, can still parse it and return that
                    tab = JSON.parse(tabData);
                } catch (error) {
                    console.error("failed to parse tab data for getTab");
                }
                sendResponse(tab == null ? {} : tab);
            } else {
                console.error("unable to deliver tab due to empty tab id");
                sendResponse(null);
            }
            break;
        }
        case "API_SAVE_TAB": {
            if (typeof sender.tab !== "undefined" && request.tab) {
                sessionStorage.setItem(`tab-${sender.tab.id}`, JSON.stringify(request.tab));
                sendResponse({success: true});
            } else {
                console.error("unable to save tab due to empty tab id or bad arg");
                sendResponse(null);
            }
            break;
        }
        case "USERSCRIPT_INSTALL_00":
        case "USERSCRIPT_INSTALL_01":
        case "USERSCRIPT_INSTALL_02": {
            const message = {name: name, content: request.content};
            browser.runtime.sendNativeMessage(message, response => {
                sendResponse(response);
            });
            return true;
        }
        case "REFRESH_SESSION_RULES": {
            setSessionRules();
            break;
        }
        case "REFRESH_CONTEXT_MENU_SCRIPTS": {
            getContextMenuItems();
            break;
        }
    }
});

async function setSessionRules() {
    await clearAllSessionRules();
    const response = await browser.runtime.sendNativeMessage({name: "REQ_REQUESTS"});
    if (response.error) {
        console.error(response.error);
        return;
    }
    // there are no rules to apply
    if (!response.length) return;
    // loop through response, parse the rules, push to array and log
    const rules = [];
    for (let i = 0; i < response.length; i++) {
        const rule = response[i];
        const code = JSON.parse(rule.code);
        // check if an array or single rule
        if (Array.isArray(code)) {
            code.forEach(rule => rules.push(rule));
            console.info(`Setting session rule: ${rule.name} (${code.length})`);
        } else {
            rules.push(code);
            console.info(`Setting session rule: ${rule.name}`);
        }
    }
    // generate unique ids for all rules to ensure no repeats
    const ids = randomNumberSet(1000, rules.length);
    rules.map((rule, index) => rule.id = ids[index]);
    try {
        await browser.declarativeNetRequest.updateSessionRules({addRules: rules});
    } catch (error) {
        console.error(`Error setting session rules: ${error}`);
        return;
    }
    console.info(`Finished setting ${rules.length} session rules`);
}

async function clearAllSessionRules() {
    const rules = await browser.declarativeNetRequest.getSessionRules();
    if (!rules.length) return;
    console.info(`Clearing ${rules.length} session rules`);
    const ruleIds = rules.map(a => a.id);
    await browser.declarativeNetRequest.updateSessionRules({
        removeRuleIds: ruleIds
    });
}

function randomNumberSet(max, count) {
    // generates a set of random unique numbers
    // returns an array
    const numbers = new Set();
    while (numbers.size < count) {
        numbers.add((Math.floor(Math.random() * (max - 1 + 1)) + 1));
    }
    return [...numbers];
}

browser.runtime.onStartup.addListener(async () => {
    // on startup get declarativeNetRequests
    // and set the requests for the session
    // should also check and refresh when:
    // 1. popup opens (done)
    // 2. a new save event in the page occurs
    // 3. the refresh button is pushed in the popup
    await setSessionRules();
    await getContextMenuItems();
});
browser.tabs.onActivated.addListener(setBadgeCount);
browser.windows.onFocusChanged.addListener(setBadgeCount);
browser.webNavigation.onCompleted.addListener(setBadgeCount);
