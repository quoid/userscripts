// all code from all scripts saved to data var
let data;
// var that determines whether strict csp injection has already run (JS only)
let evalJS = 0;

// attempt to ensure script only runs on top-level pages
if (window.top === window) {
    // request saved script code
    safari.extension.dispatchMessage("REQ_USERSCRIPTS");
    // event listener to detect strict CSPs
    document.addEventListener("securitypolicyviolation", function(e) {
        const src = e.sourceFile.toUpperCase();
        const ext = safari.extension.baseURI.toUpperCase();
        // ensure that violation came from the extension
        if (ext.startsWith(src)) {
            // determine what kind of violation
            if (e.effectiveDirective === "script-src" && evalJS != 1) {
                inject("eval");
                // change var to ensure eval injection only happens once
                evalJS = 1;
            }
        }
    });
}

function inject(method) {
    // iterate over data and extract css/js individually for injection
    for (const type in data) {
        const codeType = data[type];
        for (const filename in codeType) {
            let code = codeType[filename];
            // css injection only happens with inline method
            // if blocked by csp, no reliable way to inject style code yet
            // future fix?: https://wicg.github.io/construct-stylesheets/
            if (type === "css" && method == "inline") {
                const tag = document.createElement("style");
                tag.textContent = code;
                document.head.appendChild(tag);
                console.log(`Injecting ${filename}`);
            } else if (type === "js") {
                code = code + "\n//# sourceURL=" + filename.replace(/\s/g, "-");
                if (method === "inline") {
                    const tag = document.createElement("script");
                    tag.textContent = code;
                    document.body.appendChild(tag);
                    console.log(`Injecting ${filename}`);
                } else if (method === "eval"){
                    eval(code);
                }
            }
        }
    }
}

// respond to messages
function handleMessage(event) {
    // the only message currently sent to the content script
    if (event.name === "RESP_USERSCRIPTS") {
        // if error returned, log and stop execution
        if (event.message.error) {
            console.error(event.message.error);
            return;
        }
        // save data sent with message to var
        data = event.message.data;
        // attempt to inject all code inline after page has loaded
        if (document.readyState !== "loading") {
            inject("inline");
        } else {
            document.addEventListener("DOMContentLoaded", function() {
                inject("inline");
            });
        }
    }
}

// event listener to handle messages
safari.self.addEventListener("message", handleMessage);
