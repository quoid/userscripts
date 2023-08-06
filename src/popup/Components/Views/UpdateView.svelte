<script>
    import iconUpdate from "../../../shared/img/icon-update.svg?raw";

    export let updates = [];
    export let updateClick;
    export let checkClick;
    export let updateSingleClick;
</script>

{#if updates.length}
    {#each updates as item (item.name)}
    <!-- {#each Array(10) as _, i} -->
        <div class="item">
            <div class="truncate">{item.name}</div>
            <a href="{item.url}" target="_blank">
                Source
            </a>
            <button class="link" on:click={() => updateSingleClick(item)}>
                Update
            </button>
        </div>
    {/each}
    <p>Be sure you trust the author before saving remote code to your device.</p>
    <button class="link" on:click={updateClick}>
        Update All
    </button>
{:else}
    <div class="none">
        {@html iconUpdate}
        <div>
            There are no file updates available
            <br>
            <button class="link" on:click={checkClick}>
                Check Updates
            </button>
        </div>
    </div>
{/if}

<style>
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
    .item button {
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
        margin: 2rem auto 0.5rem;
        width: 4rem;
    }

    .none div:not(.link) {
        color: var(--text-color-disabled);
        font-weight: 600;
        margin-bottom: 2rem;
    }

    button.link:not(.item button) {
        font-weight: 600;
        padding-bottom: 1rem;
    }
</style>
