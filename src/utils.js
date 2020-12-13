export function formatDate(ms) {
    const d = new Date(ms);
    const yr = new Intl.DateTimeFormat("en", {year: "numeric"}).format(d);
    const mo = new Intl.DateTimeFormat("en", {month: "short"}).format(d);
    const dd = new Intl.DateTimeFormat("en", {day: "2-digit"}).format(d);
    const hr = d.getHours();
    const mn = d.getMinutes();
    return `${mo} ${dd}, ${yr} at ${hr}:${mn}`;
}

export function uniqueId(len = 8) {
    return Math.random().toString(36).substr(2, len);
}

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

export async function getRemoteFile(url, signal) {
    let r = {};
    // add delay for testing
    // url = `http://slowwly.robertomurray.co.uk/delay/5000/url/${url}`;
    await fetch(url, {signal}).then(response => {
        if (!response.ok) throw Error(response.statusText);
        return response.text();
    }).then(text => {
        r.contents = text;
    }).catch(error => {
        console.log(error);
        r.error = "Remote url bad response!";
    });
    return r;
}

export function validateURL(url) {
    if (
        (!url.startsWith("https://") && !url.startsWith("http://"))
        || (!url.endsWith(".css") && !url.endsWith(".js"))
    ) {
        return false;
    }
    return true;
}

export function  newScriptDefault(description, name, type) {
    if (type === "css") {
        return `/* ==UserStyle==\n@name        ${name}\n@description ${description}\n==/UserStyle== */`;
    } else if (type === "js") {
        return `// ==UserScript==\n// @name        ${name}\n// @description ${description}\n// @match       *://*.*\n// ==/UserScript==`;
    }
}

export function parse(str) {
    if (typeof str != "string") return null;
    const blocksReg = /(?:(\/\/ ==UserScript==\r?\n([\S\s]*?)\r?\n\/\/ ==\/UserScript==)([\S\s]*)|(\/\* ==UserStyle==\r?\n([\S\s]*?)\r?\n==\/UserStyle== \*\/)([\S\s]*))/;
    const blocks = str.match(blocksReg);

    if (!blocks) return null;

    const metablock = (blocks[1] != null) ? blocks[1] : blocks[4];
    const metas = (blocks[2] != null) ? blocks[2] : blocks[5];
    const code = (blocks[3] != null) ? blocks[3].trim() : blocks[6].trim();

    const metadata = {};
    const metaArray = metas.split("\n");
    metaArray.forEach(function(m) {
        var parts = m.trim().match(/@([\w-]+)\s+(.+)/);
        if (parts) {
            metadata[parts[1]] = metadata[parts[1]] || [];
            metadata[parts[1]].push(parts[2]);
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
