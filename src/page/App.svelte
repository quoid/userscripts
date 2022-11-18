<script>
    import {onMount, tick} from "svelte";
    import {blur} from "svelte/transition";
    import {items, log, notifications, settings, state} from "./store.js";
    import Sidebar from "./Components/Sidebar/Sidebar.svelte";
    import Editor from "./Components/Editor/Editor.svelte";
    import Settings from "./Components/Settings.svelte";
    import Notification from "./Components/Notification.svelte";
    import logo from "../shared/img/logo.svg?raw";

    const logger = [];

    $: $log.some(item => {
        if (!logger.includes(item)) {
            console[item.type](item.message);
            logger.push(item);
        }
    });

    // disables default cmd+s (save) and cmd+f (find) behavior
    function preventKeyCommands(e) {
        if (e.metaKey && (e.code === "KeyS" || e.code === "KeyF")) {
            return e.preventDefault();
        }
    }
    // app proportions can get messed up when opening/closing new tabs
    async function windowResize() {
        document.documentElement.style.height = "100vh";
        // if tick is omitted, the style change won't apply
        await tick();
        document.documentElement.removeAttribute("style");
    }

    // currently inactive, but could be used to globally prevent auto text replacement in app
    // function preventAutoTextReplacements(e) {
    //     if (e.inputType === "insertReplacementText" && e.data === ". ") {
    //         e.preventDefault();
    //         e.target.value += " ";
    //     }
    // }

    onMount(async () => {
        log.add("Requesting initialization data", "info", false);
        const initData = await browser.runtime.sendNativeMessage({name: "PAGE_INIT_DATA"});
        if (initData.error) return console.error(initData.error);
        await settings.init(initData);
        state.add("items-loading");
        state.remove("init");

        log.add("Requesting all files in save location", "info", false);
        const files = await browser.runtime.sendNativeMessage({name: "PAGE_ALL_FILES"});
        if (files.error) return console.error(files.error);
        items.set(files);
        state.remove("items-loading");
    });
</script>

<svelte:window on:keydown={preventKeyCommands} on:resize={windowResize}/>

{#if $state.includes("init")}
    <div class="initializer" out:blur="{{duration: 350}}">
        {@html logo}
        {#if $state.includes("init-error")}
            <span>Failed to initialize app, check the browser console</span>
        {:else}
            <span>Initializing app...</span>
        {/if}
    </div>
{/if}
<div>
    <Sidebar/>
    <Editor/>
</div>
<ul>
    {#each $notifications as item (item.id)}
        <Notification on:click={() => notifications.remove(item.id)} {item}/>
    {/each}
</ul>
{#if $state.includes("settings")}<Settings/>{/if}

<style>
    .initializer {
        align-items: center;
        background-color: var(--color-bg-primary);
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: center;
        left: 0;
        opacity: 1;
        position: absolute;
        top: 0;
        visibility: visible;
        width: 100%;
        z-index: 99;
    }

    .initializer :global(svg) {
        height: 1.5rem;
        margin-bottom: 0.5rem;
    }

    .initializer span {
        color: var(--text-color-secondary);
        font: var(--text-medium);
    }

    div:not(.initializer) {
        display: flex;
        flex: 1 0 0;
        overflow: hidden;
    }

    ul {
        bottom: 1rem;
        left: 50%;
        position: fixed;
        transform: translateX(-50%);
        z-index: 98;
    }
</style>
