<script>
    import {tick} from "svelte";
    import {fade} from "svelte/transition";
    import {
        items, log, settings, state
    } from "../../store.js";
    import {newScriptDefault, sortBy, uniqueId} from "../../../shared/utils.js";
    import SidebarFilter from "./SidebarFilter.svelte";
    import IconButton from "../../../shared/Components/IconButton.svelte";
    import Dropdown from "../../../shared/Components/Dropdown.svelte";
    import Loader from "../../../shared/Components/Loader.svelte";
    import SidebarItem from "./SidebarItem.svelte";
    import iconPlus from "../../../shared/img/icon-plus.svg?raw";
    import iconSettings from "../../../shared/img/icon-settings.svg?raw";
    import {
        cmChanged,
        cmGetInstance,
        cmSetSavedCode,
        cmSetSessionCode
    } from "../Editor/CodeMirror.svelte";

    // disable buttons accordingly
    $: disabled = !$state.includes("ready");

    $: list = sortBy($items, $settings.sortOrder).filter(a => a.visible !== false);

    // always scroll to an active item
    // when sorting is changed, a save occurs, etc... will scroll to active item
    $: if (list.find(a => a.active)) {
        const active = list.find(a => a.active);
        scrollToEl(active.filename);
    }

    async function newItem(type, content, remote) {
        // warn if there are unsaved changes or another temp script
        const temp = $items.find(i => i.temp);
        if ((cmChanged() || temp) && !warn()) return;
        // user accepts warning, reset saved/session as to not re-trigger warn in activate function
        cmSetSavedCode(null);
        cmSetSessionCode(null);
        // remove any temp scripts
        if (temp) items.update(i => i.filter(a => !a.temp));

        // create new script defaults
        const random = uniqueId();
        const namePrefix = type === "js" ? "NewScript-" : "NewStyle-";
        const name = namePrefix + random;
        const filename = `${name}.${type}`;
        const description = "This is your new file, start writing code";
        const item = {
            content: content || newScriptDefault(description, name, type),
            description,
            disabled: false,
            filename,
            lastModified: Date.now(),
            name,
            temp: true,
            type
        };
        // if it's a remotely added script add prop to item object
        // is used to display url in editor and will be removed on save
        if (remote) item.remote = remote;
        items.update(i => [item, ...i]);
        await tick(); // if omitted invalid arg in activate function
        activate(item);
    }

    async function activate(item) {
        // if not in ready state or the item is already active
        if (!$state.includes("ready") || item.active) return;

        // check if there's a temp item and it's not the item to be activated
        // can occur when user clicks a non-temp item while a temp item exists
        const temp = $items.find(i => i.temp);
        if (((temp && (temp !== item)) || cmChanged()) && !warn()) return;
        // the editor has changed or the above scenario is true
        // the user has been warned and has accepted the warning
        // if another item already active, deactivate it
        const activeItem = $items.find(i => i.active);
        if (activeItem) {
            activeItem.active = false;
            $items = $items;
        }
        // remove the temp item if needed
        if (temp && (temp !== item)) items.update(i => i.filter(a => !a.temp));

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
        let mode = "javascript";
        if (item.type === "css") mode = "css";
        cm.setOption("mode", mode);
        cm.setValue(item.content);
        cm.clearHistory();
        cm.focus();
    }

    async function newRemote() {
        // warn if there are unsaved changes or another temp script
        const temp = $items.find(i => i.temp);
        if ((cmChanged() || temp) && !warn()) return;
        // prompt user for url
        const url = prompt("Enter remote url:");
        // stop execution is user cancels prompt
        if (!url) return;
        state.add("fetching");
        const message = {name: "PAGE_NEW_REMOTE", url};
        const response = await browser.runtime.sendNativeMessage(message);
        if (response.error) {
            log.add(response.error, "error", true);
        } else {
            const type = url.substring(url.lastIndexOf(".") + 1);
            newItem(type, response, url);
        }
        state.remove("fetching");
    }

    async function scrollToEl(filename) {
        await tick(); // if omitted error can occur when attempting to scroll to before set active
        const el = document.querySelector(`[data-filename="${filename}"]`);
        el.scrollIntoView({behavior: "auto", block: "nearest", inline: "start"});
    }

    function toggleItem(e, item) {
        // prevent default b/c checked will change depending on message response
        e.preventDefault();
        // disable toggle on temp files
        if (item.temp) return;
        // disable the checkbox to prevent multiple toggle messages from being sent
        const input = e.target;
        input.disabled = true;
        browser.runtime.sendNativeMessage({name: "TOGGLE_ITEM", item}, response => {
            if (!response.error) {
                items.update(allItems => {
                    const ind = allItems.find(i => i.filename === item.filename);
                    ind.disabled = !ind.disabled;
                    return allItems;
                });
            } else {
                log.add("Failed to toggle item", "error", true);
            }
            input.disabled = false;
        });
    }

    function warn() {
        // warn when trying to navigate away from an item with unsaved changes
        const m = "You have unsaved changes which will be lost if you continue. Are you sure you'd like to continue?";
        if (window.confirm(m)) return true;
        return false;
    }

    let sidebarTimeout = null;
    let showCount = true;
    function sidebarScroll() {
        if (sidebarTimeout) clearTimeout(sidebarTimeout);
        showCount = false;
        sidebarTimeout = setTimeout(() => showCount = true, 750);
    }
</script>

<div class="sidebar {!$settings.descriptions ? "sidebar--compact" : ""}">
    <div class="sidebar__header">
        <div class="sidebar__filter"><SidebarFilter/></div>
        <IconButton
            notification={!$settings.active}
            icon={iconSettings}
            on:click={() => state.add("settings")}
            title={"Open settings"}
            {disabled}
        />
        <Dropdown icon={iconPlus} title={"New item"} {disabled}>
            <li on:click={() => newItem("css")}>New CSS</li>
            <li on:click={() => newItem("js")}>New Javascript</li>
            <li on:click={newRemote}>New Remote</li>
        </Dropdown>
    </div>
    <div class="sidebar__body" on:scroll={sidebarScroll}>
        {#if $state.includes("items-loading")}
            <Loader/>
        {/if}
        {#each list as item (item.filename)}
            <svelte:component
                this={SidebarItem}
                data={item}
                toggleClick={e => toggleItem(e, item)}
                on:click={() => activate(item)}
            />
        {/each}
    </div>
    {#if showCount}
        <div transition:fade="{{duration: 150}}" class="sidebar__count">{list.length} Items</div>
    {/if}
</div>

<style>
    .sidebar {
        background-color: var(--color-bg-secondary);
        border-right: 1px solid var(--color-black);
        display: flex;
        flex-direction: column;
        flex: 0 0 23rem;
        max-width: 23rem;
        position: relative;
    }

    .sidebar__header {
        align-items: center;
        display: flex;
        flex-shrink: 0;
        flex-wrap: wrap;
        padding: 1rem;
    }

    .sidebar__filter {
        flex-grow: 1;
    }

    :global(.sidebar__filter + button) {
        margin: 0 0.5rem;
    }

    .sidebar__count {
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        background: rgba(47 51 55 / 0.65);
        border-radius: var(--border-radius);
        bottom: 0.25rem;
        color: var(--text-color-secondary);
        flex-basis: 100%;
        font: var(--text-small);
        left: 0.25rem;
        padding: 0.25rem;
        position: absolute;
        z-index: 2;
    }

    .sidebar__body {
        background-color: inherit; /* need this property to pass to loader */
        border-top: 1px solid var(--color-black);
        flex-basis: 100%;
        overflow-y: auto;
        position: relative;
    }
</style>
