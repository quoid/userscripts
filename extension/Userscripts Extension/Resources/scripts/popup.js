function openExtensionPage() {
    const extensionPageUrl = browser.runtime.getURL("/page.html");
    browser.tabs.query({}, tabs => {
        var open = false;
        for (const tab of tabs) {
            if (tab.url === extensionPageUrl) {
                browser.windows.update(tab.windowId, {focused: true});
                browser.tabs.update(tab.id, {active: true});
                open = true;
                break;
            }
        }
        if (!open) browser.tabs.create({url: browser.runtime.getURL("page.html")});
    });
}

document.getElementById("page").addEventListener("click", openExtensionPage);
