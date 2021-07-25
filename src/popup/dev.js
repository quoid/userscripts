const _browser = {
    runtime: {
        sendNativeMessage(message, responseCallback) {
            console.log(`Got message: ${message.name}`);
            let response = {};
            if (message.name === "POPUP_TOGGLE_EXTENSION") {
                //response = {error: "Failed toggle extension"};
                response = {status: "success"};
            } else if (message.name === "POPUP_UPDATE_ALL") {
                response = {error: "Failed refresh scripts"};
                response = {
                    items: [
                        {
                            metadata: {name: ["Google Images Restored"]},
                            filename: "Google Images Restored.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            metadata: {name: ["Wikipedia Mobile Redirect"]},
                            filename: "Wikipedia Mobile Redirect.js",
                            disabled: true,
                            type: "js"
                        },
                        {
                            metadata: {name: ["A Special Userscript"]},
                            filename: "A Special Userscript.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            metadata: {name: ["CSS Adblock"]},
                            filename: "CSS Adblock.css",
                            disabled: false,
                            type: "css"
                        },
                        {
                            metadata: {name: ["New Userscript With a Really Really Long Name"]},
                            filename: "New Userscript With a Really Really Long Name.css",
                            disabled: true,
                            type: "css"
                        },
                        {
                            metadata: {name: ["Subframe Script Managerial Staffing Company"]},
                            filename: "Subframe Script.js",
                            disabled: false,
                            subframe: true,
                            type: "css"
                        }
                    ],
                    updates: []
                };
            } else if (message.name === "POPUP_MATCHES") {
                response = {
                    active: "true",
                    items: [
                        {
                            metadata: {name: ["Google Images Restored"]},
                            filename: "Google Images Restored.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            metadata: {name: ["Subframe Script Managerial Staffing Company"]},
                            filename: "Subframe Script.js",
                            disabled: false,
                            subframe: true,
                            type: "css"
                        }
                    ],
                    updates: [
                        {name: "Google Images Restored", url: "https://www.k21p.com"},
                        {name: "New Userscript With a Really Really Long Name", url: "https://www.filmgarb.com"}
                    ]
                };
            } else if (message.name === "POPUP_TOGGLE_SCRIPT") {
                response = {status: "success"};
            } else if (message.name === "POPUP_OPEN_EXTENSION_PAGE") {
                response = {error: "Failed to get page url"};
                window.open("https://github.com/quoid/userscripts");
            }
            setTimeout(() => {
                responseCallback(response);
            }, 1000);
        }
    },
    tabs: {
        query(message, responseCallback) {
            setTimeout(() => {
                responseCallback([{url: "https://www.filmgarb.com/"}]);
            }, 100);
        }
    },
    webNavigation: {
        getAllFrames(message, responseCallback) {
            responseCallback([]);
        }
    }
};

window.browser = _browser;
document.documentElement.style.backgroundColor = "grey";
