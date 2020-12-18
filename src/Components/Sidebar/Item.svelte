<script>
    import Tag from "../Shared/Tag.svelte";
    import Toggle from "../Shared/Toggle.svelte";

    // the data that will populate the item contents in sidebar
    export let data = {};

    // used to target and disable checkbox on toggle
    let el;

    function toggle(e, data) {
        // prevent default b/c checked will change depending on message response
        e.preventDefault();
        // disable toggle on temp files
        if (data.temp) return;
        // disable the checkbox to prevent multiple toggle messages from being sent
        el.querySelector("input").disabled = true;
        // send filename and target file state (disabled or enabled)
        const obj = {filename: data.filename, state: data.disabled ? "enable" : "disable"};
        safari.extension.dispatchMessage("REQ_TOGGLE_FILE", obj);
    }
</script>

<style>
    .item {
        background-color: var(--color-bg-secondary);
        border-bottom: 1px solid var(--color-black);
        cursor: pointer;
        padding: 1.5rem 1.5rem calc(1.5rem - 1px);
    }

    .item:hover {
        background-color: var(--color-bg-primary);
    }

    .item.active {
        background-color: var(--color-script-highlighted);
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
    }

    .item__description {
        color: var(--text-color-secondary);
        font: var(--text-medium);
        font-weight: 300;
        letter-spacing: var(--letter-spacing-medium);
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
    data-filename={data.filename}
    data-last-modified={data.lastModified}
    data-type={data.type}
    bind:this={el}
    on:click
>
    <div class="item__header">
        <Tag type={data.type}/>
        <div class="item__title">{data.name}</div>
        <Toggle
            checked={!data.disabled}
            on:click={e => toggle(e, data)}
        />
    </div>
    <div class="item__description">{data.description}</div>
</div>
