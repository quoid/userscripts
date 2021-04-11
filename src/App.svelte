<script>
    import {onMount, tick} from "svelte";
    import {blur} from "svelte/transition";
    import {setupMessageHandler} from "./handler.js";
    import {log, notifications, settings, state} from "./store.js";
    import Notification from "./Components/Shared/Notification.svelte";
    import Sidebar from "./Components/Sidebar/Sidebar.svelte";
    import Editor from "./Components/Editor/Editor.svelte";
    import Settings from "./Components/Settings.svelte";
    import logo from "./img/logo.svg";

    //log messages when they come in
    let logger = [];
    // save errors separately so when they are cleared, they aren't removed from log
    $: $log.some(a => {
        if (!logger.includes(a)) {
            //if ($settings.log) console[a.type](a.message);
            //if (a.type === "error") errors = [a, ...errors];
            logger.push(a);
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

    onMount(() => {
        // environment setup
        setupMessageHandler();
        // start initialization process
        safari.extension.dispatchMessage("REQ_INIT_DATA");
    });

    // currently inactive, but could be used to globally prevent auto text replacement in app
    // eslint-disable-next-line no-unused-vars
    function preventAutoTextReplacements(e) {
        if (e.inputType === "insertReplacementText" && e.data === ". ") {
            e.preventDefault();
            e.target.value += " ";
        }
    }
</script>

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

<svelte:window on:keydown={preventKeyCommands} on:resize={windowResize}/>

{#if $state.includes("init")}
    <div class="initializer" out:blur="{{duration: 350}}">
        {@html logo}
        {#if $state.includes("init-error")}
            <span>Failed to initialize app, check the console!</span>
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
        <Notification on:click={() =>  notifications.remove(item.id)} {item}/>
    {/each}
</ul>
{#if $state.includes("settings")}<Settings />{/if}
