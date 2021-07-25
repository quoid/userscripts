const _browser = {
    runtime: {
        sendNativeMessage(message, responseCallback) {
            console.log(`Got message: ${message.name}`);
            let response = {};
        }
    }
};

window.browser = _browser;
