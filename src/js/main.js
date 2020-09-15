"use strict";

// app
const ___a = {
    blacklistInput: document.querySelector("#blacklist textarea"),
    blacklistStatus: document.getElementById("blacklistStatus"),
    changeSaveLocationButton: document.getElementById("changeSaveLocation"),
    language: "en",
    linkDocs: "https://github.com/quoid/userscripts#readme",
    linkDonate: "https://github.com/quoid/userscripts",
    linkHomepage: "https://github.com/quoid/userscripts",
    loaded: false,
    settings: null,
    applySettings: function(settings) { // arg1 obj
        for (const setting in settings) {
            // all setting elements have the same id as the setting name
            const el = document.getElementById(setting);
            settings[setting] = this.settingType(setting, settings[setting]);
            if (el) {
                // if element is a checkbox
                if (___h.hasClass(el, "cb")) {
                    el.checked = settings[setting];
                }
                // tabSize is a select element
                if (setting === "tabSize") {
                    el.value = settings[setting];
                }
                // saveLocation is a string
                if (setting === "saveLocation" || setting == "version") {
                    el.innerText = settings[setting];
                }
                // blacklist
                if (setting === "blacklist") {
                    this.blacklistInput.value = settings[setting].join(", ");
                }
            }
        }
    },
    blacklistUpdate: function(e) {
        // get saved blacklist from settings
        const savedBlacklist = ___a.settings.blacklist;
        //const blSettings = savedBlacklist.split(",").map(item => item.trim());
        // get value from blacklist textarea
        const val = ___a.blacklistInput.value;
        // convert to array, trim and remove empties
        const blNew = val.split(",").map(item => item.trim()).filter(n => n);
        // want to sort for the check but keep the user inputted order intact
        // so clone new blacklist for comparison
        const blNewSort = [...blNew];
        // if the user has changed the blacklist
        if (savedBlacklist.sort().toString() != blNewSort.sort().toString()) {
            const data = {blacklist: blNew};
            // clear any previous timeout calls
            if (typeof this.blacklistTimeout === "number") {
                clearTimeout(this.blacklistTimeout);
            }
            // if blur or cmd+S event immediately dispatch message
            // for input events, delay message dispatch until user finishes input
            if (
                e.type === "blur"
                || (e.metaKey && e.keyCode === 83)
            ) {
                ___a.log("Attempting to save blacklist changes");
                safari.extension.dispatchMessage("REQ_BLACKLIST_SAVE", data);
                ___a.blacklistStatus.classList.remove("saved");
                ___a.blacklistStatus.classList.add("saving");
            }
        }
    },
    changeSaveLocation: function() {
        const message = ___a.getString("changeSaveLocationMessage");
        if (confirm(message)) {
            window.open("userscriptsurlscheme:changesavelocation");
            safari.extension.dispatchMessage("REQ_CHANGE_SAVE_LOCATION");
        } else {
            return;
        }
    },
    changeSetting: function(el, val) { // arg1 dom element // arg2 str
        val = JSON.parse(val);
        if (___h.hasClass(el, "cb")) {
            // checkbox
            el.checked = val;
            el.disabled = false;
        }
        if (el.id === "hideDescriptions") {
            if (val) {
                document.body.classList.add("no-descriptions");
            } else {
                document.body.classList.remove("no-descriptions");
            }
        }
        if (el.id === "tabSize") {
            // select element
            ___e.editor.setOption("indentUnit", val);
            el.disabled = false;
        }
        this.settings[el.id] = val;
        ___e.editor.setOption(el.id, val);
        ___a.log(`Successful setting change, ${el.id} to ${val}`);
    },
    getString: function(str) {
        // returns translated string
        return ___m[this.language][str]["message"];
    },
    handleMessage: function(e) {
        const data = e.message.data;
        const error = e.message.error;
        const name = e.name;
        ___a.log(`Incoming message with name - ${name}`);
        if (name === "RESP_ALL_SCRIPTS") {
            if (error) {
                console.error(error);
                return;
            }
            ___s.updateScripts(data);
            // this is the last step in initializing app on page load
            // check if there's a query string in url
            // then set loaded var to true to prevent further checking
            if (___a.loaded != true) { ___a.processQueryString(); }
            ___a.loaded = true;
        }
        if (name === "RESP_BLACKLIST_SAVE") {
            if (error) {
                console.error(error);
                return;
            }
            // blacklist is saved as a string
            ___a.settings.blacklist = data["blacklist"];
            ___a.log("Successfully updated blacklist");
            setTimeout(function() {
                blacklistStatus.classList.remove("saving");
                blacklistStatus.classList.add("saved");
            }, 350);
        }
        if (name === "RESP_INIT_DATA") {
            if (error) {
                console.error(error);
                return;
            }
            ___a.init(data);
        }
        if (name === "RESP_DISABLE_SCRIPT"|| name === "RESP_ENABLE_SCRIPT") {
            var id;
            if (error) {
                // find the disabled toggle, and re-enable it
                const cbs = "#scripts .cb";
                document.querySelectorAll(cbs).forEach(function(el) {
                    if (el.disabled) {
                        id = el.closest(".script").getAttribute("data-id");
                        el.disabled = false;
                    }
                });
                console.error(error, id);
                return;
            }
            id = data["id"];
            const el = document.querySelector(`[data-id="${id}"`);
            const cb = el.querySelector(".cb");
            const parent = el.closest(".script");
            // remove event listener in order to toggle checkbox
            cb.removeEventListener("click", ___s.scriptToggle);
            // re-enable checkbox
            cb.disabled = false;
            cb.click();
            // set event listener again
            cb.addEventListener("click", ___s.scriptToggle);
            if (!cb.checked) {
                parent.classList.add("disabled");
                parent.classList.remove("enabled");
                ___a.log(`Disabled ${id}`);
            } else {
                parent.classList.add("enabled");
                parent.classList.remove("disabled");
                ___a.log(`Enabled ${id}`);
            }
        }
        if (name === "RESP_OPEN_SAVE_LOCATION") {
            if (error) {
                console.error(error);
                return;
            }
        }
        if (name === "RESP_SCRIPT_DELETE") {
            var id;
            if (error) {
                alert(___a.getString("deleteFailAlert"));
                const m = ___a.getString("deleteFailStatus");
                document.getElementById("status").innerText = m;
                ___e.setStatus(___e.oldStatus, 3000);
                ___e.buttonDelete.classList.remove("disabled");
                console.error(error);
                return;
            }
            id = data["id"];
            ___e.deleteScript(id);
        }
        if (name === "RESP_SCRIPT_SAVE") {
            if (error) {
                alert(___a.getString("saveFailAlert"));
                const m = ___a.getString("saveFailStatus");
                document.getElementById("status").innerText = m;
                ___e.setStatus(___e.oldStatus, 3000);
                document.body.classList.remove("saving");
                ___e.editor.setOption("readOnly", false);
                ___e.editor.focus();
                return;
            }
            ___e.save(data);
        }
        if (name === "RESP_SETTING_CHANGE") {
            var id;
            if (error) {
                // find the disabled toggle, and re-enable it
                const cbs = "#settings .cb";
                document.querySelectorAll(cbs).forEach(function(el) {
                    if (el.disabled) {
                        id = el.id;
                        el.disabled = false;
                    }
                });
                console.error(error, id);
                return;
            }
            id = data["id"];
            const val = data["value"];
            const el = document.getElementById(id);
            ___a.changeSetting(el, val);
        }
        if (name === "RESP_SINGLE_SCRIPT") {
            if (error) {
                console.error(error);
                document.querySelector(".active").classList.remove("active");
                document.body.classList.remove("editor-loading");
                return;
            }
            ___e.loadScript(data);
        }
    },
    init: function(settings) { // arg1 obj
        // save the app settings to settings object
        this.settings = settings;
        this.log("App initialization started");
        // remove suffix (en-GB) from language code
        let langCode = this.settings.languageCode;
        langCode = langCode.includes("-") ? langCode.split("-")[0] : langCode;
        langCode = !(langCode in ___m) ? "en" : langCode;
        langCode = "en"; // only support en for now
        this.language = langCode;
        document.documentElement.setAttribute("lang", langCode);
        // apply settings to elements
        this.applySettings(this.settings);
        // add event listener to settings inputs
        const saveLocation = document.getElementById("saveLocation");
        const tabSize = document.getElementById("tabSize");
        const toggles = document.querySelectorAll("#settings .toggle .cb");
        toggles.forEach(function(toggle) {
            toggle.addEventListener("click", function(e) {
                e.preventDefault();
                const data = {id: this.id, value: this.checked};
                // if turning ON linting, need special value
                // if (this.id === "lint" && this.checked) {
                //     data["value"] = { "asi": true, "esversion": 6 };
                // }
                data["value"] = data["value"].toString();
                safari.extension.dispatchMessage("REQ_SETTING_CHANGE", data);
                this.disabled = true;
                ___a.log(`Try setting change, ${this.id} to ${data["value"]}`);
            });
        });
        tabSize.addEventListener("input", function(e) {
            const data = {id: this.id, value: this.value};
            data["value"] = data["value"].toString();
            safari.extension.dispatchMessage("REQ_SETTING_CHANGE", data);
            this.disabled = true;
            ___a.log(`Try setting change, ${this.id} to ${data["value"]}`);
        });
        saveLocation.addEventListener("click", function(e) {
            e.preventDefault();
            safari.extension.dispatchMessage("REQ_OPEN_SAVE_LOCATION");
        });
        // blacklist input functionality
        this.blacklistInput.addEventListener("blur", this.blacklistUpdate);
        this.blacklistInput.addEventListener("keydown", this.blacklistUpdate);

        // changeSaveLocation button functionality
        this.changeSaveLocationButton.addEventListener("click", this.changeSaveLocation);

        // disable the default cmd+S browser key command
        document.addEventListener("keydown", function(e) {
            if (e.metaKey && e.keyCode === 83) { e.preventDefault(); }
        });
        // add classes from settings
        if (this.settings.hideDescriptions) {
            document.body.classList.add("no-descriptions");
        }
        this.localize();
        ___e.init();
        ___s.init();
        document.body.classList.remove("init");
        this.log("App initialization complete");
    },
    localize: function() {
        // iterate through all elements that have data-localize attr
        // inject translated string into appropiate elements
        // log error if element has attr but there's no translated string
        this.log("Localization started", "CadetBlue");
        const els = document.querySelectorAll("[data-localize]");
        els.forEach(function(el) {
            const id = el.getAttribute("data-localize");
            if (Object.keys(___m[this.language]).includes(id)) {
                const msg = ___m[this.language][id]["message"];
                if (el.hasAttribute("placeholder")) {
                    el.setAttribute("placeholder", msg);
                } else if (el.hasAttribute("title")) {
                    el.setAttribute("title", msg);
                } else if (el.firstChild) {
                    if (el.firstChild.nodeValue.trim() === "init") {
                        el.innerHTML = msg;
                    }
                }
                this.log(`Localized ${id} with string "${msg}"`, "#7cd3d6");
            } else {
                console.error("No translation provided for element", el);
            }
        }, this);
        this.log("Localization complete","CadetBlue");
        // add links to elements
        const sl = document.getElementById("supportLink");
        const st = document.querySelector(`[data-localize="settingsText"]`);
        sl.setAttribute("href", this.linkDocs);
        sl.setAttribute("target", "_blank");
        st.getElementsByTagName("a")[0].setAttribute("href", this.linkHomepage);
        st.getElementsByTagName("a")[0].setAttribute("target", "_blank");
        st.getElementsByTagName("a")[1].setAttribute("href", this.linkDonate);
        st.getElementsByTagName("a")[1].setAttribute("target", "_blank");
    },
    log: function(msg, color = "blue") { // arg1 string, arg2 string
        if (this.settings && this.settings.verbose === true) {
            const style = `color: ${color}; font-weight: bold`;
            console.log(`%c⚉ %c${msg}`, style, "font-style: normal");
        }
    },
    parseQueryString: function() {
        const params = new URLSearchParams(window.location.search);
        let paramObj = {};
        for (const val of params.keys()) {
            paramObj[val] = params.get(val);
        }
        return paramObj;
    },
    processQueryString: function() {
        this.log("Checking url for query string","CadetBlue");
        const qs = this.parseQueryString();
        if (Object.keys(qs).length === 0) {
            this.log("No query string found in url","CadetBlue");
            return null;
        }
        if ("script" in qs) {
            const id = qs["script"];
            const el = document.querySelector(`[data-id="${id}"]`);
            if (!el) {
                // if param targets an element that does not exist in DOM
                console.info("Removed bad url param", window.location.search);
                this.removeQueryString();
                return;
            } else {
                // script element does exist, click it to load
                //const m = `%cLoading script from query string, ${id}`;
                this.log(`Loading ${id} from query string`,"CadetBlue");
                el.click();
            }
        } else {
            this.removeQueryString();
            this.log("Removed invalid query string","CadetBlue");
        }
    },
    removeQueryString: function() {
        const url = window.location.href.split("?")[0];
        history.pushState(null, "", url.toString());
    },
    setQueryString: function(key, value) {
        var searchParams = new URLSearchParams(window.location.search);
        searchParams.set(key, value);
        var param = window.location.pathname + '?' + searchParams.toString();
        history.pushState(null, "", param);
    },
    settingType: function(id, val) { // arg1/arg2 str
        // these settings are strings, avoid long if conditions
        const strings = ["blacklist", "languageCode", "saveLocation", "version"];
        // set the proper setting value type by setting id
        var newVal;
        if (id === "tabsize") {
            // tabSize is int
            newVal = parseInt(val, 10);
        } else if (strings.includes(id)) {
            newVal = val;
        } else {
            // everything else is a boolean
            newVal = JSON.parse(val);
        }
        return newVal;
    }
};

// editor
const ___e = {
    buttonDelete: document.getElementById("deleteScript"),
    buttonDiscard: document.getElementById("discard"),
    buttonDownload: document.getElementById("downloadScript"),
    buttonSave: document.getElementById("save"),
    editor: null,
    editorElement: document.querySelector("#code textarea"),
    oldStatus: null,
    savedCode: null,
    sessionCode: null,
    timeoutID: null,
    changed: function() {
        // if user has edited a script but not yet saved changed
        if (this.sessionCode === null) {
            return false;
        } else if (this.sessionCode.localeCompare(this.savedCode) === 0) {
            return false;
        } else {
            return true;
        }
    },
    deleteScript: function(id) {
        // unload editor
        document.body.classList.remove("editor-css", "editor-js");
        this.editor.setValue("");
        this.savedCode = null;
        this.sessionCode = null;
        // remove script element from sidebar
        const el = document.querySelector(`[data-id="${id}"]`);
        el.remove();
        ___a.removeQueryString();
        ___s.updateScriptCount();
        ___e.buttonDelete.classList.remove("disabled");
        ___e.editor.setOption("readOnly", false);
    },
    discard: function() {
        // disable discard functionality for temp scripts
        if (document.querySelector(".script.temp")) {
            return;
        }
        ___e.editor.setValue(___e.savedCode);
        ___e.sessionCode = null;
        ___e.toggleButtonState("disable");
        ___e.editor.focus();
    },
    downloadScript: function() {
        const activeScript = document.querySelector(".script.active");
        const activeTitle = activeScript.querySelector(".title").innerText;
        const code = ___e.editor.getValue();
        const editorTitle = document.querySelector("#editor .title").innerText;
        const filename = activeScript.getAttribute("data-id");
        const link = document.createElement("a");
        // ensure the active script title and editor title match
        if (!activeTitle === editorTitle) {
            console.error("Active script doesn't match editor script");
            return;
        }
        link.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(code));
        link.setAttribute("download", filename);
        link.style.display = "none";
        document.body.appendChild(link);
        ___a.log(`Downloading ${filename}`, "seagreen");
        link.click();
        document.body.removeChild(link);
    },
    init: function() {
        ___a.log("Editor initiliazation started", "seagreen");
        document.body.classList.add("editor-loading");
        // create a CodeMirror instance
        this.editor = CodeMirror.fromTextArea(this.editorElement, {
            autoCloseBrackets: true,
            foldGutter: true,
            indentUnit: ___a.settings.tabSize,
            lineNumbers: true,
            lineWrapping: true,
            lint: ___a.settings.lint,
            matchBrackets: true,
            mode:  "javascript",
            smartIndent: true,
            styleActiveLine: true,
            showInvisibles: ___a.settings.showInvisibles,
            tabSize: ___a.settings.tabSize,
            hintOptions: {
                useGlobalScope: true
            },
            gutters: [
                "CodeMirror-lint-markers",
                "CodeMirror-linenumbers",
                "CodeMirror-foldgutter"
            ],
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Cmd-S": function() {
                    ___e.saveTry();
                },
                "Cmd-/": "toggleComment",
                "Ctrl-Q": function(cm) {
                    cm.foldCode(cm.getCursor());
                },
                Tab: function(cm) {
                    var s = Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(s);
                }
            }
        });
        this.editor.on("change", this.onChange);
        this.editor.on("keydown", this.onKeydown);
        this.buttonDelete.addEventListener("click", function(e) {
            if (!confirm(___a.getString("delete"))) {
                return;
            }
            const active = document.querySelector(".script.active");
            const id = active.getAttribute("data-id");
            ___e.editor.setOption("readOnly", "nocursor");
            ___e.buttonDelete.classList.add("disabled");
            ___e.oldStatus = document.getElementById("status").innerText;
            if (active.classList.contains("temp")) {
                // is a temp script, just remove
                ___e.deleteScript(id);
            } else {
                const data = {id: id};
                safari.extension.dispatchMessage("REQ_SCRIPT_DELETE", data);
            }
        });
        this.buttonDiscard.addEventListener("click", this.discard);
        this.buttonDownload.addEventListener("click", this.downloadScript);
        this.buttonSave.addEventListener("click", this.saveTry);
        document.body.classList.remove("editor-loading");
        ___a.log("Editor initiliazation complete", "seagreen");
    },
    loadScript: function(scriptData) { // arg1 obj
        // need content, filename, last modified, name, type
        const content = scriptData["content"];
        const filename = scriptData["filename"];
        const lastModified = scriptData["lastModified"];
        const name = scriptData["name"];
        const type = scriptData["type"];
        const scriptElement = document.querySelector(`[data-id="${filename}"]`);
        let status = "";
        // ensure the script just loaded has the active class
        // that way if a script is loaded without clicking, it becomes active
        ___s.scriptMakeActive(scriptElement);
        // set the script element's id as the url parameter
        ___a.setQueryString("script", filename);
        document.body.classList.remove("editor-css", "editor-js");
        document.querySelector("#editor .title").innerText = name;
        this.setMode(type);
        this.editor.setValue(content);
        this.savedCode = content;
        this.sessionCode = null;
        this.editor.clearHistory();
        this.editor.focus();
        // editor status message will differ if loaded script is temp
        if (___h.hasClass(scriptElement, "temp")) {
            status = ___a.getString("newScriptStatus");
            // enable the save button for temp scripts
            this.buttonSave.removeAttribute("disabled");
        } else {
            // ensure discard and save button are disabled after loading
            this.toggleButtonState("disable");
            status = ___a.getString("lastModified") + " " + lastModified;
        }
        this.setStatus(status);
        document.body.classList.remove("editor-loading");
        ___a.log(`Loaded script - ${filename}`, "seagreen");
    },
    onChange: function(e, c) {
        // if active script is a temp script, keep buttons active until save
        if (___h.hasClass(document.querySelector(".script.active"), "temp")) {
            return;
        }
        const inputAction = c.origin;
        if (inputAction !== "setValue") {
            ___e.sessionCode = e.getValue();
            ___e.toggleButtonState("enable");
        }
        if (inputAction === "undo" || inputAction === "redo") {
            if (!___e.changed()) {
                ___e.toggleButtonState("disable");
            }
        }
    },
    onKeydown: function(cm, e) {
        // automatically show hints when consitions met
        // TO DO: Check user settings whether or not to auto show hints
        // TO DO: comment on what each check does
        const currentLinePosition = cm.getCursor()["ch"];
        if (
            !cm.state.completionActive
            && e.metaKey === false
            && e.keyCode >= 65
            && e.keyCode <= 90
            && currentLinePosition != 0
            && !(e.keyCode == 81
            && e.ctrlKey)
            && ___a.settings.autoShowHints != false
        ) {
            cm.showHint({completeSingle: false});
        }
    },
    saveTry: function() {
        // if save buttons is disabled (no changes to save) OR save in progress
        if (
            ___e.buttonSave.disabled
            || ___h.hasClass(document.body, "saving")
        ) {
            return;
        }
        document.body.classList.add("saving");
        ___e.oldStatus = document.getElementById("status").innerText;
        ___e.setStatus(___a.getString("saveStart"), 0);
        // disable editor input
        ___e.editor.setOption("readOnly", "nocursor");
        // get editor content, script id (old filename) & script type
        // send to app extension to validate + save
        const data = {
            content: ___e.editor.getValue(),
            id: document.querySelector(".active").getAttribute("data-id"),
            type: document.querySelector(".active").getAttribute("data-type")
        };
        safari.extension.dispatchMessage("REQ_SCRIPT_SAVE", data);
    },
    save: function(scriptData) { // arg1 obj
        const editor = document.getElementById("editor");
        const editorName = editor.querySelector(".title");
        const active = document.querySelector(".active");
        const activeName = active.querySelector(".title");
        const activeDesc = active.querySelector(".description");
        const desc = scriptData["description"];
        const id = scriptData["id"];
        const lastModified = scriptData["lastModified"];
        const name = scriptData["name"];
        editorName.innerText = name;
        this.savedCode = this.sessionCode;
        activeName.innerText = name;
        activeDesc.innerText = desc;
        active.setAttribute("data-mod", scriptData["lastModifiedMS"]);
        active.setAttribute("data-id", id);
        active.setAttribute("title", name + "\n" + desc);
        active.classList.remove("temp");
        let status = ___a.getString("saveSuccess");
        document.getElementById("status").innerText = status;
        status = ___a.getString("lastModified") + " " + lastModified;
        this.setStatus(status, 3000);
        ___e.editor.setOption("readOnly", false);
        this.toggleButtonState("disable");
        ___s.sortScripts();
        ___a.setQueryString("script", id);
        document.body.classList.remove("saving");
        ___e.editor.focus();
    },
    setMode: function(mode) { // arg1 str
        // sets the editor mode and body class for styling purposes
        document.body.classList.add(`editor-${mode}`);
        mode = mode === "js" ? "javascript" : mode;
        try {
            this.editor.setOption("mode", mode);
            ___a.log(`Set editor mode to ${mode}`, "seagreen");
        } catch (error) {
            console.error("Unable to set editor mode", error);
        }
    },
    setStatus: function(msg, delayMs = 0) { // arg1 str, arg2 int
        // clear any previous setStatus timeout calls
        if (typeof this.timeoutID === "number") {
            clearTimeout(this.timeoutID);
        }
        this.timeoutID = setTimeout(function() {
            document.getElementById("status").innerText = msg;
        }, delayMs);
    },
    toggleButtonState: function(state) {
        // toggles the state for the discard & save buttons only
        if (state === "enable") {
            this.buttonDiscard.removeAttribute("disabled");
            this.buttonSave.removeAttribute("disabled");
        } else if (state === "disable") {
            this.buttonDiscard.setAttribute("disabled", true);
            this.buttonSave.setAttribute("disabled", true);
        } else {
            console.error("Invalid editor button state");
        }
    }
};

// sidebar
const ___s = {
    buttonAddNewScript: document.getElementById("new"),
    buttonNewCSS: document.getElementById("newCSS"),
    buttonNewJS: document.getElementById("newJS"),
    buttonSettingsShow: document.getElementById("settingsShow"),
    buttonSettingsHide: document.getElementById("settingsHide"),
    filterBar: document.querySelector("#filter input"),
    scriptsContainer: document.getElementById("scripts"),
    scrollOptions: { // options description: https://stackoverflow.com/a/48635751
        behavior: "auto",
        block: "nearest",
        inline: "start"
    },
    settingsOverlay: document.getElementById("settings"),
    createNewScript: function(type) {
        // check if editor has unsaved changed OR there's an unsaved temp script
        if (___e.changed() || document.querySelector(".temp")) {
            if (!confirm(___a.getString("unsavedChanges"))) {
                return;
            }
        }
        // if temp script el already exists, remove it
        if (document.querySelector(".temp")) {
            const id = document.querySelector(".temp").getAttribute("data-id");
            this.deleteScript(id);
        }
        const r = Math.random().toString(36).substr(2,5);
        const description = ___a.getString("newScript");
        const name = `NewScript-${r}`;
        const filename = `${name}.${type}`;
        const elData = {
            description: description,
            disabled : false,
            filename: filename,
            name: name,
            type: type
        };
        const loadData = {
            content: ___h.userscriptDefault(description, name, type),
            filename: filename,
            name: name,
            type: type
        };
        const el = this.createScriptElement(elData);
        const loc = document.querySelector(".loader-scripts");
        el.classList.add("temp");
        loc.insertAdjacentElement("afterend", el);
        this.updateScriptCount();
        el.scrollIntoView(this.scrollOptions);
        ___a.log(`Created temporary script, ${filename}`, "darkorchid");
        ___e.loadScript(loadData);
    },
    createScriptElement: function(obj) { // arg1 obj
        // need description, disabled status, filename, name, type
        const clone = document.getElementById("placeholder").cloneNode(true);
        clone.removeAttribute("id");
        clone.classList.add("enabled");
        clone.querySelector(".description").innerText = obj["description"];
        clone.setAttribute("title", obj["name"] + "\n" + obj["description"]);
        clone.setAttribute("data-id", obj["filename"]);
        clone.setAttribute("data-mod", obj["lastModifiedMS"]);
        clone.querySelector(".title").innerText = obj["name"];
        clone.setAttribute("data-type", obj["type"]);
        if (obj["disabled"] === true) {
            clone.classList.remove("enabled");
            clone.classList.add("disabled");
            clone.querySelector(".cb").removeAttribute("checked");
        }
        clone.addEventListener("click", this.scriptClick);
        clone.querySelector(".cb").addEventListener("click", this.scriptToggle);
        return clone;
    },
    deleteScript: function(id) {
        document.querySelector(`[data-id="${id}"]`).remove();
        ___a.log(`Removed script, ${id}`, "darkorchid");
        this.updateScriptCount();
    },
    disabled: function() {
        // when app has the following classes, the sidebar should be "disabled"
        if (___h.hasClass(document.body, "editor-loading", "scripts-loading")) {
            return true;
        }
        return false;
    },
    dropdown: function() {
        // toggle the class that shows dropdown
        this.parentElement.classList.toggle("show");
        // add event listener to body, to hide dropdown when off click
        // remove event listener once dropdown is hidden
        document.body.addEventListener("click", function _a(e) {
            if (e.target.id != "new") {
                document.querySelector(".dropdown").classList.remove("show");
                this.removeEventListener("click", _a, true);
            }
        }, true);
    },
    filter: function() {
        // nodelist that holds all non-hidden script element IDs
        const scripts = document.querySelectorAll(".script:not(#placeholder)");
        // create array that will hold all visible script elements
        const visible = [];
        // create array of input values
        const vals = this.value.trim().toLowerCase().split(" ");
        // create new array of all possible flags in the input value array
        const flags = vals.filter(v => v.startsWith("!"));
        // filter out flags from input value and create search term(s)
        const search = vals.filter(v => flags.indexOf(v) < 0).join(" ").trim();
        // valid flag terms
        const validFlags = ["!js", "!css", "!disabled", "!enabled"];

        // hide/show script elements by search term(s), update visible array
        scripts.forEach(function(script) {
            let title = script.querySelector(".title").innerText;
            title = title.trim().toLowerCase();
            if (title.includes(search)) {
                visible.push(script.getAttribute("data-id"));
                script.removeAttribute("style");
            } else {
                script.style.display = "none";
            }
        });

        // scripts container starts with .show-all class
        // once a valid flag is detected, the .show-all class is removed
        // and then the class for that specific type is added, ex .show-css
        // with each subsequent valid flag, respective show class added
        // this is "additive flag filtering"
        // when no flags are detected, the .show-all class is added back
        const container = document.getElementById("scripts");
        if (flags.some(v => validFlags.includes(v))) {
            container.classList.remove("show-all");
            if (flags.includes("!css")) {
                container.classList.add("show-css");
            } else {
                container.classList.remove("show-css");
            }
            if (flags.includes("!js")) {
                container.classList.add("show-js");
            } else {
                container.classList.remove("show-js");
            }
            if (flags.includes("!disabled")) {
                container.classList.add("show-disabled");
            } else {
                container.classList.remove("show-disabled");
            }
            if (flags.includes("!enabled")) {
                container.classList.add("show-enabled");
            } else {
                container.classList.remove("show-enabled");
            }
            if (
                flags.includes("!css")
                && flags.includes("!js")
                && flags.includes("!disabled")
                && flags.includes("!enabled")
            ) {
                container.className = "";
                container.classList.add("show-all");
            }
        } else {
            container.className = "";
            container.classList.add("show-all");
        }
        // update script count
        ___s.updateScriptCount();
    },
    init: function() {
        ___a.log("Sidebar initiliazation started", "darkorchid");
        safari.extension.dispatchMessage("REQ_ALL_SCRIPTS");
        this.buttonAddNewScript.addEventListener("click", this.dropdown);
        this.buttonNewCSS.addEventListener("click", function() {
            ___s.createNewScript("css");
        });
        this.buttonNewJS.addEventListener("click", function() {
            ___s.createNewScript("js");
        });
        this.buttonSettingsHide.addEventListener("click", this.settingsHide);
        this.buttonSettingsShow.addEventListener("click", this.settingsDisplay);
        this.settingsOverlay.addEventListener("click", this.settingsHide);
        this.filterBar.addEventListener("input", this.filter);
        ___a.log("Sidebar initiliazation complete", "darkorchid");
    },
    scriptClick: function(e) {
        // ignore clicks from toggles, active scripts, or when sidebar disabled
        if (
            ___s.disabled()
            || ___h.hasClass(this, "active")
            || ___h.hasClass(e.target, "toggle", "cb")
            || e.target.tagName === "svg"
        ) {
            return;
        }
        // check if editor has unsaved changed OR there's an unsaved temp script
        if (___e.changed() || document.querySelector(".temp")) {
            if (!confirm(___a.getString("unsavedChanges"))) {
                return;
            }
        }
        // if temp script el already exists, remove it
        if (document.querySelector(".temp")) {
            const id = document.querySelector(".temp").getAttribute("data-id");
            ___s.deleteScript(id);
        }
        // set this script to active
        ___s.scriptMakeActive(this);
        // start the editor loading to prevent other script from being clicked
        document.body.classList.add("editor-loading");
        // request single script data by id
        const id = this.getAttribute("data-id");
        const data = { id: id };
        safari.extension.dispatchMessage("REQ_SINGLE_SCRIPT", data);
        ___a.log(`Attempting to load script - ${id}`, "darkorchid");
    },
    scriptMakeActive: function(el) {
        // el already has the active class
        if (___h.hasClass(el, "active")) {
            return;
        }
        // if another element is already active, deactivate it
        if (document.querySelector(".active")) {
            document.querySelector(".active").classList.remove("active");
        }
        el.classList.add("active");
        el.scrollIntoView(this.scrollOptions);
    },
    scriptToggle: function(e) {
        // prevent default checkbox behaviour, checking happens programatically
        e.preventDefault();
        const id = {id: this.closest(".script").getAttribute("data-id")};
        // need to reverse logic for expected results
        if (!this.checked) {
            ___a.log(`Attempting to disable ${id["id"]}`, "darkorchid");
            safari.extension.dispatchMessage("REQ_DISABLE_SCRIPT", id);
        } else {
            ___a.log(`Attempting to enable ${id["id"]}`, "darkorchid");
            safari.extension.dispatchMessage("REQ_ENABLE_SCRIPT", id);
        }
        // disable to prevent multiple event triggers
        this.disabled = true;
    },
    settingsDisplay: function() {
        document.body.classList.add("settings");
    },
    settingsHide: function(e) {
        e.stopPropagation();
        if (e.target.id === "settings" || e.target.closest("#settingsHide")) {
            document.body.classList.remove("settings");
        }
    },
    sortScripts: function() {
        const scripts = document.querySelectorAll(".script:not(#placeholder)");
        Array.from(scripts).sort(function(a, b) {
            const at = a.querySelector(".title").innerText.trim().toLowerCase();
            const bt = b.querySelector(".title").innerText.trim().toLowerCase();
            if (at < bt) {
                return -1;
            } else {
                return 1;
            }
        }).forEach(function(el) {
            ___s.scriptsContainer.appendChild(el);
        });
        // scroll to activ script
        if (document.querySelector(".active")) {
            document.querySelector(".active").scrollIntoView(this.scrollOptions);
        }
    },
    updateScriptCount: function() {
        const scripts = document.querySelectorAll(".script:not(#placeholder)");
        var count = 0;
        const el = document.getElementById("scriptCount");
        for (let i = 0; i < scripts.length; i++) {
            if (window.getComputedStyle(scripts[i], null).getPropertyValue("display") != "none") {
                count++;
            }
        }
        el.innerText = count;
    },
    updateScripts: function(arr) { // arg1 arr
        ___a.log("Update scripts started", "darkorchid");
        document.body.classList.add("scripts-loading");
        // remove any script elements already in sidebar
        document.querySelectorAll(".script[data-id]").forEach(function(e) {
            e.remove();
        });
        if (!arr || !arr.length) {
            // no scripts found
            ___a.log("No scripts to load", "darkorchid");
        } else {
            // iterate through array of scripts and create element in container
            arr.forEach(function(item, index) {
                const el = this.createScriptElement(item);
                this.scriptsContainer.appendChild(el);
                const m = `Loaded userscript - ${item["filename"]}`;
                ___a.log(m, "darkorchid");
            }, this);
        }
        ___a.log("Update scripts complete", "darkorchid");
        this.updateScriptCount();
        this.sortScripts();
        document.body.classList.remove("scripts-loading");
    }
};

window.onresize = function() {
    // when tab bar appears/disappears, it messes up 100vh height
    // check if this is needed in newer versions of safari
    document.documentElement.style.height = "100vh";
    setTimeout(function() {
        document.documentElement.removeAttribute("style");
    }, 50);
};

window.onload = function() {
    try {
        safari.extension.dispatchMessage("REQ_INIT_DATA");
    } catch(e) {
        const el = document.getElementById("notify");
        el.innerText = "Safari object inaccessible, make sure Safari is version 13+";
        el.style.display = "block";
        console.error(e);
    }
};
