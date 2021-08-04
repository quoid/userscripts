const _browser = {
    runtime: {
        getURL() {
            return "https://www.example.com/";
        },
        sendNativeMessage(message, responseCallback) {
            console.log(`Got message: ${message.name}`);
            let response = {};
            if (message.name === "POPUP_TOGGLE_EXTENSION") {
                response = {error: "Failed toggle extension"};
                //response = {status: "success"};
            } else if (message.name === "POPUP_UPDATE_ALL") {
                response = {error: "Failed refresh scripts"};
                response = {
                    items: [
                        {
                            name: "Google Images Restored",
                            filename: "Google Images Restored.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            name: "Wikipedia Mobile Redirect",
                            filename: "Wikipedia Mobile Redirect.js",
                            disabled: true,
                            type: "js"
                        },
                        {
                            name: "A Special Userscript",
                            filename: "A Special Userscript.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            name: "CSS Adblock",
                            filename: "CSS Adblock.css",
                            disabled: false,
                            type: "css"
                        },
                        {
                            name: "New Userscript With a Really Really Long Name",
                            filename: "New Userscript With a Really Really Long Name.css",
                            disabled: true,
                            type: "css"
                        },
                        {
                            name: "Subframe Script Managerial Staffing Company",
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
                            name: "Google Images Restored",
                            filename: "Google Images Restored.js",
                            disabled: false,
                            type: "js"
                        },
                        {
                            name: "Subframe Script Managerial Staffing Company",
                            filename: "Subframe Script.js",
                            disabled: false,
                            subframe: true,
                            type: "css"
                        }
                    ],
                    updates: [
                        {
                            filename: "Google Images Restored.js",
                            name: "Google Images Restored",
                            url: "https://www.k21p.com"
                        },
                        {
                            filename: "New Userscript With a Really Really Long Name.js",
                            name: "New Userscript With a Really Really Long Name",
                            url: "https://www.filmgarb.com"
                        }
                    ]
                };
            } else if (message.name === "TOGGLE_ITEM") {
                //response = {error: "Failed toggle item"};
                response = {status: "success"};
            } else if (message.name === "POPUP_OPEN_EXTENSION_PAGE") {
                response = {error: "Failed to get page url"};
                window.open("https://github.com/quoid/userscripts");
            }
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), 500));
            }
            setTimeout(() => {
                responseCallback(response);
            }, 500);
        }
    },
    tabs: {
        query(message, responseCallback) {
            const response = [{url: "https://www.filmgarb.com/"}];
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), 500));
            }
            setTimeout(() => {
                responseCallback(response);
            }, 500);
        }
    },
    webNavigation: {
        getAllFrames(message, responseCallback) {
            const response = [];
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), 500));
            }
            setTimeout(() => {
                responseCallback(response);
            }, 500);
        }
    }
};

window.browser = _browser;
document.documentElement.style.backgroundColor = "grey";
