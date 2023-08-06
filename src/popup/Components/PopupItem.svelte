<script>
    import IconButton from "../../shared/Components/IconButton.svelte";
    import Tag from "../../shared/Components/Tag.svelte";
    import iconInfo from "../../shared/img/icon-info.svg?raw";

    export let background;
    export let enabled = false;
    export let name;
    export let type;
    export let subframe;
    export let request = false;
    export let toggleItem;
    export let detailItem;
</script>

<div
    class="item {enabled ? "enabled" : "disabled"} {background ?? ""}"
    on:click
>
    <div class="base" on:click={toggleItem}>
        <Tag type={request ? "request" : type}/>
        <span></span>
        <div class="truncate">{name}</div>
        {#if subframe}<div class="subframe">SUB</div>{/if}
    </div>
    <div class="more" on:click={detailItem}>
        <IconButton
            icon={iconInfo}
            title="Show user script details"
        />
    </div>
</div>

<style>
    .item {
        align-items: center;
        cursor: pointer;
        display: flex;
        position: relative;
        -webkit-user-select: none;
        user-select: none;
    }

    .item.light {
        background-color: var(--color-bg-primary);
    }

    @media (hover: hover) {
        .item:hover {
            background-color: rgb(255 255 255 / 0.075);
        }

        .item:active {
            background-color: rgb(255 255 255 / 0.15);
        }
    }

    .item .base {
        align-items: center;
        cursor: pointer;
        display: flex;
        flex-grow: 1;
        overflow: hidden;
        padding: .5rem 0 .5rem .75rem;
        position: relative;
        -webkit-user-select: none;
        user-select: none;
    }

    .item .more {
        padding: .5rem;
        font-weight: bold;
    }

    .more :global(button svg) {
        opacity: 1;
        transform: scale(0.75);
    }

    @media (hover: hover) {
        .more :global(button svg:not(:hover)) {
            opacity: 0.25;
        }

        .more:hover :global(button svg) {
            opacity: 1;
        }
    }

    span {
        align-items: center;
        background-color: var(--color-red);
        border: 1px solid var(--color-black);
        border-radius: 50%;
        display: flex;
        display: none;
        flex-shrink: 0;
        height: 0.5rem;
        justify-content: center;
        margin: 0 0.5rem;
        width: 0.5rem;
    }

    .enabled span {
        background-color: var(--color-green);
    }

    .truncate {
        color: var(--text-color-disabled);
        flex-grow: 1;
        padding-right: 0.25rem;
    }

    .enabled span + .truncate {
        color: var(--text-color-primary);
    }

    .item :global(.script__tag) {
        border: none;
        margin-right: 0;
    }

    .disabled :global(.script__tag) {
        color: var(--text-color-primary);
        opacity: var(--opacity-disabled);
    }

    .subframe {
        color: var(--text-color-disabled);
        font-size: 0.563rem;
        font-style: italic;
        letter-spacing: 0.022rem;
        line-height: 0.75rem;
        padding: 0.063rem 0.25rem;
        text-align: center;
    }
</style>
