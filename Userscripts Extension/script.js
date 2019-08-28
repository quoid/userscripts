function injectCode(code) {
    return Function(code)();
}

function downloadScript(code) {
    var el = document.createElement("a");
    el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(code));
    el.setAttribute("download", "userscript.js");
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

function handleMessage(event) {
    if (event.name === "SEND_SAVED_CODE") {
        injectCode(unescape(event.message.code));
    }
    if (event.name === "DOWNLOAD_SCRIPT") {
        if (window.top === window) {
            downloadScript(event.message.code)
        }
    }
}

if (window.top === window) {
    safari.extension.dispatchMessage("REQUEST_SAVED_CODE");
}

safari.self.addEventListener("message", handleMessage);
