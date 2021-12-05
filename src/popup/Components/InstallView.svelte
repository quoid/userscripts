<script>
    import iconWarn from "../../shared/img/icon-warn.svg";
    import iconError from "../../shared/img/icon-error.svg";
    export let userscript;
    export let installError;
    export let installCancelClick;
    export let installConfirmClick;
</script>
<div class="view--install">
    {#if userscript}
        <ul>
            <li>{userscript.name}</li>
            <li>{userscript.description}</li>
            {#if userscript.match}
                <li>
                    <div>@match</div>
                    {#each userscript.match as match}
                        <div class="truncate">{match}</div>
                    {/each}
                </li>
            {/if}
            {#if userscript.require}
                <li>
                    <div>@require</div>
                    {#each userscript.require as require}
                        <div class="truncate">{require}</div>
                    {/each}
                </li>
            {/if}
            {#if userscript.grant}
                <li>
                    <div>@grant</div>
                    {#each userscript.grant as grant}
                        <div>{grant}</div>
                    {/each}
                </li>
            {/if}
        </ul>
        <div class="badge">
            <div class="badge--icon">{@html iconWarn}</div>
            <div class="badge--text">Be sure you trust the author before installing. Nefarious code can exploit your security and privacy.</div>
        </div>
        <div class="buttons">
            <button class="cancel" on:click={installCancelClick}>Cancel</button>
            <button class="install" on:click={installConfirmClick}>Install</button>
        </div>
    {:else if installError}
        <div class="install__error">
            {@html iconError}
            <div>The usercript can not be installed.</div>
            <p>Error: {installError}</p>
        </div>
    {/if}
</div>
<style>
    .view--install {
        color: var(--text-color-secondary);
        padding: 0 1rem;
    }

    ul {
        padding: 1rem 0;
        text-align: left;
    }

    ul > li:nth-child(1) {
        color: var(--text-color-primary);
        font: var(--text-default);
        font-weight: bold;
        letter-spacing: var(--letter-spacing-default);
    }

    ul > li:nth-child(2) {
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
    }

    ul > li:nth-child(n + 3) {
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
        margin-top: 1rem;
    }

    ul > li:nth-child(n + 3) > div:nth-child(1) {
        color: var(--text-color-disabled);
    }

    ul > li:nth-child(n + 3) > div:nth-child(n + 2) {
        color: var(--text-color-secondary);
        font-family: var(--editor-font);
    }

    .install__error {
        color: var(--text-color-disabled);
        font-weight: 600;
    }

    .install__error :global(svg) {
        fill: var(--text-color-disabled);
        height: 4rem;
        margin: 2rem auto 0.5rem;
        width: 4rem;
    }

    p {
        color: var(--text-color-primary);
        font: var(--text-small);
        font-family: var(--editor-font);
        letter-spacing: var(--letter-spacing-small);
        margin-top: 1rem;
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
        padding-bottom: 1rem;
    }

    button {
        border-radius: var(--border-radius);
        color: var(--color-bg-primary);
        flex-grow: 1;
        height: 2rem;
    }

    button:nth-child(1) {
        background-color: var(--text-color-secondary);
        margin-right: 0.5rem;
    }

    button:nth-child(2) {
        background-color: var(--color-blue);
        margin-left: 0.5rem;
    }
</style>
