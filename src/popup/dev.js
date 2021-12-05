const _browser = {
    delay: 200,
    runtime: {
        getURL() {
            return "https://www.example.com/";
        },
        sendNativeMessage(message, responseCallback) {
            console.log(`Got message: ${message.name}`);
            let response = {};
            if (message.name === "POPUP_TOGGLE_EXTENSION") {
                //response = {error: "Failed toggle extension"};
                response = {success: true};
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
            } else if (message.name === "POPUP_UPDATE_SINGLE") {
                // response = {error: "Failed to updated item"};
                response = {success: true};
            } else if (message.name === "POPUP_CHECK_UPDATES") {
                response = {
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
            } else if (message.name === "POPUP_INIT") {
                response.initData = {
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
            } else if (message.name === "POPUP_MATCHES") {
                response = {
                    matches: [
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
                    ]
                };
            } else if (message.name === "POPUP_UPDATES") {
                response = {
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
            } else if (message.name === "REQ_PLATFORM") {
                response = {platform: "macos"};
            } else if (message.name === "TOGGLE_ITEM") {
                response = {error: "Failed to toggle item"};
                //response = {success: true};
            } else if (message.name === "POPUP_OPEN_EXTENSION_PAGE") {
                response = {error: "Failed to get page url"};
                window.open("https://github.com/quoid/userscripts");
            }
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), this.delay));
            }
            setTimeout(() => {
                responseCallback(response);
            }, this.delay);
        }
    },
    tabs: {
        query(message, responseCallback) {
            const response = [{url: "https://www.filmgarb.com/foo.user.js", id: 101}];
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), this.delay));
            }
            setTimeout(() => {
                responseCallback(response);
            }, this.delay);
        },
        sendMessage(tabId, message, responseCallback) {
            console.log(`Tab ${tabId} got message: ${message.name}`);
            let response = {};
            if (message.name === "USERSCRIPT_INSTALL_00") {
                response = {success: "Click to install"};
                //response.error = "something went wrong";
            } else if (message.name === "USERSCRIPT_INSTALL_01") {
                //response = {error: "a userscript with this @name value already exists, @name needs to be unique"};
                response = {
                    description: "This userscript re-implements the \"View Image\" and \"Search by image\" buttons into google images.",
                    grant: ["GM.getValue", "GM.setValue", "GM.xmlHttpRequest"],
                    match: ["https://www.example.com/*", "https://www.example.com/somethingReallylong/goesRightHere"],
                    name: "Test Install Userscript",
                    require: ["https://code.jquery.com/jquery-3.5.1.min.js", "https://code.jquery.com/jquery-1.7.1.min.js"],
                    source: "https://greasyforx.org/scripts/00000-something-something-long-name/code/Something%20something%20long20name.user.js"
                };
            }
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), this.delay));
            }
            setTimeout(() => {
                responseCallback(response);
            }, this.delay);
        }
    },
    webNavigation: {
        getAllFrames(message, responseCallback) {
            const response = [];
            if (!responseCallback) {
                return new Promise(resolve => setTimeout(() => resolve(response), this.delay));
            }
            setTimeout(() => {
                responseCallback(response);
            }, this.delay);
        }
    }
};

window.browser = _browser;
document.documentElement.style.backgroundColor = "grey";
