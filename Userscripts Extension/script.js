function injectCode(code) {
    var script = document.createElement("script");
    script.text = code;
    document.head.appendChild(script);
}

function downloadScript(code) {
    var el = document.createElement("a");
    el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(code));
    el.setAttribute("download", "script.js");
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

function handleMessage(event) {
    if (event.name === "SEND_SAVED_DATA") {
        injectCode(unescape(event.message.code));
    }
    if (event.name === "DOWNLOAD_SCRIPT") {
        if (window.top === window) {
            downloadScript(unescape(event.message.code))
        }
    }
}

if (window.top === window) {
    safari.extension.dispatchMessage("REQUEST_SAVED_DATA");
}

safari.self.addEventListener("message", handleMessage);
console.log("remove this");
