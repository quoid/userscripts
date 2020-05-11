"use strict";

const ___h = {
    getFileExtension: function(fileName) { // arg1 string
        // return file extension from filename str, undefined when no extension
        if (fileName.indexOf(".") === -1) {
            return;
        }
        const ext = fileName.substring(fileName.lastIndexOf(".") + 1);
        return ext;
    },
    hasClass: function(el, ...args) { // arg1 element, ...args str
        // checks if an element has any class in ...args
        for (let i = 0; i < args.length; i++) {
            if (el.classList.contains(args[i])) {
                return true;
            }
        }
        return false;
    },
    userscriptDefault: function(description, name, type) {
        if (type === "css") {
            return `/* ==UserStyle==\n@name        ${name}\n@description ${description}\n==/UserStyle== */`;
        } else if (type === "js") {
            return `// ==UserScript==\n// @name        ${name}\n// @description ${description}\n// ==/UserScript==`;
        }
    }
}
