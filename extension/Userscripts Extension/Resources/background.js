// first sorts files by run-at value, then by weight value
function userscriptSort(a, b) {
    // map the run-at values to numeric values
    const runAtValues = {
        "document-start": 1,
        "document-end": 2,
        "document-idle": 3
    };
    const runAtA = a.scriptObject["run-at"];
    const runAtB = b.scriptObject["run-at"];
    if (runAtA !== runAtB && runAtValues[runAtA] && runAtValues[runAtB]) {
        return runAtValues[runAtA] > runAtValues[runAtB];
    }
    return Number(a.scriptObject.weight) < Number(b.scriptObject.weight);
}

async function getPlatform() {
    let platform = localStorage.getItem("platform");
    if (!platform) {
        const message = {name: "REQ_PLATFORM"};
        const response = await browser.runtime.sendNativeMessage(message);
        if (!response.platform) {
            console.error("Failed to get platform");
            return "";
        }
        platform = response.platform;
        localStorage.setItem("platform", platform);
    }
    return platform;
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
    const message = {
        name: "POPUP_BADGE_COUNT",
        url: url,
        frameUrls: Array.from(frameUrls)
    };
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

async function setSessionRules() {
    await clearAllSessionRules();
    const message = {name: "REQ_REQUESTS"};
    const response = await browser.runtime.sendNativeMessage(message);
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

async function getContextMenuItems() {
    // macos exclusive feature
    const platform = await getPlatform();
    if (platform !== "macos") return;
    // since it's not possible to get a list of currently active menu items
    // on update, all context-menu items are cleared, then re-added
    // this is done to ensure fresh code changes appear
    await browser.menus.removeAll();
    // get the context-menu scripts
    const message = {name: "REQ_CONTEXT_MENU_SCRIPTS"};
    const response = await browser.runtime.sendNativeMessage(message);
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
            if (pathname.length > 1 && pathname.endsWith("/")) {
                pathname = pathname.slice(0, -1);
            }
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
        const value = JSON.stringify([userscript.scriptObject.filename]);
        sessionStorage.setItem("menu", value);
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

// handles messages sent with browser.runtime.sendMessage
function handleMessage(request, sender, sendResponse) {
    switch (request.name) {
        case "REQ_USERSCRIPTS": {
            // get the page url from the content script that sent request
            const url = sender.url;
            // use frameId to determine if request came from top level window
            // if @noframes true, and isTop false, swift layer won't return code
            const isTop = sender.frameId === 0 ? true : false;
            // send request to swift layer to provide code for page url
            const message = {name: "REQ_USERSCRIPTS", url: url, isTop: isTop};
            browser.runtime.sendNativeMessage(message, response => {
                // if request failed, send error to content script for logging
                if (response.error) return sendResponse(response);
                // sort files
                response.files.js.sort(userscriptSort);
                response.files.css.sort((a, b) => {
                    return Number(a.scriptObject.weight) < Number(b.scriptObject.weight);
                });
                // return sorted files for injection
                sendResponse(response);
            });
            return true;
        }
        case "API_CLOSE_TAB": {
            const tabId = request.tabId || sender.tab.id;
            browser.tabs.remove(tabId, () => sendResponse({success: 1}));
            return true;
        }
        case "API_OPEN_TAB": {
            const props = {
                active: request.active,
                index: sender.tab.index + 1,
                url: request.url
            };
            browser.tabs.create(props, response => sendResponse(response));
            return true;
        }
        case "API_ADD_STYLE": {
            const tabId = sender.tab.id;
            const details = {code: request.css, cssOrigin: "user"};
            browser.tabs.insertCSS(tabId, details, () => {
                sendResponse(request.css);
            });
            return true;
        }
        case "API_GET_TAB": {
            let tab = null;
            if (typeof sender.tab !== "undefined") {
                const tabData = sessionStorage.getItem(`tab-${sender.tab.id}`);
                try {
                    // if tabData is null, can still parse it and return that
                    tab = JSON.parse(tabData);
                } catch (error) {
                    console.error("failed to parse tab data for getTab");
                }
            } else {
                console.error("unable to deliver tab due to empty tab id");
            }
            sendResponse(tab == null ? {} : tab);
            break;
        }
        case "API_SAVE_TAB": {
            if (sender.tab != null && sender.tab.id) {
                sessionStorage.setItem(`tab-${sender.tab.id}`, JSON.stringify(request.tab));
                sendResponse({success: true});
            } else {
                console.error("unable to save tab, empty tab id");
                sendResponse({success: false});
            }
            break;
        }
        case "API_SET_CLIPBOARD": {
            const result = setClipboard(request.data, request.type);
            sendResponse(result);
            break;
        }
        case "USERSCRIPT_INSTALL_00":
        case "USERSCRIPT_INSTALL_01":
        case "USERSCRIPT_INSTALL_02": {
            const message = {name: request.name, content: request.content};
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
// listens for messages from content script, popup and page
browser.runtime.onMessage.addListener(handleMessage);
// set the badge count
browser.tabs.onActivated.addListener(setBadgeCount);
browser.windows.onFocusChanged.addListener(setBadgeCount);
browser.webNavigation.onCompleted.addListener(setBadgeCount);
