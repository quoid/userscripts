<script>
    import Tag from "../../../shared/Components/Tag.svelte";
    import Toggle from "../../../shared/Components/Toggle.svelte";

    // the data that will populate the item contents in sidebar
    export let data = {};
    export let toggleClick;
    let showTitle = false;

    // if description > 120 characters, truncate and add ellipsis
    // also trim for instances where an empty space is the last character
    // this prevents ellipsis from being added next to empty space
    // when description truncated, add title attr with full description text
    function formatDescription(str) {
        if (str && str.length > 120) {
            showTitle = true;
            return str.substring(0, 120).trim() + "...";
        } else {
            showTitle = false;
            return str;
        }
    }

    $: description = formatDescription(data.description);
</script>
<style>
    .item {
        background-color: var(--color-bg-secondary);
        border-bottom: 1px solid var(--color-black);
        cursor: pointer;
        padding: 1rem 1rem calc(1rem - 1px);
    }

    /* .item.temp {
        position: -webkit-sticky;
        top: 0;
        z-index: 2;
    } */

    .item:hover {
        background-color: var(--color-bg-primary);
    }

    .item.active {
        background-color: var(--color-script-highlighted);
        background-color: #364049;
        cursor: default;
    }

    .item__header {
        align-items: center;
        display: flex;
    }

    .item__title {
        flex: 1 0 0;
        font-weight: 500;
        letter-spacing: var(--letter-spacing-default);
        padding-right: 0.25rem;
    }

    .item__description {
        color: var(--text-color-secondary);
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
    }

    :global(.sidebar--compact) .item__description {
        display: none;
    }

    .disabled .item__title,
    .disabled :global(.item__tag),
    .disabled .item__description {
        opacity: 0.65;
    }
</style>

<div
    class="item {data.class || ""}"
    class:active={data.active}
    class:disabled={data.disabled}
    class:temp={data.temp}
    data-filename={data.filename}
    data-last-modified={data.lastModified}
    data-type={data.type}
    on:click
>
    <div class="item__header">
        <Tag type={data.type}/>
        <div class="item__title truncate">{data.name}</div>
        <Toggle checked={!data.disabled} on:click={toggleClick}/>
    </div>
    {#if description}
        <div class="item__description" title="{showTitle ? data.description : null}">
            {description}
        </div>
    {/if}
</div>
