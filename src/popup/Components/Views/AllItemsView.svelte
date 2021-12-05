<script>
    import PopupItem from "../PopupItem.svelte";
    export let allItems = [];
    export let allItemsToggleItem;

    let disabled;
    let rowColorsAll;

    $: list = allItems.sort((a, b) => a.name.localeCompare(b.name));

    $: if (list.length > 1 && list.length % 2 === 0) {
        rowColorsAll = "even--all";
    } else if (list.length > 1 && list.length % 2 != 0) {
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
                on:click={() => allItemsToggleItem(item)}
            />
        {/each}
    </div>
{:else}
    <div class="none">No valid files found in directory</div>
{/if}
<style>
    .items {
        text-align: left;
    }

    .even--all :global(.item:nth-of-type(odd)),
    .odd--all :global(.item:nth-of-type(even)) {
        background-color: var(--color-bg-secondary);
    }
</style>
