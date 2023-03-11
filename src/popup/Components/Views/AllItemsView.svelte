<script>
    import PopupItem from "../PopupItem.svelte";

    export let allItems = [];
    export let toggleItem;
    export let detailItem;

    let disabled;
    let rowColorsAll;

    $: list = allItems.sort((a, b) => a.name.localeCompare(b.name));

    $: if (list.length > 1 && list.length % 2 === 0) {
        rowColorsAll = "even--all";
    } else if (list.length > 1 && list.length % 2 !== 0) {
        rowColorsAll = "odd--all";
    } else {
        rowColorsAll = undefined;
    }
</script>

{#if allItems.length}
    <div class="items view--all {rowColorsAll || ""}" class:disabled={disabled}>
        {#each list as item (item.filename)}
            <PopupItem
                enabled={!item.disabled}
                name={item.name}
                subframe={item.subframe}
                type={item.type}
                request={!!item.request}
                toggleItem={() => toggleItem(item)}
                detailItem={() => detailItem(item)}
            />
        {/each}
    </div>
{:else}
    <div class="none">No valid files found in directory</div>
{/if}

<style>
    .items {
        padding-bottom: 60px;
        text-align: left;
    }

    .even--all :global(.item:nth-of-type(odd)),
    .odd--all :global(.item:nth-of-type(even)) {
        background-color: var(--color-bg-secondary);
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
</style>
