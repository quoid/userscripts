<script>
    import iconWarn from "../../../shared/img/icon-warn.svg?raw";
    import iconError from "../../../shared/img/icon-error.svg?raw";
    import {parse} from "../../../shared/utils";
    
    export let itemdata;
    export let cancelClick;
    export let installConfirmClick;
    export let updateConfirmClick;
    export let deleteConfirmClick;

    const showItems = [
        "version",
        "match",
        "include",
        "require",
        "grant"
    ];
    let errormsg = itemdata.error;
    let metadata = itemdata.metadata;

    function metadataInit() {
        if (metadata) return;
        const parsed = parse(itemdata.content);
        if (!parsed) {
            errormsg = "Userscript parsing failed";
            return;
        }
        if (!parsed.metadata) {
            errormsg = "Userscript metadata missing";
            return;
        }
        metadata = parsed.metadata;
    }
    
    if (!errormsg) {
        if (!metadata) {
            metadataInit();
        }
    }
</script>

<div class="view--install">
    {#if errormsg}
        <div class="show--error">
            {@html iconError}
            <div>Userscript Invaild</div>
            <p>{errormsg}</p>
        </div>
    {:else if metadata}
        <ul>
            <li class="item--name">{metadata.name}</li>
            {#if itemdata.filename}
                <li class="item--filename">{itemdata.filename}</li>
            {/if}
            {#if metadata.description}
                <li class="item--description">{metadata.description}</li>
            {/if}
            {#each showItems as key}
                {#if metadata[key]}
                    <li class="item--field">
                        <div>@{key}</div>
                        {#each metadata[key] as val}
                            <div class="truncate">{val}</div>
                        {/each}
                    </li>
                {/if}
            {/each}
        </ul>
        {#if itemdata.url}
        <div class="badge">
            <div class="badge--icon">{@html iconWarn}</div>
            <div class="badge--text">Be sure you trust the author before installing. Nefarious code can exploit your security and privacy.</div>
        </div>
        {/if}
        <div class="buttons">
            <button class="cancel" on:click={cancelClick}>
                Cancel
            </button>
            {#if itemdata.url}
                <button class="install" on:click={installConfirmClick}>
                    {itemdata.installed ? "Reinstall" : "Install"}
                </button>
            {/if}
            {#if itemdata.filename}
                <button class="delete" on:click={deleteConfirmClick}>
                    Delete
                </button>
            {/if}
            {#if itemdata.update}
                <button class="update" on:click={updateConfirmClick}>
                    Update
                </button>
            {/if}
        </div>
    {/if}
</div>

<style>
    .view--install {
        color: var(--text-color-secondary);
        padding: 0 1rem;
    }

    :global(body.ios) .view--install,
    :global(body.ipados) .view--install {
        padding-bottom: calc(39px + 1rem);
    }

    .show--error {
        color: var(--text-color-disabled);
        font-weight: 600;
    }

    .show--error :global(svg) {
        fill: var(--text-color-disabled);
        height: 4rem;
        margin: 2rem auto 0.5rem;
        width: 4rem;
    }

    .show--error p {
        color: var(--text-color-primary);
        font: var(--text-small);
        font-family: var(--editor-font);
        letter-spacing: var(--letter-spacing-small);
        margin-top: 1rem;
    }

    ul {
        padding: 1rem 0;
        text-align: left;
    }

    .item--filename {
        font: var(--text-small);
        color: var(--text-color-disabled);
    }

    .item--name {
        color: var(--text-color-primary);
        font: var(--text-default);
        font-weight: bold;
        letter-spacing: var(--letter-spacing-default);
    }

    .item--description {
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
    }

    .item--field {
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
        margin-top: 1rem;
    }

    .item--field > div:nth-child(1) {
        color: var(--text-color-disabled);
    }

    .item--field > div:nth-child(n + 2) {
        color: var(--text-color-secondary);
        font-family: var(--editor-font);
    }

    .badge {
        background-color: var(--color-black);
        border-radius: var(--border-radius);
        display: flex;
        font: var(--text-small);
        margin: 1rem 0;
        padding: 0.5rem;
    }

    .badge--icon {
        align-self: center;
        flex-shrink: 0;
        width: 32px;
    }

    .badge--icon :global(svg) {
        fill: var(--color-blue);
    }

    .badge--text {
        padding: 0 0.5rem;
        text-align: left;
    }

    .buttons {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 1rem;
    }

    button {
        background-color: #ffffffa6; /* -text-color-secondary */
        border-radius: var(--border-radius);
        color: var(--color-bg-primary);
        font-weight: 600;
        flex-grow: 1;
        height: 2rem;
    }

    button.install {
        background-color: var(--color-blue);
    }

    button.update {
        background-color: var(--color-yellow);
    }

    button.delete {
        background-color: var(--color-red);
    }
</style>