/**
 * @file exchange messages between `web extension` and `native application`
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging}
 * @see {@link https://developer.apple.com/documentation/safariservices/safari_web_extensions/messaging_between_the_app_and_javascript_in_a_safari_web_extension}
 */

/**
 * @see {@link https://vitejs.dev/guide/env-and-mode.html}
 * @returns {string}
 */
const application = () => import.meta.env.NATIVE_APP ?? "application";

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/connectNative}
 * @returns {import("webextension-polyfill").Runtime.Port} A `runtime.Port` object
 */
export function connectNative() {
	return browser.runtime.connectNative(application());
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendNativeMessage}
 * @param {any} message
 * @returns {Promise<any>} A response of JSON object or no arguments
 */
export function sendNativeMessage(message) {
	return browser.runtime.sendNativeMessage(application(), message);
}
