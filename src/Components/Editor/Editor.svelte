<script>
    import {items, log, state} from "../../store.js";
    import Loader from "../Shared/Loader.svelte";
    import IconButton from "../Shared/IconButton.svelte";
    import Tag from "../Shared/Tag.svelte";
    import {formatDate, getRemoteFile, parse, validateURL} from "../../utils.js";
    import CodeMirror, {cmChanged, cmGetInstance} from "./CodeMirror.svelte";
    import iconDownload from "../../img/icon-download.svg";
    import iconTrash from "../../img/icon-trash.svg";
    import iconSync from "../../img/icon-sync.svg";

    // the data the populates editor elements
    let canUpdate, name, type, lastModified, remote, temp;

    // binds to codemirror component, allows accessing of component's exported functions
    let codemirror;

    // unique discard/save disabled states
    let discardDisabled = true;
    let saveDisabled = true;

    $: disabled = !$state.includes("ready");

    $: activeItem = $items.find(a => a.active);

    $: if (activeItem) {
        if (!cmGetInstance()) codemirror.init();
        // when there active item present, load content into editor
        lastModified = formatDate(activeItem.lastModified);
        name = activeItem.name;
        remote = activeItem.remote;
        temp = activeItem.temp;
        type = activeItem.type;
        canUpdate = activeItem.canUpdate;
        // on load if temp item, disabled discard and enable save, if not disable both
        if (temp) {
            toggleButtons(true, false);
        } else {
            toggleButtons(true, true);
        }
    }

    function save() {
        if (
            // save already in progress
            !$state.includes("ready")
            // code hasn't changed and the active script in not a temp
            || (!cmChanged() && !activeItem.temp)
        ) return;
        state.add("saving");
        // send the current script data & and new script content
        const data = {
            current: activeItem,
            new: codemirror.getValue()
        };
        safari.extension.dispatchMessage("REQ_FILE_SAVE", data);
    }

    const discard = () => codemirror.discardChanges();

    function download() {
        const link = document.createElement("a");
        const content = codemirror.getValue();
        const filename = activeItem.filename;
        link.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
        link.setAttribute("download", filename);
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function update() {
        // cancel request if possible

        // get the editor's current contents
        const current = codemirror.getValue();
        // parse the contents to get required metablock values
        const parsed = parse(current);
        const messages = {
            1: "Update failed, metadata missing!",
            2: "Update failed, version value required!",
            3: "Update failed, update url required!",
            4: "Update failed, invalid update url!",
            5: "Update failed, invalid download url!",
            6: "Update failed, updateURL unreachable!",
            7: "Update failed, couldn't parse remote version!",
            8: "No updates found!",
            9: "Update failed, downloadURL unreachable!",
        };
        // can't parse editor contents
        if (!parsed || !parsed.metadata) return log.add(messages[1], "error", true);
        const metadata = parsed.metadata;
        // editor contents missing version value
        if (!metadata.version) return log.add(messages[2], "error", true);
        // editor contents missing updateURL
        if (!metadata.updateURL) return log.add(messages[3], "error", true);
        const updateURL = metadata.updateURL[0];
        const downloadURL = metadata.downloadURL ? metadata.downloadURL[0] : updateURL;
        const version = metadata.version[0];
        // basic url validation
        if (!validateURL(updateURL)) return log.add(messages[4], "error", true);
        if (!validateURL(downloadURL)) return log.add(messages[5], "error", true);
        // start fetching remote content
        state.add("updating");
        const a = await getRemoteFile(updateURL);
        if (a.error) {
            return state.remove("updating");
        }
        let content = a.contents;
        const remoteParsed = parse(a.contents);
        if (!remoteParsed || !remoteParsed.metadata || !remoteParsed.metadata.version) {
            state.remove("updating");
            return log.add(messages[7], "error", true);
        }
        if (version >= remoteParsed.metadata.version) {
            state.remove("updating");
            return log.add(messages[8], "info", true);
        }
        if (updateURL != downloadURL) {
            // download location differs form update check location
            const b = await getRemoteFile(downloadURL);
            if (b.error) {
                state.remove("updating");
            }
            content = b.contents;
        }
        cmGetInstance().setValue(content);
        toggleButtons(false, false);
        log.add("Successfully updated code, review it and save!", "warn", true);
        state.remove("updating");
    }

    function abort() {
        safari.extension.dispatchMessage("REQ_CANCEL_ALL_REMOTE_REQUESTS");
        state.remove("updating");
    }

    function trash() {
        const filename = activeItem.filename;
        const m = "Are you sure you want to trash this file?";
        const temp = activeItem.temp;
        if (!confirm(m)) return;
        state.add("trashing");
        // since temp files are not yet saved to the file system, can be trashed immediately
        if (temp) {
            // can only trash an active script, update items filtering out the active one
            items.update(i => i.filter(a => !a.active));
            state.remove("trashing");
        } else {
            const data = {filename: filename};
            safari.extension.dispatchMessage("REQ_FILE_TRASH", data);
        }
    }

    function toggleButtons(discardButtonDisabled, saveButtonDisabled) {
        discardDisabled = discardButtonDisabled;
        saveDisabled = saveButtonDisabled;
    }

    function handleMessage(e) {
        const name = e.detail.name;
        // temp files keep save button enabled until save
        if (name === "enableButtons" && !temp) {
            toggleButtons(false, false);
        } else if (name === "disableButtons" && !temp) {
            toggleButtons(true, true);
        }
    }
</script>
<style>
    .editor {
        background-color: var(--color-bg-primary);
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
        position: relative;
    }

    .info {
        border-bottom: 1px dotted var(--text-color-disabled);
        cursor: help;
    }

    .editor__empty {
        align-items: center;
        background-color: inherit;
        color: var(--text-color-disabled);
        display: flex;
        font: var(--text-large);
        height: 100%;
        justify-content: center;
        left: 0;
        letter-spacing: var(--letter-spacing-large);
        position: absolute;
        top: 0;
        width: 100%;
        z-index: 85;
    }

    .editor__header {
        align-items: center;
        display: flex;
        flex-shrink: 0;
        padding: 1rem 0.5rem 1rem 1.5rem;
    }

    .editor__header__content {
        align-items: center;
        display: flex;
        flex-grow: 1;
        flex-wrap: wrap;
        font: var(--text-large);
        min-width: 0; /* needed for .truncate on .title */
    }

    /* element needed so that .truncate works on .title */
    .editor__header__content > div {
        align-items: center;
        display: flex;
        max-width: 100%;
        padding-right: 1rem;
    }

    .editor__title {
        font: var(--text-large);
        letter-spacing: var(--letter-spacing-large);
    }

    .editor__status {
        color: var(--text-color-disabled);
        flex-basis: 100%;
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
    }

    .editor__code {
        display: flex;
        flex-basis: 100%;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
        position: relative;
    }

    .editor__header__buttons {
        display: flex;
    }

    :global(.editor__header__buttons > button:nth-of-type(2)) {
        margin: 0 1.5rem;
    }

    .editor__footer {
        background: rgba(50, 54, 57, 0.65);
        border-radius: var(--border-radius);
        bottom: 0.25rem;
        padding: 0.5rem 1rem;
        position: absolute;
        right: 0.25rem;
        z-index: 2;
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
    }

    .editor__footer button {
        background-color: transparent;
        color: var(--text-color-primary);
        font: var(--text-medium);
        font-weight: bold;
        letter-spacing: var(--letter-spacing-medium);
        line-height: 1.5rem;
    }

    .editor__footer button:hover {
        text-decoration: underline;
    }

    .editor__footer button:nth-child(2) {
        color: var(--color-blue);
        margin-left: 2rem;
    }
</style>

<div class="editor">
    {#if $state.includes("editor-loading") || $state.includes("fetching")}
        <Loader/>
    {/if}
    {#if !activeItem}
        <div class="editor__empty">No Item Selected</div>
    {/if}
    <div class="editor__header">
        <div class="editor__header__content">
            <div>
                <Tag type={type}/>
                <div class="editor__title truncate">{name}</div>
            </div>
            <div class="editor__status">
                {#if $state.includes("saving")}
                    Saving...
                {:else if $state.includes("trashing")}
                    （◞‸◟）
                {:else if $state.includes("updating")}
                    Updating code, <span class="link" on:click={abort}>cancel request</span>
                {:else if remote}
                    Code was <span class="info" title={remote}>remotely fetched</span>, check carefully before saving!
                {:else if temp}
                    Ready for code!
                {:else}
                    Last modified: {lastModified}
                {/if}
            </div>
        </div>
        <div class="editor__header__buttons">
            <IconButton
                icon={iconSync}
                on:click={update}
                title={"Check for updates"}
                disabled={disabled || !canUpdate}
            />
            <IconButton
                icon={iconDownload}
                on:click={download}
                title={"Download file"}
                {disabled}
            />
            <IconButton
                icon={iconTrash}
                on:click={trash}
                title={"Trash file"}
                {disabled}
            />
        </div>
    </div>
    <div class="editor__code">
        <CodeMirror
            bind:this={codemirror}
            on:message={handleMessage}
            saveHandler={save}
        />
    </div>
    <div class="editor__footer">
        <button on:click={discard} disabled={disabled || discardDisabled}>Discard</button>
        <button on:click={save} disabled={disabled || saveDisabled}>Save</button>
    </div>
</div>
