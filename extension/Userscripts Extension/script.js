if (window.top === window) {
    safari.extension.dispatchMessage("REQ_USERSCRIPTS");
}

function injectCSS(code) {
    const doc = document.createElement("style");
    doc.textContent = code;
    document.head.appendChild(doc);
}

function injectJS(name, code) {
    code = code + "\n//# sourceURL=" + name.replace(/\s/g, "-");
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
            eval(code);
        });
    } else {
        eval(code);
    }
}

function handleMessage(event) {
    if (event.name === "RESP_USERSCRIPTS") {
        const obj = event.message.data;
        const error = event.message.error;
        if (error) {
            console.error(error);
            return;
        }
        for (const type in obj) {
            var typeObj = obj[type];
            for (const filename in typeObj) {
                var code = typeObj[filename];
                if (type === "css") {
                    injectCSS(code);
                }
                if (type === "js") {
                    injectJS(filename, code);
                }
                console.log(`Injecting ${filename}`);
            }
        }
    }
}

safari.self.addEventListener("message", handleMessage);
