var ___userscripts = {
    cursor: "auto",
    editor: null,
    savedCode: null,
    sessionCode: null,
    toggleOff: null,
    discardButton: document.getElementById("discard"),
    downloadButton: document.getElementById("download"),
    editorElement: document.getElementById("code"),
    infoButton: document.getElementById("info"),
    saveButton: document.getElementById("save"),
    statusElement: document.getElementById("status"),
    toggleButton: document.getElementById("toggle"),
    getLanguageCode: function(langCode) {
        langCode = langCode.includes("-") ? langCode.split("-")[0] : langCode;
        langCode = !(langCode in ___strings) ? "en" : langCode;
        return "en";
    },
    toLocalizedString: function(str) {
        var langCode = document.body.getAttribute("lang");
        return ___strings[langCode][str];
    },
    setStatusText: function(str, isModificationDate = false) {
        if (isModificationDate) {
            str = this.toLocalizedString("modification_date") + " " + str;
        }
        this.statusElement.innerHTML = str;
    },
    getInfo: function() {
        window.webkit.messageHandlers.getInfo.postMessage("");
    },
    downloadScript: function() {
        window.webkit.messageHandlers.downloadScript.postMessage("");
    },
    toggle: function() {
        if (___userscripts.toggleOff === true) {
            ___userscripts.toggleOff = false;
            document.body.classList.remove("disabled");
            window.webkit.messageHandlers.setStatus.postMessage(false);
            if (___userscripts.savedCode != null) {
                window.webkit.messageHandlers.setModificationDate.postMessage("");
            } else {
                ___userscripts.setStatusText(___userscripts.toLocalizedString("status_ready"))
            }
        } else {
            ___userscripts.toggleOff = true;
            document.body.classList.add("disabled");
            ___userscripts.setStatusText(___userscripts.toLocalizedString("status_disabled"));
            window.webkit.messageHandlers.setStatus.postMessage(true);
        }
    },
    enableButtons: function() {
        this.saveButton.removeAttribute("disabled");
        this.discardButton.removeAttribute("disabled");
    },
    disableButtons: function() {
        this.saveButton.setAttribute("disabled", true);
        this.discardButton.setAttribute("disabled", true);
    },
    discard: function() {
        ___userscripts.editor.setValue(___userscripts.savedCode);
        ___userscripts.disableButtons();
        ___userscripts.editor.focus();
    },
    saveTry: function() {
        if (!___userscripts.saveButton.disabled) {
            var code = ___userscripts.editor.getValue();
            window.webkit.messageHandlers.saveCode.postMessage(code);
            ___userscripts.disableButtons();
            ___userscripts.setStatusText(___userscripts.toLocalizedString("status_saving"));
        }
    },
    saveSucceed: function(newlySavedCode) {
        this.savedCode = unescape(newlySavedCode);
        this.sessionCode = "";
        this.setStatusText(this.toLocalizedString("status_save_succeed"));
    },
    saveFail: function() {
        this.setStatusText(this.toLocalizedString("status_save_fail"));
        this.enableButtons();
    },
    mouseOverListen: function(e) {
        var sourceElement = e.srcElement;
        var cursorValue = getComputedStyle(sourceElement).cursor;
        if (cursorValue != this.currentCursor) {
            this.currentCursor = cursorValue;
            window.webkit.messageHandlers.setCursor.postMessage(cursorValue);
        }
    },
    editorOnChange: function(e, c) {
        var inputAction = c.origin;

        if (inputAction !== "setValue") {
            ___userscripts.sessionCode = e.getValue();
            ___userscripts.enableButtons();
        }
        
        if (inputAction === "undo" || inputAction === "redo") {
            if (___userscripts.sessionCode.localeCompare(___userscripts.savedCode) === 0) {
                ___userscripts.disableButtons();
            }
        }
    },
    editorOnKeydown: function(cm, e) {
        var currentLinePosition = cm.getCursor()["ch"];
        if (!cm.state.completionActive && e.metaKey === false && e.keyCode >= 65 && e.keyCode <= 90 && currentLinePosition != 0 && !(e.keyCode == 81 && e.ctrlKey)) {
            cm.showHint({completeSingle: false});
        }
    },
    startEditor: function() {
        this.editor = CodeMirror.fromTextArea(this.editorElement, {
            autoCloseBrackets: true,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Cmd-S": function() {
                    ___userscripts.saveTry();
                },
                "Cmd-/": "toggleComment",
                "Ctrl-Q": function(cm) {
                    cm.foldCode(cm.getCursor());
                },
                Tab: function(cm) {
                    var s = Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(s);
                }
            },
            hintOptions: {
                useGlobalScope: true
            },
            indentUnit: 2,
            lineNumbers: true,
            lineWrapping: true,
            matchBrackets: true,
            mode:  "javascript",
            smartIndent: true,
            styleActiveLine: true,
            tabSize: 2,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        });
        
        //add event listeners for the editor
        this.editor.on("change", this.editorOnChange);
        this.editor.on("keydown", this.editorOnKeydown);
        
        if (this.savedCode != null) {
            this.editor.setValue(this.savedCode);
        }
        //focus the editor
        this.editor.focus();
        
        //tell VC that editor is ready
        window.webkit.messageHandlers.webViewReady.postMessage("");
        
    },
    init: function(langCode, version, toggle, code) {
        //set the language code on the body element
        document.body.setAttribute("lang", this.getLanguageCode(langCode));
        
        //set the version number in the version element
        document.getElementById("version").innerHTML = version;
        
        //set toggle status
        if (JSON.parse(toggle) === true) {
            this.toggleOff = true;
            document.body.classList.add("disabled");
            this.setStatusText(___userscripts.toLocalizedString("status_disabled"))
        } else {
            this.toggleOff = false;
            this.setStatusText(___userscripts.toLocalizedString("status_ready"))
        }
        
        //set the saved code
        if (code != null) {
            this.savedCode = unescape(code);
        }
        
        //load the init text for the various DOM elements
        this.editorElement.placeholder = this.toLocalizedString("editor_placeholder");
        this.saveButton.innerHTML = this.toLocalizedString("button_save");
        this.discardButton.innerHTML = this.toLocalizedString("button_discard");
        
        //add event listeners
        this.downloadButton.addEventListener("click", this.downloadScript);
        this.infoButton.addEventListener("click", this.getInfo);
        this.toggleButton.addEventListener("click", this.toggle);
        this.discardButton.addEventListener("click", this.discard);
        this.saveButton.addEventListener("click", this.saveTry);
        document.addEventListener("mouseover", this.mouseOverListen);
        
        //start the editor
        this.startEditor();
        
    },
    windowLoad: function() {
        var code = `console.log('foo');`;
        var tog = true;
        this.init("en-GB", "v1.4.0", tog, code);
    }
};

//window.onload = ___userscripts.windowLoad();
