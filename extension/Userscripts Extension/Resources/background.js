browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // content script listening seems to be the most reliable way to trigger injection
    if (request.name === "REQ_USERSCRIPTS") {
        const url = sender.url;
        // use frameId to determine if request came from top level window
        const isTop = sender.frameId === 0 ? true : false;
        // ask swift layer to provide code for current url(s)
        const message = {name: request.name, url: url, isTop: isTop};
        browser.runtime.sendNativeMessage(message, response => {
            // send code back to content script for parsing and injection
            // could use tabs.executeScript(sender.tab.id) for content context injection
            // but for now, will rely on eval() in content script
            sendResponse({code: response.code});
            // update badge count on injection
            // especially useful when injection is deferred (ie. subframes)
            setBadgeCount();
        });
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#sending_an_asynchronous_response_using_sendresponse
        return true;
    }
});

async function setBadgeCount() {
    const tabs = await new Promise(resolve => {
        browser.tabs.query({currentWindow: true, active: true}, tabs => {
            resolve(tabs);
        });
    });
    const url = tabs[0].url;
    const message = {name: "POPUP_BADGE_COUNT", url: url, frameUrls: []};
    if (url) {
        const frames = await new Promise(resolve => {
            browser.webNavigation.getAllFrames({tabId: tabs[0].id}, frames => {
                resolve(frames);
            });
        });
        frames.forEach(frame => message.frameUrls.push(frame.url));
    }
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

browser.tabs.onActivated.addListener(setBadgeCount);
browser.windows.onFocusChanged.addListener(setBadgeCount);
