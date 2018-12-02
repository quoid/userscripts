function injectCode(code) {
    var script = document.createElement("script");
    script.text = code;
    document.head.appendChild(script);
}

function respondToMessage(event) {
    if (event.name === "SEND_CODE_FROM_GLOBAL") {
        injectCode(event.message);
    }
}

if (window.top === window) {
    safari.self.tab.dispatchMessage("REQUEST_CODE_FROM_GLOBAL");
}

safari.self.addEventListener("message", respondToMessage, false);