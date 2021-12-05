<script>
    import iconWarn from "../../shared/img/icon-warn.svg";
    import iconError from "../../shared/img/icon-error.svg";
    export let userscript;
    export let installError;
    export let installCancelClick;
    export let installConfirmClick;
</script>
<div class="view--install">
    {#if installError}
        <div class="install__error">
            {@html iconError}
            <div>The usercript can not be installed.</div>
            <p>Error: OK GO</p>
        </div>
    {:else if userscript}
        <ul>
            <li class="userscript--name">{userscript.name}</li>
            {#if userscript.description}
                <li class="userscript--description">{userscript.description}</li>
            {/if}
            {#if userscript.match}
                <li class="userscript--field">
                    <div>@match</div>
                    {#each userscript.match as match}
                        <div class="truncate">{match}</div>
                    {/each}
                </li>
            {/if}
            {#if userscript.require}
                <li class="userscript--field">
                    <div>@require</div>
                    {#each userscript.require as require}
                        <div class="truncate">{require}</div>
                    {/each}
                </li>
            {/if}
            {#if userscript.grant}
                <li class="userscript--field">
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
    {/if}
</div>
<style>
    .view--install {
        color: var(--text-color-secondary);
        padding: 0 1rem;
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

    .install__error p {
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

    .userscript--name {
        color: var(--text-color-primary);
        font: var(--text-default);
        font-weight: bold;
        letter-spacing: var(--letter-spacing-default);
    }

    .userscript--description {
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
    }

    .userscript--field {
        font: var(--text-small);
        letter-spacing: var(--letter-spacing-small);
        margin-top: 1rem;
    }

    .userscript--field > div:nth-child(1) {
        color: var(--text-color-disabled);
    }

    .userscript--field > div:nth-child(n + 2) {
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
        padding-bottom: 1rem;
    }

    button {
        /* ffffffa6 is -text-color-secondary */
        background-color: #ffffffa6;
        border-radius: var(--border-radius);
        color: var(--color-bg-primary);
        flex-grow: 1;
        height: 2rem;
    }

    button:nth-child(1) {
        margin-right: 0.5rem;
    }

    button:nth-child(2) {
        background-color: var(--color-blue);
        margin-left: 0.5rem;
    }
</style>
