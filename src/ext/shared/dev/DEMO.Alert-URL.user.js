// ==UserScript==
// @name               DEMO.Alert-URL
// @description        Demo user script alert URL.
// @author             Userscripts
// @version            1.0.0
// @match              *://*/*
// @grant              none
// @inject-into        content
// @run-at             document-start
// ==/UserScript==

(function () {
	"use strict";
	alert("DEBUG.Alert-URL:\n\n" + location);
})();
