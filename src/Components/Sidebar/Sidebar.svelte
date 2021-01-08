<script>
    import {tick} from "svelte";
    import {items, log, settings, state} from "../../store.js";
    import {getRemoteFile, newScriptDefault, uniqueId, validateURL} from "../../utils.js";
    import Dropdown from "../Shared/Dropdown.svelte";
    import Filter from "./Filter.svelte";
    import IconButton from "../Shared/IconButton.svelte";
    import Loader from "../Shared/Loader.svelte";
    import Item from "./Item.svelte";
    import {cmChanged, cmGetInstance, cmSetSavedCode, cmSetSessionCode} from "../Editor/CodeMirror.svelte";
    import {sortBy} from "../../utils.js";
    import iconPlus from "../../img/icon-plus.svg";
    import iconSettings from "../../img/icon-settings.svg";

    // disable buttons accordingly
    $: disabled = !$state.includes("ready");

    $: console.log($items);

    $: list = sortBy($items, $settings.sortOrder).filter(a => a.visible != false);

    // uncomment this to always scroll to an active item
    // when sorting is changed, a save occurs, etc... will scroll to active item
    // should remove the temp check in the sortBy func in utils & scroll to in activate func
    // this can be a bit jarring, so unsure to enable it
    $: if (list.find(a => a.active)) {
        const active = list.find(a => a.active);
        scrollToEl(active.filename);
    }

    async function newItem(type, content, remote) {
        // warn if there are unsaved changes or another temp script
        const temp = $items.find(i => i.temp);
        if ((cmChanged() || temp) && !warn()) return;
        // user accepts warning, reset saved/session code to no re-trigger in activate function
        cmSetSavedCode(null);
        cmSetSessionCode(null);
        // remove any temp scripts
        if (temp) items.update(i => i.filter(a => !a.temp));

        const random = uniqueId();
        const namePrefix = type === "js" ? "NewScript-" : "NewStyle-";
        const name = namePrefix + random;
        const filename = name + "." + type;
        const description = "This is your new file, start writing code";
        const item = {
            content: content || newScriptDefault(description, name, type),
            description: description,
            disabled: false,
            filename: filename,
            lastModified: Date.now(),
            name: name,
            temp: true,
            type: type
        };
        // if it's a remotely added script add prop to item object
        // is used to display url in editor and will be removed on save
        if (remote) item.remote = remote;
        items.update(items => [item, ...items]);
        await tick(); // if omitted invalid arg in activate function
        activate(item);
    }

    async function activate(item) {
        // if not in ready state or the item is already active
        if (!$state.includes("ready") || item.active) return;

        // check if there's a temp item and it's not the item to be activated
        // can occur when user clicks a non-temp item while a temp item exists
        const temp = $items.find(i => i.temp);
        if ((temp && (temp != item) || cmChanged()) && !warn()) return;
        // the editor has changed or the above scenario is true
        // the user has been warned and has accepted the warning
        // if another item already active, inactivate it
        const activeItem = $items.find(i => i.active);
        if (activeItem)  {
            activeItem.active = false;
            $items = $items;
        }
        // remove the temp item if needed
        if (temp && (temp != item)) items.update(i => i.filter(a => !a.temp));

        // set the saved and session code variables properly
        const savedCode = item.temp ? null : item.content;
        const sessionCode = item.temp ? item.content : null;
        cmSetSavedCode(savedCode);
        cmSetSessionCode(sessionCode);

        // activate item and scroll into view
        item.active = true;
        items.set($items);

        // set up editor after activating file
        await tick();
        const cm = cmGetInstance();
        const mode = item.type === "js" ? "javascript" : item.type;
        cm.setOption("mode", mode);
        cm.setValue(item.content);
        cm.clearHistory();
        cm.focus();
    }

    async function newRemote() {
        // prompt user for url
        const url = prompt("Enter remote url:");
        // stop execution is user cancels prompt
        if (!url) return;
        // if user enters invalid url, log error
        if (!validateURL(url)) return log.add("Can't add remote file, invalid url!", "error", true);
        // add fetching state
        state.add("fetching");
        // get response from valid url
        const response = await getRemoteFile(url);
        if (response.error) {
            log.add(response.error, "error", true);
        } else if (response.contents) {
            const type = url.substring(url.lastIndexOf(".") + 1);
            newItem(type, response.contents, url);
        }
        // remove fetching state
        state.remove("fetching");
    }

    async function scrollToEl(filename) {
        await tick(); // if omitted error can occur when attempting to scroll to before set active
        const el = document.querySelector(`[data-filename="${filename}"]`);
        el.scrollIntoView({behavior: "auto", block: "nearest", inline: "start"});
    }

    function warn() {
        // warn seen when trying to navigate away from an item with unsaved changes
        const m = "You have unsaved changes which will be lost if you continue. Are you sure you'd like to continue?";
        if (confirm(m)) return true;
        return false;
    }
</script>

<style>
    .sidebar {
        background-color: var(--color-bg-secondary);
        border-right: 1px solid var(--color-black);
        display: flex;
        flex-direction: column;
        flex: 0 0 23rem;
        max-width: 23rem;
    }

    .sidebar__header,
    .sidebar__footer {
        align-items: center;
        display: flex;
        flex-shrink: 0;
        padding: 1rem;
    }

    .sidebar__header {
        flex-wrap: wrap;
    }

    .sidebar__filter {
        flex-grow: 1;
        margin-right: 0.5rem;
    }

    .sidebar__body {
        background-color: inherit; /* need this property to pass to loader */
        border-top: 1px solid var(--color-black);
        flex-basis: 100%;
        overflow-y: auto;
        position: relative;
    }

    .sidebar__status {
        color: var(--text-color-secondary);
        flex: 1 0 0;
        font: var(--text-small);
    }
</style>

<div class="sidebar {!$settings.descriptions ? "sidebar--compact" : ""}">
    <div class="sidebar__header">
        <div class="sidebar__filter"><Filter/></div>
        <Dropdown icon={iconPlus} title={"New item"} {disabled}>
            <li on:click={() => newItem("css")}>New CSS</li>
            <li on:click={() => newItem("js")}>New Javascript</li>
            <li on:click={newRemote}>New Remote</li>
        </Dropdown>
    </div>
    <div class="sidebar__body">
        {#if $state.includes("items-loading")}
            <Loader/>
        {/if}
        {#each list as item (item.filename)}
            <svelte:component
                this={Item}
                data={item}
                on:click={() => activate(item)}
            />
        {/each}
    </div>
    <div class="sidebar__footer">
        <div class="sidebar__status">
            <div>{list.length} Items</div>
            <div>
                Version {$settings.version} -
                <a href="https://github.com/quoid/userscripts#readme">View docs</a>
            </div>
        </div>
        <IconButton
            icon={iconSettings}
            on:click={() => state.add("settings")}
            title={"Open settings"}
            {disabled}
        />
    </div>
</div>
