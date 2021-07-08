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
        });
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#sending_an_asynchronous_response_using_sendresponse
        return true;
    }
});
