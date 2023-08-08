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
 * @returns {Promise<void>}
 */
export function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

// TODO: describe the items array that should get passed to this function
/**
 * @param {Array} array
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
    }
    return `// ==UserScript==\n// @name        ${name}\n// @description ${description}\n// @match       *://*/*\n// ==/UserScript==`;
}

/**
 * @param {string} str
 * @returns {?{code: string, content: str, metablock: string, metadata: {string: string[]}}}
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
    metaArray.forEach(m => {
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
        code,
        content: str,
        metablock,
        metadata
    };
}

/**
 * @param {string} text editor code
 * @returns {{match: boolean, meta: boolean} | {key: string, value: string, text: string}[]}
 */
export function parseMetadata(text) {
    const groupsRe = /(\/\/ ==UserScript==[ \t]*?\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)/;
    const groups = text.match(groupsRe);
    // userscript code doesn't match the regex expression
    // could be missing opening/closing tags, malformed
    // or missing metadata between opening/closing tags (group 2 in regex exp)
    if (!groups) {
        return {match: false};
    }

    // userscript code matches but content between opening/closing tag missing
    // ex. opening/closing tags present, but newline characters between the tags
    const metas = groups[2];
    if (!metas) return {match: true, meta: false};

    const metadata = [];
    const metaArray = metas.split("\n");

    for (let i = 0; i < metaArray.length; i++) {
        const metaRegex = /^(?:[ \t]*(?:\/\/)?[ \t]*@)([\w-]+)[ \t]*([^\s]+[^\r\n\t\v\f]*)?/;
        const meta = metaArray[i];
        const parts = meta.match(metaRegex);
        if (parts) metadata.push({key: parts[1], value: parts[2], text: parts[0]});
    }

    // if there is content between the opening/closing tags, match will be found
    // this additionally checks that there's at least one properly formed key
    // if not keys found, assume metadata is missing
    // checking that required keys are present will happen elsewhere
    if (!Object.keys(metadata).length) return {match: true, meta: false};

    return metadata;
}

export const validGrants = new Set([
    "GM.info",
    "GM_info",
    "GM.addStyle",
    "GM.openInTab",
    "GM.closeTab",
    "GM.setValue",
    "GM.getValue",
    "GM.deleteValue",
    "GM.listValues",
    "GM.setClipboard",
    "GM.getTab",
    "GM.saveTab",
    "GM_xmlhttpRequest",
    "GM.xmlHttpRequest",
    "none"
]);

export const validMetaKeys = new Set([
    "author",
    "description",
    "downloadURL",
    "exclude",
    "exclude-match",
    "grant",
    "icon",
    "include",
    "inject-into",
    "match",
    "name",
    "noframes",
    "require",
    "run-at",
    "updateURL",
    "version",
    "weight"
]);

export const extensionPaths = {
    page: "/dist/entry-page.html",
    popup: "/dist/entry-popup.html"
};

export async function openExtensionPage() {
    const url = browser.runtime.getURL(extensionPaths.page);
    const tabs = await browser.tabs.query({url});
    const tab = tabs.find(e => e.url.startsWith(url));
    if (!tab) return browser.tabs.create({url});
    browser.tabs.update(tab.id, {active: true});
    browser.windows.update(tab.windowId, {focused: true});
}
