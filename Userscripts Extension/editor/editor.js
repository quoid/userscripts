var loaded = false;
var savedCode = "";
var infoButton = document.getElementById("info");
var saveButton = document.getElementById("save");
var discardButton = document.getElementById("discard");
var downloadButton = document.getElementById("download");
var sessionCode = "";

function setEditorMessage(m) {
    document.getElementById("message").innerHTML = m;
}

function setVersion(v) {
    document.getElementById("version").innerHTML = v;
}

function enableButtons() {
    saveButton.removeAttribute("disabled");
    discardButton.removeAttribute("disabled");
}

function disableButtons() {
    saveButton.setAttribute("disabled", true);
    discardButton.setAttribute("disabled", true);
}

var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode:  "javascript",
    smartIndent: true,
    tabSize: 2,
    lineWrapping: true,
    lineNumbers: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    matchBrackets: true,
    hintOptions: {useGlobalScope: true},
    extraKeys: {"Ctrl-Space": "autocomplete", "Cmd-S": save, "Cmd-/": "toggleComment"}
});

editor.on("change", function(e, c) {
    var inputAction = c.origin;
    
    if (inputAction !== "setValue") {
        sessionCode = e.getValue();
        enableButtons();
    }
    
    if (inputAction === "undo" || inputAction === "redo") {
        if (sessionCode.localeCompare(savedCode) === 0) {
            disableButtons();
        }
    }
});

editor.on("keydown", function(cm, e) {
    var currentLinePosition = cm.getCursor()["ch"];
    if (!cm.state.completionActive && e.metaKey === false && e.keyCode >= 65 && e.keyCode <= 90 && currentLinePosition != 0) {
        cm.showHint({completeSingle: false});
    }
});

function getInfo() {
    window.webkit.messageHandlers.getInfo.postMessage("user wants info");
}
function downloadScript() {
    window.webkit.messageHandlers.downloadScript.postMessage("user wants to download script");
}

function discard() {
    editor.setValue(savedCode);
    disableButtons();
}

function save() {
    var code = editor.getValue();
    window.webkit.messageHandlers.saveCode.postMessage(escape(code));
    savedCode = code;
    sessionCode = "";
    setEditorMessage("All changes saved");
    disableButtons();
}

function setSaveDate(dateString) {
    setTimeout(function() {
        setEditorMessage("Last edited on " + dateString);
    }, 1500);
}

function loadCode(c) {
    var code = unescape(c);
    if (code.trim().length > 0 && loaded === false) {
        savedCode = code;
        editor.setValue(code);
        disableButtons();
        loaded = true;
    }
}

function webViewOnLoad() {
    if (loaded === false) {
        window.webkit.messageHandlers.webViewOnLoad.postMessage(loaded);
    }
}

infoButton.addEventListener("click", getInfo);
saveButton.addEventListener("click", save);
discardButton.addEventListener("click", discard);
downloadButton.addEventListener("click", downloadScript)
window.onload = webViewOnLoad;
