/**
 * @param {number} ms millisecond timestamp
 * @returns {string}
 */
export function formatDate(ms) {
    const d = new Date(ms);
    const yr = new Intl.DateTimeFormat("en", {year: "numeric"}).format(d);
    const mo = new Intl.DateTimeFormat("en", {month: "short"}).format(d);
    const dd = new Intl.DateTimeFormat("en", {day: "2-digit"}).format(d);
    const hr = d.getHours();
    const mn = d.getMinutes();
    return `${mo} ${dd}, ${yr} at ${hr}:${mn}`;
}

export function uniqueId() {
    return Math.random().toString(36).substring(2, 10);
}

/**
 * awaitable function for waiting an arbitrary amount of time
 * @param {number} ms the amount of time to wait in milliseconds
 * @returns {Promise.<void>}
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO: describe the items array that should get passed to this function
/**
 * @param {array} array
 * @param {("lastModifiedAsc"|"lastModifiedDesc"|"nameAsc"|"nameDesc")} order
 * @returns
 */
export function sortBy(array, order) {
    if (order === "nameAsc") {
        array.sort((a, b) => a.name.localeCompare(b.name));
    } else if (order === "nameDesc") {
        array.sort((a, b) => b.name.localeCompare(a.name));
    } else if (order === "lastModifiedAsc") {
        array.sort((a, b) => (a.lastModified < b.lastModified) ? -1 : 1);
    } else if (order === "lastModifiedDesc") {
        array.sort((a, b) => (a.lastModified > b.lastModified) ? -1 : 1);
    }
    // always keep temp file pinned to the top, should only ever have one temp script
    // if (array.find(f => f.temp)) array.sort((a, b) => a.temp ? -1 : b.temp ? 1 : 0);
    return array;
}

/**
 *
 * @param {string} description
 * @param {string} name
 * @param {("css"|"js")} type
 * @returns {string}
 */
export function newScriptDefault(description, name, type) {
    if (type === "css") {
        return `/* ==UserStyle==\n@name        ${name}\n@description ${description}\n@match       <all_urls>\n==/UserStyle== */`;
    } else if (type === "js") {
        return `// ==UserScript==\n// @name        ${name}\n// @description ${description}\n// @match       *://*/*\n// ==/UserScript==`;
    }
}

/**
 * @param {string} str
 * @returns {{code: string, content: str, metablock: string, metadata: {string: string[]}}}
 */
export function parse(str) {
    if (typeof str != "string") return null;
    const blocksReg = /(?:(\/\/ ==UserScript==[ \t]*?\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)|(\/\* ==UserStyle==[ \t]*?\r?\n([\S\s]*?)\r?\n==\/UserStyle== \*\/)([\S\s]*))/;
    const blocks = str.match(blocksReg);

    if (!blocks) return null;

    const metablock = (blocks[1] != null) ? blocks[1] : blocks[4];
    const metas = (blocks[2] != null) ? blocks[2] : blocks[5];
    const code = (blocks[3] != null) ? blocks[3].trim() : blocks[6].trim();

    const metadata = {};
    const metaArray = metas.split("\n");
    metaArray.forEach(function(m) {
        const parts = m.trim().match(/^(?:[ \t]*(?:\/\/)?[ \t]*@)([\w-]+)[ \t]+([^\s]+[^\r\n\t\v\f]*)/);
        const parts2 = m.trim().match(/^(?:[ \t]*(?:\/\/)?[ \t]*@)(noframes)[ \t]*$/);
        if (parts) {
            metadata[parts[1]] = metadata[parts[1]] || [];
            metadata[parts[1]].push(parts[2]);
        } else if (parts2) {
            metadata[parts2[1]] = metadata[parts2[1]] || [];
            metadata[parts2[1]].push(true);
        }

    });
    // fail if @name is missing or name is empty
    if (!metadata.name || metadata.name[0].length < 2) return;

    return {
        code: code,
        content: str,
        metablock: metablock,
        metadata: metadata
    };
}
