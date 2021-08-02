<script>
    import {onMount} from "svelte";
    import IconButton from "../shared/Components/IconButton.svelte";
    import Loader from "../shared/Components/Loader.svelte";
    import PopupItem from "./Components/PopupItem.svelte";
    import UpdateView from "./Components/UpdateView.svelte";
    import iconPower from "../shared/img/icon-power.svg";
    import iconOpen from "../shared/img/icon-open.svg";
    import iconUpdate from "../shared/img/icon-update.svg";
    import iconClear from "../shared/img/icon-clear.svg";
    import logo from "../shared/img/logo.svg";

    let error = undefined;
    let active = true;
    let loading = true;
    let disabled = true;
    let items = [];
    let showUpdates = false;
    let updates = [];
    let main;
    let rowColors;

    // TODO: fix awaits
    function foo() {}

    $: list = items.sort((a, b) => a.metadata.name[0].localeCompare(b.metadata.name[0]));

    $: if (list.length > 1 && list.length % 2 === 0) {
        rowColors = "even";
    } else if (list.length > 1 && list.length % 2 != 0) {
        rowColors = "odd";
    } else {
        rowColors = undefined;
    }

    function toggleExtension() {
        disabled = true;
        browser.runtime.sendNativeMessage({name: "POPUP_TOGGLE_EXTENSION"}, response => {
            disabled = false;
            if (response.error) return error = response.error;
            active = !active;
        });
    }

    function updateAll() {
        showUpdates = false;
        disabled = true;
        loading = true;
        main.style.height = main.offsetHeight + "px";
        browser.runtime.sendNativeMessage({name: "POPUP_UPDATE_ALL"}, response => {
            if (response.error) {
                error = response.error;
            } else {
                if (response.items) items = response.items;
                updates = response.updates;
            }
            main.removeAttribute("style");
            disabled = false;
            loading = false;
        });
    }

    function toggleItem(item) {
        disabled = true;
        browser.runtime.sendNativeMessage({name: "TOGGLE_ITEM", item: item}, response => {
            if (response.error) {
                error = "Failed to toggle item";
            } else {
                const i = items.findIndex(el => el === item);
                item.disabled = !item.disabled;
                items[i] = item;
            }
            disabled = false;
        });
    }

    function checkForUpdates() {
        disabled = true;
        setTimeout(() => disabled = false, 1000);
    }

    async function openExtensionPage() {
        const url = browser.runtime.getURL("page.html");
        const tabs =  await browser.tabs.query({});
        for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].url === url) {
                browser.tabs.update(tabs[i].id, {active: true});
                return;
            }
        }
        browser.tabs.create({url: url});
    }

    function openSaveLocation() {
        browser.runtime.sendNativeMessage({name: "OPEN_SAVE_LOCATION"});
        window.close();
    }

    onMount(async () => {
        const tabs = await browser.tabs.query({currentWindow: true, active: true});
        const url = tabs[0].url;
        const frameUrls = [];
        if (url) {
            const frames = await browser.webNavigation.getAllFrames({tabId: tabs[0].id});
            frames.forEach(frame => frameUrls.push(frame.url));
        }
        const message = {name: "POPUP_MATCHES", url: url, frameUrls: frameUrls};
        const response = await browser.runtime.sendNativeMessage(message);
        if (response.error) {
            error = response.error;
        } else {
            active = response.active === "true" ? true : false;
            items = response.items;
            updates = response.updates;
        }
        loading = false;
        disabled = false;
    });
</script>
<style>
    .header {
        align-items: center;
        border-bottom: 1px solid var(--color-black);
        display: flex;
        padding: 0.5rem 1rem calc(0.5rem - 1px) 1rem;
    }

    .header__logo {
        flex-grow: 1;
        height: 1rem;
    }

    :global(.header__logo svg) {
        display: block;
        height: 100%;
    }

    .header :global(button:nth-of-type(2)) {
        margin: 0 1rem;
    }

    .header :global(button:nth-of-type(1) svg) {
        width: 75%;
    }

    .header :global(button:nth-of-type(2) svg) {
        width: 90%;
    }

    .error {
        background-color: var(--color-red);
        color: var(--color-bg-secondary);
        font: var(--text-small);
        font-weight: 600;
        letter-spacing: var(--letter-spacing-small);
        line-height: 1.5rem;
        position: relative;
        text-align: center;
    }

    .error :global(button) {
        position: absolute;
        right: 0.5rem;
        top: 0;
    }

    .error :global(button svg) {
        width: 50%;
    }

    .main {
        max-height: 20rem;
        min-height: 12.5rem;
        overflow-y: auto;
        position: relative;
    }

    .main.even :global(.item:nth-of-type(odd)),
    .main.odd :global(.item:nth-of-type(even)) {
        background-color: var(--color-bg-primary);
    }

    .none {
        align-items: center;
        bottom: 0;
        color: var(--text-color-disabled);
        display: flex;
        font-weight: 600;
        justify-content: center;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
    }

    .items.disabled {
        opacity: var(--opacity-disabled);
        pointer-events: none;
    }

    .footer {
        border-top: 1px solid var(--color-black);
        font-weight: 600;
        line-height: 1.5rem;
        padding: 0.5rem 0;
        text-align: center;
    }
</style>
<div class="header">
    <div class="header__logo">{@html logo}</div>
    <IconButton
        icon={iconOpen}
        title={"Open save location"}
        on:click={openSaveLocation}
        {disabled}
    />
    <IconButton
        icon={iconUpdate}
        notification={updates.length}
        on:click={() => showUpdates = true}
        title={"Show updates"}
        {disabled}
    />
    <IconButton
        on:click={toggleExtension}
        icon={iconPower}
        title={"Toggle injection"}
        color={active ? "var(--color-green)" : "var(--color-red)"}
        {disabled}
    />
</div>
{#if error}
    <div class="error">
        {error}
        <IconButton
            icon={iconClear}
            on:click={() => error = undefined}
            title={"Clear error"}
        />
    </div>
{/if}
<div class="main {rowColors || ""}" bind:this={main}>
    {#if loading}
        <Loader/>
    {:else}
        {#if items.length < 1}
            <div class="none">No matched userscripts</div>
        {:else}
            <div class="items" class:disabled={disabled}>
                {#each list as item (item.filename)}
                    <PopupItem
                        enabled={!item.disabled}
                        name={item.metadata.name[0]}
                        subframe={item.subframe}
                        type={item.type}
                        on:click={() => toggleItem(item)}
                    />
                {/each}
            </div>
        {/if}
    {/if}
</div>
<div class="footer">
    <div class="link" on:click={openExtensionPage}>Open Extension Page</div>
</div>
{#if showUpdates}
    <UpdateView
        closeClick={() => showUpdates = false}
        updateClick={updateAll}
        checkClick={checkForUpdates}
        loading={disabled}
        updates={updates}
    />
{/if}
