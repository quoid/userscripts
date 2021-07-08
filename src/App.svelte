<script>
    import {onMount} from "svelte";
    import IconButton from "./Components/IconButton.svelte";
    import Loader from "./Components/Loader.svelte";
    import PopupItem from "./Components/PopupItem.svelte";
    import UpdateView from "./Components/UpdateView.svelte";
    import iconPower from "./img/icon-power.svg";
    import iconOpen from "./img/icon-open.svg";
    import iconUpdate from "./img/icon-update.svg";
    import iconClear from "./img/icon-clear.svg";
    import logo from "./img/logo.svg";

    let error = undefined;
    let active = true;
    let loading = true;
    let disabled = true;
    let items = [];
    let showUpdates = false;
    let updates = [];
    let main;

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
        browser.runtime.sendNativeMessage({name: "POPUP_TOGGLE_SCRIPT", item: item}, response => {
            if (response.error) {
                error = response.error;
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

    function openExtensionPage() {
        browser.tabs.create({url: browser.runtime.getURL("page.html")});
    }

    function openSaveLocation() {
        browser.runtime.sendNativeMessage({name: "OPEN_SAVE_LOCATION"});
    }

    async function mounted() {
        let p = new Promise(resolve => {
            browser.tabs.query({currentWindow: true, active: true}, tabs => {
                resolve(tabs);
            });
        });
        let tabs = await p;
        const url = tabs[0].url;
        const message = {name: "POPUP_MATCHES", url: url, frameUrls: []};
        if (url) {
            let p2 = new Promise(resolve => {
                browser.webNavigation.getAllFrames({tabId: tabs[0].id}, frames => {
                    resolve(frames);
                });
            });
            let frames = await p2;
            frames.forEach(frame => message.frameUrls.push(frame.url));
        }
        browser.runtime.sendNativeMessage(message, response => {
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
    }

    onMount(() => {mounted()});
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
        display: none;
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
<div class="main" bind:this={main}>
    {#if loading}
        <Loader/>
    {:else}
        {#if items.length < 1}
            <div class="none">No matched userscripts</div>
        {:else}
            <div class="items" class:disabled={disabled}>
                {#each items as item (item.filename)}
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
