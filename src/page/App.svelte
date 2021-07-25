<script>
    import {onMount, tick} from "svelte";
    import {blur} from "svelte/transition";
    import logo from "../shared/img/logo.svg";

    let state = ["init"];

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
        setTimeout(() => {state = []}, 2000);
    });
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
</style>

<svelte:window on:keydown={preventKeyCommands} on:resize={windowResize}/>
{#if state.includes("init")}
    <div class="initializer" out:blur="{{duration: 350}}">
        {@html logo}
        {#if state.includes("init-error")}
            <span>Failed to initialize app, check the console!</span>
        {:else}
            <span>Initializing app...</span>
        {/if}
    </div>
{/if}
