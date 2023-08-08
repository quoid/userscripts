<script>
    import {items, settings, state} from "../../store.js";
    import Dropdown from "../../../shared/Components/Dropdown.svelte";
    import IconButton from "../../../shared/Components/IconButton.svelte";
    import iconSort from "../../../shared/img/icon-sort.svg?raw";
    import iconClear from "../../../shared/img/icon-clear.svg?raw";

    $: disabled = !$state.includes("ready");

    $: sortOrder = $settings.sortOrder;

    let query = "";

    $: filter(query);

    function filter(q) {
        $items = $items.map(item => {
            const visible = item.filename.toLowerCase().includes(q.trim().toLowerCase());
            if (visible !== item.visible) return {...item, visible};
            return item;
        });
    }

    function updateSortOrder(order) {
        settings.updateSingleSetting("sortOrder", order);
    }
</script>

<div class="filter">
    <input
        type="text"
        placeholder="Search and filter here..."
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        autocorrect="off"
        bind:value={query}
        {disabled}
    >
    <Dropdown icon={iconSort} {disabled}>
        <button
            class:selected={sortOrder === "lastModifiedAsc"}
            on:click={() => updateSortOrder("lastModifiedAsc")}
        >
            Last Modified: Asc{sortOrder === "lastModifiedAsc" ? " *" : ""}
        </button>
        <br>
        <button
            class:selected={sortOrder === "lastModifiedDesc"}
            on:click={() => updateSortOrder("lastModifiedDesc")}
        >
            Last Modified: Desc{sortOrder === "lastModifiedDesc" ? " *" : ""}
        </button>
        <br>
        <button
            class:selected={sortOrder === "nameAsc"}
            on:click={() => updateSortOrder("nameAsc")}
        >
            Name: Asc{sortOrder === "nameAsc" ? " *" : ""}
        </button>
        <br>
        <button
            class:selected={sortOrder === "nameDesc"}
            on:click={() => updateSortOrder("nameDesc")}
        >
            Name: Desc{sortOrder === "nameDesc" ? " *" : ""}
        </button>
    </Dropdown>
    {#if query}
        <IconButton icon={iconClear} on:click={() => query = ""} {disabled}/>
    {/if}
</div>

<style>
    .filter {
        font: var(--text-default);
        position: relative;
        width: 100%;
    }

    input {
        background-color: var(--color-black);
        border: none;
        border-radius: var(--border-radius);
        color: inherit;
        display: block;
        font-size: 87.5%;
        opacity: 0.75;
        padding: 0.25rem 2.5rem;
        width: 100%;
    }

    input:focus {
        opacity: 1;
    }

    input:disabled {
        opacity: var(--opacity-disabled);
    }

    .filter > :global(button) {
        height: 1.25rem;
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1.25rem;
    }

    .filter :global(input + div) {
        left: 0.5rem;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    .filter :global(input:disabled + div > button) {
        opacity: calc(var(--opacity-disabled) * 0.5);
    }
</style>
