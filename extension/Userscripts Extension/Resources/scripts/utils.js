export function log(message, tabId) {
    var id = tabId;
    var code = `console.log(${message});`;
    if (typeof message === "string") code = `console.log("${message}");`;
    if (typeof message === "object") code = `console.log(${JSON.stringify(message)});`;
    browser.tabs.executeScript(id, {code: code});
}
