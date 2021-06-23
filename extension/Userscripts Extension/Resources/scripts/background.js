import {log} from "./utils.js";

browser.webNavigation.onCommitted.addListener(details => {
    // log navigation details for top frame only
    if (details.frameId === 0) log(details, details.tabId);
    // app extension messaging example
    var messageName = details.url.includes("www.filmgarb.com") ? "MESSAGE_01" : "MESSAGE_02";
    browser.runtime.sendNativeMessage(
        {name: messageName, data: {tabId: details.tabId}},
        function(response) {
            handleResponse(response);
        }
    );
});

function handleResponse(response) {
    const message = response.name === "RESPONSE_01" ? "on filmgarb.com" : "not on filmgarb.com";
    log(message, response.tabId);
}
