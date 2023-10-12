<script>
    import icon from "./img/icon.png";
    import logo from "./img/logo.svg?raw";
</script>

<main>
    <img class="icon" inline src={icon} alt="Userscripts App Icon">
    <div class="logo">
        {@html logo}
        <span><span id="version">v0.1</span>&nbsp;<span id="build">(0)</span></span>
    </div>
    <p>You can turn on the Userscripts iOS Safari extension in Settings.
        <a href="https://github.com/quoid/userscripts#userscripts-safari">Read the docs.</a>
    </p>
    <button id="set_directory">Change Userscripts Directory</button>
    <div class="current">CURRENT DIRECTORY:</div>
    <div id="directory">init</div>
</main>

<style>
    main {
        align-items: center;
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: center;
        padding: 0 1rem;
        text-align: center;
    }

    a {
        color: var(--color-blue);
    }

    .icon {
        height: 8.0rem;
        width: 8.0rem;
    }

    .logo {
        align-items: flex-end;
        display: flex;
        margin: 1rem 0;
    }

    .logo :global(svg) {
        height: 1.5rem;
    }

    .logo > span {
        margin-left: 0.5rem;
    }

    .logo span,
    .current {
        color: var(--text-color-disabled);
        font: var(--text-small);
        font-weight: bold;
        letter-spacing: var(--letter-spacing-small);
    }

    button {
        background-color: var(--color-blue);
        border: none;
        border-radius: var(--border-radius);
        color: var(--color-bg-secondary);
        font: var(--text-default);
        font-weight: 500;
        letter-spacing: var(--letter-spacing-default);
        margin: 2rem 0 1rem;
        padding: 0.5rem 1rem;
    }

    button:active {
        background-color: #6296c7;
    }

    #directory {
        color: var(--editor-default);
        font-family: var(--editor-font);
        font-size: 0.875rem;
        font-weight: 400;
        word-break: break-all;
    }
</style>
