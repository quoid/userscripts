<script>
    import {fade} from "svelte/transition";
    import iconLoader from "../../shared/img/icon-loader.svg";

    export let abort = false;
    export let abortClick = () => {};
</script>
<style>
    .loader {
        align-items: center;
        background-color: var(--color-bg-secondary);
        bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        z-index: 2;
    }

    .loader :global(svg) {
        height: 2rem;
        width: 2rem;
    }

    .loader div {
        color: var(--text-color-disabled);
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
        margin-top: 1rem;
    }
</style>
<div class="loader" out:fade="{{duration: 125}}">
    {@html iconLoader}
    {#if abort}
        <div>
            Fetching resources, <span class="link" on:click={abortClick}>cancel request</span>
        </div>
    {/if}
</div>
