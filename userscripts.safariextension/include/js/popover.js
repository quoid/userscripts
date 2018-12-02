(function() {
    "use strict";

    var infoButton = document.getElementById("info");
    var saveButton = document.getElementById("save");
    var discardButton = document.getElementById("discard");
    var downloadButton = document.getElementById("download");
    var initMessage = "Ready for code";
    var sessionCode = "";


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

    function formatTime(t) {
        var d = new Date(t);
        var date = d.toString().split(" ", 4).join(" "); //outputs Wed Apr 19 2017
        var time = d.toString().split(" ")[4]; //outpts 00:25:35
        var timezone = d.toString().split(" ")[6]; //outputs (EDT)
        var hours = time.slice(0, -6); //outputs 00, 01, 13 etc...
        var period = "AM";
        if (hours >= 13) {
            hours = hours - 12;
            period = "PM";
        }
        if (hours === "12") {
            hours = "12";
            period = "PM";
        }
        if (hours === "00") {
            hours = "12";
        }
        hours = ("0" + hours).slice(-2); //adds 0 in front of all hours, takes the last 2 integers
        var mins = time.split(":")[1]; //just the minutes
        var output = date + " " + hours + ":" + mins + " " + period;
        return output;
    }

    function setEditorMessage(m) {
        document.getElementById("message").innerHTML = m;
    }

    function enableButtons() {
        saveButton.removeAttribute("disabled");
        discardButton.removeAttribute("disabled");
    }
    
    function disableButtons() {
        saveButton.setAttribute("disabled", true);
        discardButton.setAttribute("disabled", true);
    }
    
    function popoverOpen() {
        //the user hasn't created custom code
        if (sessionCode.length < 1) {
            disableButtons();
            //the user has previously saved code
            if (safari.extension.globalPage.contentWindow.localStorage.length > 0) {
                //load the saved code
                editor.setValue(safari.extension.globalPage.contentWindow.localStorage.getItem("code"));
                //set last edit date
                setEditorMessage("Last edited " + safari.extension.globalPage.contentWindow.localStorage.getItem("date"));
            //the user has NOT previously saved code
            } else {
                setEditorMessage(initMessage);
            }
        //the user has created custom code
        } else {
            //the user has previously saved code
            if (safari.extension.globalPage.contentWindow.localStorage.length > 0) {
                //set last edit date
                setEditorMessage("Last edited " + safari.extension.globalPage.contentWindow.localStorage.getItem("date"));
            //the user has NOT previously saved code
            } else {
                setEditorMessage(initMessage);
            }
        }
    }
    
    function downloadScript() {
        safari.application.activeBrowserWindow.openTab().url = safari.extension.baseURI + "include/download.html";
        safari.self.hide();
    }
    
    function discard() {
        editor.setValue(safari.extension.globalPage.contentWindow.localStorage.getItem("code"));
        disableButtons();
    }
    
    function save() {
        var code = editor.getValue();
        var date = formatTime(Date.now());
        safari.extension.globalPage.contentWindow.saveCode(code, date);
        sessionCode = "";
        setEditorMessage("All changes saved");
        disableButtons();
        setTimeout(function() {
            setEditorMessage("Last edited " + date);
        }, 1500);
    }
    
    infoButton.addEventListener("click", function() {
        safari.application.activeBrowserWindow.openTab().url = "https://github.com/quoid/userscripts#userscripts";
        safari.self.hide();
    });
    
    editor.on("change", function(e, c) {
        var inputAction = c.origin;
        
        if (inputAction !== "setValue") {
            sessionCode = e.getValue();
            enableButtons();
        }
        
        if (inputAction === "undo" || inputAction === "redo") {
            var savedCode = safari.extension.globalPage.contentWindow.localStorage.getItem("code");
            
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
    
    downloadButton.addEventListener("click", downloadScript);
    safari.application.addEventListener("popover", popoverOpen, true);
    saveButton.addEventListener("click", save);
    discardButton.addEventListener("click", discard);
    
}());