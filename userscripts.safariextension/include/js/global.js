function saveCode(code, date) {
    localStorage.setItem("code", code);
    localStorage.setItem("date", date);
}

function respondToMessage(event) {
    var code = localStorage.getItem("code");
    if (event.name === "REQUEST_CODE_FROM_GLOBAL") {
        event.target.page.dispatchMessage("SEND_CODE_FROM_GLOBAL", code);
    }
}

safari.application.addEventListener("message", respondToMessage, false);