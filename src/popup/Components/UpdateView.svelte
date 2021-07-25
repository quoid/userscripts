<script>
    import {quintInOut} from "svelte/easing";
    import Loader from "../../shared/Components/Loader.svelte";
    import IconButton from "../../shared/Components/IconButton.svelte";
    import iconArrowLeft from "../../shared/img/icon-arrow-left.svg";
    import iconUpdate from "../../shared/img/icon-update.svg";

    export let loading = false;
    export let updates = [];
    export let closeClick;
    export let updateClick;
    export let checkClick;

    function slide(node, params) {
        return {
            delay: params.delay || 0,
            duration: params.duration || 150,
            easing: params.easing || quintInOut,
            css: t => `transform: translateX(${(t-1)*18}rem);`
        };
    }
</script>
<style>
    .view {
        background-color: var(--color-bg-primary);
        display: flex;
        flex-direction: column;
        height: 100%;
        left: 0;
        position: absolute;
        text-align: center;
        top: 0;
        width: 100%;
        z-index: 3;
    }

    .view :global(.loader) {
        background-color: var(--color-bg-primary);
    }

    .view__header {
        background-color: var(--color-bg-primary);
        border-bottom: 1px solid var(--color-black);
        flex-shrink: 0;
        font-weight: 600;
        padding: 0.5rem 1rem calc(0.5rem - 1px) 1rem;
        top: 0;
    }

    .view__header :global(button) {
        left: 1rem;
        position: absolute;
        top: 0.5rem;
    }

    .view__body {
        flex-grow: 1;
        overflow-y: auto;
        position: relative;
    }

    .item {
        align-items: center;
        border-bottom: 1px solid var(--color-black);
        display: flex;
        padding: 0.5rem 1rem;
        text-align: left;
    }

    .item div {
        flex-grow: 1;
    }

    .item a,
    .item span {
        flex-shrink: 0;
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
    }

    .item a {
        margin: 0 0.5rem;
    }

    p {
        color: var(--text-color-secondary);
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
        padding: 1rem;
    }

    .none :global(svg) {
        fill: var(--text-color-disabled);
        height: 4rem;
        margin: 2rem auto 0.5rem auto;
        width: 4rem;
    }

    .none div {
        color: var(--text-color-disabled);
        font-weight: 600;
        margin-bottom: 2rem;
    }

    .link {
        font-weight: 600;
        padding-bottom: 1rem;
    }
</style>
<div class="view view--updates" transition:slide>
    <div class="view__header">
        Userscript Updates
        <IconButton
            icon={iconArrowLeft}
            title={"Go back"}
            on:click={closeClick}
        />
    </div>
    <div class="view__body">
        {#if loading}
            <Loader/>
        {:else}
            {#if updates.length}
                {#each updates as item (item.name)}
                <!-- {#each Array(10) as _, i} -->
                    <div class="item">
                        <div class="truncate">{item.name}</div>
                        <a href="{item.url}" target="_blank">Source</a>
                        <!-- <span class="link">Update</span> -->
                    </div>
                {/each}
                <p>Be sure you trust the authors before downloading remote code to your machine.</p>
                <div class="link" on:click={updateClick}>Update All</div>
            {:else}
                <div class="none">
                    {@html iconUpdate}
                    <div>
                        There are no file updates available
                        <br>
                        <span class="link" on:click={checkClick}>Check Again</span>
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</div>
