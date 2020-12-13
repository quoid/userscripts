<script context="module">
    // once initialized, references the codemirror instance
    let instance;
    // saved and session code vars are used to track unsaved changes
    let savedCode = null, sessionCode = null;

    export function cmChanged() {
        if (sessionCode === null || sessionCode.localeCompare(savedCode) === 0) {
            return false;
        }
        return true;
    }

    export function cmSetSavedCode(code) {
        savedCode = code;
    }

    export function cmSetSessionCode(code) {
        sessionCode = code;
    }

    export function cmGetInstance() {
        return instance;
    }
</script>
<script>
    import {createEventDispatcher} from "svelte";
    import CodeMirror from "../../codemirror.js";
    import {settings, state} from "../../store.js";
    import Search from "./Search.svelte";

    // the function to be called when save keybind is pressed
    export let saveHandler = () => {};

    // message dispatcher
    const dispatch = createEventDispatcher();

    // save ref to textarea element for codemirror initialization
    let textarea;

    // used to determine whether or not to auto hint
    let keysPressed = [];

    // store cursor location on save, when re-enabling restore cursor position
    let cursor;

    // bound to the search component
    let search;
    // tracks whether search is open
    let searchActive = false;

    // linter options - https://jshint.com/docs/options/
    const lintOptions = {asi: true, esversion: 9};

    // update settings when changed
    $: if (instance) {
        instance.setOption("showInvisibles", $settings.showInvisibles);
        instance.setOption("tabSize", parseInt($settings.tabSize));
        instance.setOption("indentUnit", parseInt($settings.tabSize));
    }

    // store cursor position and disable on save
    $: if ($state.includes("saving")) {
        cursor = instance.getCursor();
        disable();
    }
    // re-enable after, focus and set cursor back save completes
    $: if ($state.includes("ready") && state.getOldState().includes("saving")) {
        enable();
        instance.focus();
        instance.setCursor(cursor);
    }

    // disable when trashing or updating file
    $: if ($state.includes("trashing") || $state.includes("updating")) {
        disable();
    }
    // reset saved and session code & re-enable after trashing completes
    $: if ($state && state.getOldState().includes("trashing")) {
        savedCode = null;
        sessionCode = null;
        enable();
    }
    // update session code and re-enable after updating completes
    $: if ($state && state.getOldState().includes("updating")) {
        sessionCode = instance.getValue();
        enable();
    }

    // track lint settings and update accordingly
    $: if (instance && $settings.lint) {
        toggleLint("enable");
    } else if (instance && !$settings.lint) {
        toggleLint("disable");
    }

    export function init() {
        // do lint settings check
        const lint = $settings.lint ? lintOptions : false;

        // create codemirror instance
        instance = CodeMirror.fromTextArea(textarea, {
            mode:  "javascript",
            autoCloseBrackets: true,
            continueComments: true,
            foldGutter: true,
            lineNumbers: true,
            lineWrapping: true,
            matchBrackets: true,
            smartIndent: true,
            styleActiveLine: true,
            indentUnit:  parseInt($settings.tabSize),
            showInvisibles: $settings.showInvisibles,
            tabSize: parseInt($settings.tabSize),
            highlightSelectionMatches: false,
            lint: lint,
            hintOptions: {
                useGlobalScope: true
            },
            gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Cmd-/": "toggleComment",
                "Cmd-S": () => saveHandler(),
                "Cmd-F": () => activateSearch(),
                "Esc": () => {searchActive = false},
                Tab: cm => {
                    // convert tabs to spaces and add invisible elements
                    var s = Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(s);
                }
            }
        });

        // when a user hits a key, save key to keysPressed array
        // the keys in the keysPressed array will help determine whether or not to show hints
        // if it is a backspace key, empty array
        instance.on("keydown", (cm, e) => {
            if (e.code === "Backspace") return keysPressed = [];
            keysPressed.push(e.code);
            autoHint(cm);
        });
        // on key up empty the keysPressed array
        // this allows tracking of multiple key pressed (i.e. keybinds)
        instance.on("keyup", (cm, e) => keysPressed.splice(keysPressed.indexOf(e.code), 1));
        // if codemirror editor loses focus, empty keysPressed array
        instance.on("blur", () => keysPressed = []);

        instance.on("change", onChange);
    }

    function activateSearch() {
        if (searchActive) {
            search.focusInput();
        } else {
            searchActive = true;
        }
    }

    function autoHint(cm) {
        // check for valid key combinations
        const  validKeys = keysPressed.every(v => {
            // if a single key press, only show hint if letter/number
            if (keysPressed.length === 1) {
                return v.startsWith("Digit") || v.startsWith("Key");
            // if 2 key combo, show hints with shift as well
            } else if (keysPressed.length === 2) {
                return v.startsWith("Digit") || v.startsWith("Key") || v.startsWith("Shift");
            }
        });
        if (
            // check if setting is enabled
            $settings.autoHint
            // ensure hinting not active already
            && !cm.state.completionActive
            // not first position on the line
            && cm.getCursor().ch != 0
            // only hint when 1-2 key combos
            && keysPressed.length < 3
            // valid keys combo
            && validKeys
        ) cm.showHint({completeSingle: false});
    }

    function onChange(cm, e) {
        const inputAction = e.origin;

        // if search is active, update count on change
        if (searchActive) search.getMatches();
        // setValue occurs when programmatically changing codemirror values
        // below is all other input actions
        if (inputAction !== "setValue") {
            sessionCode = cm.getValue();
            if (cmChanged()) dispatch("message", {name: "enableButtons"});
        }
        if ((inputAction === "undo" || inputAction === "redo") && !cmChanged()) {
            // back to the point where session and saved code are equal, and buttons enabled
            dispatch("message", {name: "disableButtons"});
        }
    }

    // disables the editor
    function disable() {
        instance.setOption("readOnly", "nocursor");
        instance.display.wrapper.style.opacity = "0.30";
    }

    // enables the editor
    function enable() {
        instance.setOption("readOnly", false);
        instance.display.wrapper.removeAttribute("style");
    }

    function toggleLint(disableOrEnable) {
        const lint = disableOrEnable === "enable" ? lintOptions : false;
        instance.setOption("lint", lint);
        instance.refresh();
    }

    // function that is called for editor component when clicking discard button
    export function discardChanges() {
        if ($state.includes("ready")) {
            instance.setValue(savedCode);
            sessionCode = null;
            instance.focus();
            dispatch("message", {name: "disableButtons"});
        }
    }

    // allow editor component to get direct access to codemirror instance value
    export function getValue() {
        return instance.getValue();
    }
</script>
<textarea bind:this={textarea}></textarea>
<!--
    dynamically add search component, since it requires instance to function
    if instance is passed to component before instance is set (init is called in Editor component)
    instance will remain undefined, which would require importing cmGetInstance in search component
    and creating circular dependency
-->
{#if instance}
    <svelte:component
        this={Search}
        active={searchActive}
        bind:this={search}
        closeHandler={() => {searchActive = false}}
        instance={instance}
    />
{/if}
