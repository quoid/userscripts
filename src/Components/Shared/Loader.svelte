<script>
    import {fade} from "svelte/transition";
    import {state} from "../../store.js";
    import iconLoader from "../../img/icon-loader.svg";

    function abort() {
        safari.extension.dispatchMessage("REQ_CANCEL_ALL_REMOTE_REQUESTS");
    }
</script>

<style>
    .container {
        align-items: center;
        background-color: inherit;
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: center;
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;
        z-index: 90;
    }

    .container :global(svg) {
        height: 2rem;
        width: 2rem;
    }

    .container div {
        color: var(--text-color-disabled);
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
        margin-top: 1rem;
    }
</style>

<div class="container" out:fade="{{duration: 125}}">
    {@html iconLoader}
    {#if $state.includes("fetching")}
        <div>Fetching resources, <span class="link" on:click={abort}>cancel request</span></div>
    {/if}
</div>
