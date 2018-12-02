function downloadScript(code) {
    var el = document.createElement('a');
    el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(code));
    el.setAttribute("download", "script.js");
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    setTimeout(function() {
        window.close();
    }, 200);
}

function respondToMessage(event) {
    if (event.name === "SEND_CODE_FROM_GLOBAL") {
        downloadScript(event.message);
    }
}

safari.self.tab.dispatchMessage("REQUEST_CODE_FROM_GLOBAL");
safari.self.addEventListener("message", respondToMessage, false);